import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base=process.env.TEST_BASE_URL ?? 'http://localhost:3040';
const output=process.env.TEST_SCREENSHOT_DIR ?? '/tmp/arena-redesign';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE ?? '/usr/bin/chromium',headless:true});
try {
 for (const width of [320,360,390,768,1024,1440]) {
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'networkidle'});
  await page.getByText('Loading community photos.',{exact:false}).waitFor({state:'hidden',timeout:20000});
  await page.getByRole('heading',{name:/exam library/i}).waitFor();
  await page.waitForFunction(()=>document.querySelector('.library-stat strong')?.textContent !== '—');
  assert(await page.getByRole('link',{name:'Let’s Solve!'}).isVisible());
  assert.equal(await page.locator('.rank-medals .rank-medal').count(),3);
  assert.equal(await page.locator('.medal-gold svg>g').count(),1,'Gold medal needs its laurel wreath');
  const check=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Page overflow at ${width}: ${page.url()}`);
  await check();
  const sidebar=page.getByRole('complementary',{name:'Main navigation'});
  assert.equal(await sidebar.isVisible(),width>=1024);
  if(width>=1024){
   const brand=await sidebar.locator(':scope > a').boundingBox();
   const toolbar=await page.locator('header').boundingBox();
   assert(Math.abs(brand.y+brand.height-toolbar.y-toolbar.height)<1,'Sidebar and toolbar borders should align');
  }
  if(width<1024){
   const description=await page.locator('.hero-description').boundingBox();
   const artwork=await page.locator('.hero-illustration').boundingBox();
   const actions=await page.locator('.hero-actions').boundingBox();
   assert(artwork.x>=description.x+description.width-1,'Hero artwork overlaps text');
   assert(actions.y>=artwork.y+artwork.height-1,'Hero artwork overlaps buttons');
   const heading=await page.locator('.hero-heading').boundingBox();
   assert(artwork.x>=heading.x+heading.width-1,'Heading and artwork must have separate columns');
  }
  if(width<600){
   const cards=page.locator('.home-feature');
   const first=await cards.nth(0).boundingBox(), second=await cards.nth(1).boundingBox();
   assert(second.x>=first.x+first.width && Math.abs(first.y-second.y)<1,'Phone cards should follow desktop columns');
  }
  if(width>=1024)assert(!(await page.locator('.library-stat').last().innerText()).includes('years'),'Unwanted year caption');
  const guide=page.locator('.ratings-panel');
  const toggle=guide.getByRole('button',{name:'Ratings & titles',exact:true});
  assert.equal(await page.getByRole('table',{includeHidden:true}).count(),1,'Keep one rank table inside its panel');
  assert(!(await guide.getByRole('table').isVisible()),'Ranks should start collapsed on every screen');
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  assert(await toggle.getAttribute('aria-controls'));
  await toggle.click();assert(await guide.getByRole('table').isVisible());
  assert.equal(await guide.locator('tbody tr').count(),10);
  assert.equal(await toggle.getAttribute('aria-expanded'),'true');await check();
  if(width===390||width===1440)await guide.screenshot({path:`${output}/ratings-expanded-${width===390?'mobile':'desktop'}.png`});
  await toggle.focus();await page.keyboard.press('Space');assert(!(await guide.getByRole('table').isVisible()));
  await page.keyboard.press('Enter');assert(await guide.getByRole('table').isVisible());
  await toggle.click();assert(!(await guide.getByRole('table').isVisible()));
  if(width<1024){
   assert(!(await page.getByLabel('Choose a photo',{exact:true}).isVisible()),'Mobile thumbnails should be hidden');
   assert(!(await page.locator('.home-how-it-works').isVisible()));
   const details=page.locator('.compact-contest-news').getByRole('button',{name:'Details',exact:true});
   await details.click();assert.equal(await details.getAttribute('aria-expanded'),'true');
   assert(await page.locator('.compact-contest-news').getByText('Cash prizes',{exact:true}).isVisible());
   await check();await details.click();
   const pause=page.getByRole('button',{name:'Pause slideshow',exact:true});
   if(await pause.isVisible()){
    await pause.click();assert(await page.getByRole('button',{name:'Play slideshow',exact:true}).isVisible());
   }
   if(width===390){
    const height=await page.evaluate(()=>document.documentElement.scrollHeight);
    console.log('Collapsed mobile homepage height:',height);
    assert(height<2500,'Mobile homepage exceeds the compact height budget');
   }
  }else{
   assert(await page.getByLabel('Choose a photo',{exact:true}).isVisible());
   const news=page.locator('.home-desktop-news>section');
   const assertPanels=async()=>{
    const gallery=await page.locator('.home-community-gallery').boundingBox();
    const contest=await news.boundingBox();
    assert(Math.abs(gallery.y-contest.y)<1 && Math.abs(gallery.height-contest.height)<1,'Community and contest panels must share top and bottom edges');
    assert(Math.abs(gallery.width-contest.width)<1,'Community and contest panels must have equal widths');
   };
   await assertPanels();
   await news.getByRole('button',{name:'Next contest news',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('.home-desktop-news [aria-label="Show Daily Challenge"]')?.getAttribute('aria-pressed')==='true');
   await assertPanels();
   assert(await news.getByRole('link',{name:'Take your daily challenge'}).isVisible());
   if(width===1440)await page.locator('.home-community-news').screenshot({path:`${output}/matching-community-panels.png`});
   await news.getByRole('button',{name:'Previous contest news',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('.home-desktop-news [aria-label="Show OCC Round One"]')?.getAttribute('aria-pressed')==='true');
   await assertPanels();
  }

  assert.equal(await page.locator('.rank-symbols,.rank-orbit').count(),0,'Higher ranks should have sparkles without flying symbols');
  for(const rating of [2400,2600,3000]){
   const samples=guide.locator(`.rank-level-${rating}`);
   assert.equal(await samples.count(),2,'Rank guide should show both a sample name and title');
   for(const sample of await samples.all())assert.equal(await sample.locator('.rank-sparkles svg').count(),5);
  }
  assert.equal(await guide.locator('.rank-level-3000 .rank-crown').count(),1,'Keep the crown on the legendary sample name');
  await page.emulateMedia({reducedMotion:'no-preference'});
  assert.equal(await guide.locator('.rank-level-2400 .rank-sparkles svg').first().evaluate(element=>getComputedStyle(element).animationName),'rank-sparkle');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await guide.locator('.rank-sparkles').first().evaluate(element=>getComputedStyle(element).display),'none');

  if(width<1024){
   const button=page.getByRole('button',{name:'Open navigation',exact:true});
   await button.click();assert(await page.locator('#mobile-navigation').isVisible());
   await page.keyboard.press('Escape');assert(!(await page.locator('#mobile-navigation').isVisible()));
   assert(await button.evaluate(el=>el===document.activeElement));
  }
  const header=await page.locator('header').boundingBox();
  await page.evaluate(()=>scrollTo(0,500));
  assert.equal((await page.locator('header').boundingBox()).y,header.y);
  await page.evaluate(()=>{scrollTo(0,0);document.activeElement?.blur();});
  if(width===390||width===1440){
   const name=width===390?'mobile':'desktop';
   await page.screenshot({path:`${output}/home-${name}.png`,fullPage:true});
   await page.screenshot({path:`${output}/home-${name}-top.png`});
   await page.locator('.home-highlights').screenshot({path:`${output}/rating-medals-${name}.png`});
  }
  for(const route of ['/problems','/leaderboard','/contests','/training','/login','/dashboard','/signup','/settings']){
   if(width!==390&&width!==1440)continue;
   await page.goto(base+route,{waitUntil:'networkidle'});await check();
   await page.screenshot({path:`${output}/${route.slice(1)}-${width===390?'mobile':'desktop'}.png`});
   if(route==='/problems'){
    await page.getByRole('combobox',{name:'Topic',exact:true}).click();
    await page.getByRole('option',{name:'Geometry',exact:true}).click();
    assert(await page.getByRole('combobox',{name:'Topic',exact:true}).innerText().then(t=>t.includes('Geometry')));
   }
  }
  assert.deepEqual(errors,[],`Browser errors at ${width}`);await page.close();
 }
 console.log('PASS: 6 viewport widths; inline rank table toggles by mouse and keyboard; no page overflow; fixed header; desktop sidebar; mobile menu/Escape/focus; homepage and 8 other page previews. Demo data only.');
} finally {await browser.close();}
