import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// UI-only fixture: intercept both Auth and application requests; no backend writes.
const base=process.env.TEST_BASE_URL??'http://localhost:3000';
const env=await readFile('.env.local','utf8').catch(()=>'');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL??env.match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^\s"']+)/m)?.[1];
if(!url)throw new Error('Use a preview configured with a public Supabase URL for mocked auth.');
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE??'/usr/bin/chromium',headless:true});
const user={id:'00000000-0000-4000-8000-000000000002',aud:'authenticated',role:'authenticated',email:'focus@example.test',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};
const exp=Math.floor(Date.now()/1000)+3600;
const jwt=[{alg:'HS256',typ:'JWT'},{sub:user.id,aud:user.aud,role:user.role,exp}].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.')+'.mock';
const questions=Array.from({length:10},(_,i)=>({id:`focus-question-${i}`,title:`Focus question ${i+1}`,contest_name:'Test exam',question_number:i+1,category:'Algebra',topic_tags:[],difficulty:'Easy',difficulty_rating:800,question_latex:'1+1=?',options:[{label:'A',text:'2'},{label:'B',text:'3'}],figure_required:false,figure_image_path:null,verification_status:'verified'}));
try{
 for(const width of [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:`sb-${new URL(url).hostname.split('.')[0]}-auth-token`,session:{access_token:jwt,refresh_token:'mock-refresh',expires_at:exp,expires_in:3600,token_type:'bearer',user}});
  await context.route(new URL(url).origin+'/**',route=>route.fulfill({json:route.request().url().includes('/auth/')?user:[]}));
  let challenge=null,failSave=true;
  const snapshot=()=>{
   if(challenge?.status==='active'&&Date.parse(challenge.expires_at)<=Date.now())complete(true);
   return {challenge_date:'2026-10-30',resets_at:new Date(Date.now()+86400000).toISOString(),server_now:new Date().toISOString(),challenge};
  };
  const complete=timedOut=>{
   const correct=Object.values(challenge.answers).filter(a=>a==='A').length;
   challenge={...challenge,status:'completed',completed_at:new Date().toISOString(),timed_out:timedOut,correct_count:correct,old_rating:800,new_rating:correct===10?840:794,rating_delta:correct===10?40:-6,breakdown:questions.map(p=>({problem_id:p.id,selected_answer:challenge.answers[p.id]??null,is_correct:challenge.answers[p.id]==='A',explanation:{correct_answer:'A',written_solution:'One plus one is two.'}}))};
  };
  await context.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname.slice(5);
   if(path==='me')return route.fulfill({json:{...user,username:'focus',full_name:'Focus Learner',rating:800,contests_attended:0,is_public:true,avatar_url:null,school:null}});
   if(path==='activity')return route.fulfill({json:{practice:[],contests:[],ratings:[],bookmarks:[]}});
   if(path==='problem-directory')return route.fulfill({json:questions});
   if(path.startsWith('daily')){
    if(path==='daily/start'&&!challenge)challenge={id:'00000000-0000-4000-8000-000000000999',challenge_date:'2026-10-30',started_at:new Date().toISOString(),expires_at:new Date(Date.now()+2400000).toISOString(),status:'active',rating_at_start:800,answers:{},questions,completed_at:null,correct_count:null,old_rating:null,new_rating:null,rating_delta:null};
    if(route.request().method()==='PATCH'){
     if(failSave){failSave=false;return route.fulfill({status:503,json:{error:{message:'Connection interrupted'}}});}
     const body=route.request().postDataJSON();challenge.answers[body.problem_id]=body.answer;
    }
    if(path.endsWith('/finish'))complete(false);
    return route.fulfill({json:snapshot()});
   }
   return route.fulfill({json:[]});
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/daily',{waitUntil:'networkidle'});
  assert(await page.getByRole('link',{name:'Home',exact:true}).isVisible());
  await page.getByRole('button',{name:'Start daily challenge',exact:true}).click();await page.getByRole('timer').waitFor();
  const deadline=challenge.expires_at;
  assert.equal(await page.getByRole('link',{name:'Home',exact:true}).count(),0);
  assert.equal(await page.locator('footer').isVisible(),false);
  assert.equal((await page.locator('.site-content').boundingBox()).x,0);
  await page.keyboard.press('a');await page.getByRole('button',{name:'Retry save'}).waitFor();
  assert(await page.getByRole('button',{name:'Next',exact:true}).isDisabled());
  assert.equal(await page.getByRole('progressbar',{name:'Saved answers',includeHidden:true}).getAttribute('aria-valuenow'),'0');
  await page.getByRole('button',{name:'Retry save'}).click();await page.getByText('All changes saved',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Exit focus mode',exact:true}).click();await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'});
  await page.getByRole('button',{name:'Exit focus mode',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Exit focus mode',exact:true}).click();
  await page.getByRole('button',{name:'Enter focus mode',exact:true}).waitFor();assert(await page.getByRole('link',{name:'Home',exact:true}).isVisible());
  assert.equal(challenge.expires_at,deadline);assert.equal(challenge.answers[questions[0].id],'A');
  await page.getByRole('button',{name:'Enter focus mode',exact:true}).click();
  await page.reload({waitUntil:'networkidle'});await page.getByRole('timer').waitFor();assert.equal(challenge.expires_at,deadline);
  assert.equal(await page.getByRole('link',{name:'Home',exact:true}).count(),0);
  assert.equal(await page.getByRole('progressbar',{name:'Saved answers',includeHidden:true}).getAttribute('aria-valuenow'),'1');
  await page.keyboard.press('ArrowRight');await page.getByRole('heading',{name:'Question 2 of 10',exact:true}).waitFor();
  await page.keyboard.press('ArrowLeft');await page.getByRole('heading',{name:'Question 1 of 10',exact:true}).waitFor();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow at ${width}px`);
  if(width===1440){
   for(let i=1;i<10;i++){await page.getByRole('button',{name:`Go to question ${i+1}`,exact:true}).click();await page.keyboard.press('a');await page.getByText('All changes saved',{exact:true}).waitFor();}
   await page.getByRole('button',{name:'Go to question 1, answered',exact:true}).click();
   await page.getByRole('button',{name:'Submit challenge',exact:true}).click();await page.getByRole('button',{name:'Confirm submission',exact:true}).click();
   await page.getByRole('heading',{name:'10 out of 10 correct'}).waitFor();
  }else{
   challenge.expires_at=new Date(Date.now()+6000).toISOString();await page.reload({waitUntil:'networkidle'});
   await page.getByText('Final 5 minutes.',{exact:false}).waitFor();
   await page.getByRole('heading',{name:'1 out of 10 correct'}).waitFor({timeout:15000});
  }
  assert(await page.getByRole('link',{name:'Home',exact:true}).isVisible());assert(await page.locator('footer').isVisible());
  assert.equal(await page.getByRole('timer').count(),0);assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: focus entry, saved progress, failed save, exit/cancel/resume, reload, keyboard, ${width===1440?'early submit':'timeout'}, restored navigation`);
  await context.close();
 }
}finally{await browser.close();}
