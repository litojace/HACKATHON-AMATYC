import {chromium} from 'playwright';
const base=process.env.TEST_BASE_URL??'http://localhost:3012';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL??'https://example.supabase.co';
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE??'/usr/bin/chromium',args:['--no-sandbox']});
try {
 const page=await browser.newPage({viewport:{width:490,height:1000}});
 const user={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',email:'admin@example.test',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
 const token='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url')+'.fixture';
 await page.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:`sb-${new URL(url).hostname.split('.')[0]}-auth-token`,session:{access_token:token,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user}});
 await page.route('**/auth/v1/user',r=>r.fulfill({json:user}));
 await page.route('**/rest/v1/rpc/**',r=>r.fulfill({json:true}));
 let fail=false;
 await page.route('**/rest/v1/rpc/announcement_history',r=>{
  if(fail)return r.fulfill({status:503,json:{message:'Unavailable'}});
  const pageNumber=r.request().postDataJSON().p_page;
  return r.fulfill({json:{items:pageNumber===0?[{id:'new',message:'New update\nSecond line',created_at:'2026-10-11T16:00:00Z'}]:[{id:'old',message:'Previously dismissed update',created_at:'2026-10-10T16:00:00Z'}],has_more:pageNumber===0}});
 });
 await page.route('**/api/**',r=>{
  const path=new URL(r.request().url()).pathname;
  const data=path==='/api/me'?{...user,full_name:'Admin',username:'admin',rating:800,is_public:true,contests_attended:0}:path==='/api/activity'?{practice:[],contests:[],ratings:[],bookmarks:[]}:[];
  return r.fulfill({json:data});
 });
 await page.goto(base+'/dashboard',{waitUntil:'domcontentloaded'});
 const archive=page.locator('#announcements');
 await archive.getByText('New update\nSecond line',{exact:true}).waitFor();
 await page.getByRole('link',{name:'Read past announcements',exact:true}).click();
 await page.waitForURL('**/dashboard#announcements');
 await archive.getByRole('button',{name:'Older',exact:true}).click();
 await archive.getByText('Previously dismissed update',{exact:true}).waitFor();
 await archive.getByRole('button',{name:'Newer',exact:true}).click();
 await archive.getByText('New update\nSecond line',{exact:true}).waitFor();
 fail=true;await archive.getByRole('button',{name:'Refresh',exact:true}).click();
 await archive.getByRole('alert').waitFor();
 fail=false;await archive.getByRole('button',{name:'Refresh',exact:true}).click();
 await archive.getByText('New update\nSecond line',{exact:true}).waitFor();
 console.log('PASS: dashboard archive, navigation link, older/newer messages, error and refresh recovery');
} finally { await browser.close(); }
