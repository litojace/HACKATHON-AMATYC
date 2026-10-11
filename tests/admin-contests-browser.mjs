import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const base=process.env.TEST_BASE_URL??'http://127.0.0.1:3000';
const env=await readFile('.env.local','utf8').catch(()=>'');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL??env.match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^\s"']+)/m)?.[1];
if(!url)throw new Error('This mocked authenticated UI test requires the app to be configured for Supabase. No real sign-in or database writes are performed.');
const user={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'admin@example.test',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};
const jwt=[{alg:'HS256',typ:'JWT'},{sub:user.id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600}].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.')+'.mock';
const problems=Array.from({length:20},(_,i)=>({id:'test-problem-'+i,title:'Problem '+(i+1),contest_name:'Test',question_number:i+1,category:'Algebra',topic_tags:[],difficulty:'Easy',difficulty_rating:800,question_latex:'Compute $1+1$.',options:[{label:'A',text:'2'},{label:'B',text:'3'}],figure_required:false,figure_image_path:null,source_image_path:null,answer_format:'multiple_choice',verification_status:'fully_verified',publication_status:'draft'}));
const contest={id:'test-contest',name:'Mocked admin contest',description:'',year:2026,semester:'Custom',kind:'rated',duration_seconds:900,question_count:5,correct_points:2,incorrect_points:-0.5,blank_points:0,starts_at:new Date(Date.now()-60000).toISOString(),ends_at:new Date(Date.now()+3600000).toISOString(),review_at:new Date(Date.now()+4500000).toISOString(),published:true,rating_enabled:true,ratings_processed_at:null};
let attempt={id:'mock-attempt',contest_id:contest.id,started_at:new Date().toISOString(),deadline:new Date(Date.now()+900000).toISOString(),finalized_at:null,status:'active',answers:{},flags:[],score:null,questions:problems.slice(0,5),server_now:new Date().toISOString(),breakdown:null};
let created=null,patches=0,finishes=0,failSave=false,isAdmin=true,heartbeats=0,adminChecks=0,accountLoads=0;
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,headless:true});
try{
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 await context.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:'sb-'+new URL(url).hostname.split('.')[0]+'-auth-token',session:{access_token:jwt,refresh_token:'mock-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}});
 await context.route(new URL(url).origin+'/**',route=>{
  const path=route.request().url();
  if(path.includes('record_presence')){heartbeats++;return route.fulfill({json:null});}
  if(path.includes('admin_online_users'))return route.fulfill({json:[{id:'online-learner',username:'learner',full_name:'Online Learner'}]});
  if(path.includes('is_site_admin'))adminChecks++;
  return route.fulfill({json:path.includes('is_site_admin')?isAdmin:user});
 });
 await context.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname.slice(5),method=route.request().method();
  if(path==='problems')return route.fulfill({json:problems});
  if(path==='leaderboard')return route.fulfill({json:[{id:'online-learner',username:'learner',full_name:'Online Learner',rating:800,school:null,contests_attended:0,last_delta:0}]});
  if(path==='me'){accountLoads++;return route.fulfill({json:{...user,username:'admin',full_name:'Test Admin',rating:800,contests_attended:0,is_public:true}});}
  if(path==='carousel')return route.fulfill({json:[{src:'/images/community/team.png',label:'Team',alt:'Team',fit:'cover',duration_seconds:3},{src:'/images/community/pizza.png',label:'Pizza',alt:'Pizza',fit:'cover',duration_seconds:3}]});
  if(path==='activity')return route.fulfill({json:{practice:[],contests:[],ratings:[],bookmarks:[]}});
  if(path==='admin/problems'&&method==='POST'){const record=route.request().postDataJSON();problems.push(record);return route.fulfill({json:record,status:201});}
  if(path==='admin/problems')return route.fulfill({json:problems});
  if(path==='admin/contests'&&method==='POST'){created=route.request().postDataJSON();return route.fulfill({json:contest,status:201});}
  if(path==='admin/contests')return route.fulfill({json:[contest]});
  if(path==='admin/contests/test-contest')return route.fulfill({json:{contest,server_now:new Date().toISOString(),participants:[{id:'monitor-attempt',username:'learner',full_name:'Test Learner',status:'active',answered:3,flagged:1,elapsed_seconds:125,score:null,old_rating:null,new_rating:null,started_at:new Date().toISOString(),deadline:attempt.deadline}]}});
  if(path==='attempts/mock-attempt'&&method==='PATCH'){
   patches++;if(failSave){failSave=false;return route.fulfill({status:503,json:{error:{message:'Mock network failure'}}});}
   const data=route.request().postDataJSON();attempt={...attempt,answers:{...attempt.answers,[data.problem_id]:data.answer},server_now:new Date().toISOString()};
   await new Promise(resolve=>setTimeout(resolve,100));return route.fulfill({json:attempt});
  }
  if(path==='attempts/mock-attempt/finish'){finishes++;attempt={...attempt,status:'finalized',score:2,finalized_at:new Date().toISOString()};return route.fulfill({json:attempt});}
  if(path.startsWith('attempts/'))return route.fulfill({json:attempt});
  return route.fulfill({json:[]});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.getByRole('link',{name:'Edit carousel',exact:true}).waitFor();
 await page.getByRole('button',{name:'Pause slideshow',exact:true}).click();
 const retainedSlide=await page.locator('aside[aria-label="MAT Community"] img[alt="Team"]').elementHandle();
 const checkCount=adminChecks,accountCount=accountLoads;
 const disappeared=await page.evaluate(async({channelName,session})=>{
  let removals=0;const link=document.querySelector('a[aria-label="Edit carousel"]');
  const observer=new MutationObserver(()=>{if(!link?.isConnected)removals++;});observer.observe(document.body,{childList:true,subtree:true});
  const channel=new BroadcastChannel(channelName);
  for(let i=0;i<8;i++){channel.postMessage({event:'SIGNED_IN',session:{...session,user:{...session.user,user_metadata:{iteration:i}}}});await new Promise(resolve=>setTimeout(resolve,150));}
  channel.close();observer.disconnect();return removals;
 },{channelName:'sb-'+new URL(url).hostname.split('.')[0]+'-auth-token',session:{access_token:jwt,refresh_token:'mock-refresh',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user}});
 assert.equal(disappeared,0);assert.equal(adminChecks,checkCount);assert.equal(accountLoads,accountCount);assert.ok(await retainedSlide.evaluate(el=>el.isConnected));
 await page.goto(base+'/admin/contests/new');await page.getByRole('heading',{name:'Create contest',exact:true}).waitFor();
 await page.getByLabel('Contest name',{exact:true}).fill('New competition');
 await page.getByLabel('Contest length').selectOption('10');await page.getByText('10 questions · 30 minutes',{exact:true}).count();
 await page.getByLabel('Contest length').selectOption('20');await page.getByLabel('Contest length').selectOption('5');
 for(let i=0;i<4;i++)await page.getByRole('checkbox').nth(i).check();
 await page.getByRole('button',{name:'Create a new problem',exact:true}).click();
 await page.getByLabel('Title',{exact:true}).fill('Brand new question');await page.getByLabel('Question text / math').fill('Compute $2+2$.');
 for(const [i,label] of [...'ABCDE'].entries())await page.getByLabel('Option '+label,{exact:true}).fill(String(i+4));
 await page.getByLabel('Written solution',{exact:true}).fill('$2+2=4$.');await page.getByLabel('Review status').selectOption('fully_verified');
 await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByText('Question order · 5/5',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Publish contest',exact:true}).click();await page.waitForURL('**/admin/contests/test-contest');
 assert.equal(created.problem_ids.length,5);assert.equal(created.question_count,5);assert.equal(created.published,true);
 await page.getByText('Test Learner',{exact:true}).waitFor();await page.getByRole('cell',{name:'3/5',exact:true}).waitFor();await page.getByRole('cell',{name:'2:05',exact:true}).waitFor();
 await page.goto(base+'/contests/test-contest/take?attempt=mock-attempt');await page.getByLabel('Contest questions').waitFor();
 assert.equal(await page.getByRole('button',{name:'Submit Answer',exact:true}).count(),0);assert.equal(await page.getByText('Correct answer:',{exact:false}).count(),0);
 await page.locator('button[aria-pressed]').filter({hasText:'A'}).click();await page.getByText('All changes saved · Server-timed exam',{exact:true}).waitFor();assert.equal(attempt.answers[problems[0].id],'A');
 assert.equal(finishes,0);assert.equal(await page.getByRole('button',{name:'Submit contest',exact:true}).count(),0);
 failSave=true;await page.locator('button[aria-pressed]').filter({hasText:'B'}).click();await page.getByRole('button',{name:'Retry saving answers'}).waitFor();await page.getByRole('button',{name:'Retry saving answers'}).click();await page.getByText('All changes saved · Server-timed exam',{exact:true}).waitFor();
 assert.equal(attempt.answers[problems[0].id],'B');
 await page.getByRole('button',{name:'Question 5',exact:true}).click();await page.getByRole('button',{name:'Submit contest',exact:true}).click();
 await page.getByRole('button',{name:'Close',exact:true}).click();assert.equal(finishes,0);
 await page.getByRole('button',{name:'Submit contest',exact:true}).click();await page.getByRole('button',{name:'Confirm submission',exact:true}).click();await page.waitForURL('**/results?attempt=mock-attempt');assert.equal(finishes,1);assert.ok(patches>=3);
 attempt={...attempt,status:'active',score:null,finalized_at:null,answers:{},questions:problems.slice(0,20).map((p,i)=>i===0?{...p,answer_format:'short_answer',options:[]}:p)};
 await page.goto(base+'/contests/test-contest/take?attempt=mock-attempt');await page.getByLabel('Your answer',{exact:true}).fill('123.45');
 await page.getByText('All changes saved · Server-timed exam',{exact:true}).waitFor();assert.equal(attempt.answers[problems[0].id],'123.45');
 const navigator=page.getByLabel('Contest questions');assert.ok(await navigator.evaluate(el=>el.scrollHeight>el.clientHeight));
 assert.ok(await navigator.evaluate(el=>[...el.children].every((child,i,list)=>i===0||child.offsetTop>list[i-1].offsetTop)));
 await page.getByRole('button',{name:'Question 20',exact:true}).click();await page.getByRole('button',{name:'Submit contest',exact:true}).waitFor();
 await page.getByRole('button',{name:'Previous',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Submit contest',exact:true}).count(),0);
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 await page.setViewportSize({width:390,height:844});await page.goto(base+'/admin/contests/new');await page.getByRole('heading',{name:'Create contest',exact:true}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 await page.goto(base+'/leaderboard');await page.getByLabel('Online Learner is online',{exact:true}).waitFor();assert.equal(await page.getByLabel('Online users',{exact:true}).count(),0);assert.ok(heartbeats>0);
 isAdmin=false;await page.reload();await page.getByRole('link',{name:'Online Learner',exact:true}).waitFor();await page.waitForTimeout(500);assert.equal(await page.getByLabel('Online Learner is online',{exact:true}).count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: mocked admin creation, inline editor, presets, live monitor, answer saving/retry, navigation and final submission; no live database writes.');
}finally{await browser.close();}
