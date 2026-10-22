import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.TEST_BASE_URL??'http://localhost:3037';
const output=process.env.TEST_SCREENSHOT_DIR??'/tmp/math-orbit-preview';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE??'/usr/bin/chromium',headless:true});
try {
 for(const width of [360,390,768,1024,1440]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base,{waitUntil:'networkidle'});
  await page.locator('.hero-art img').waitFor();
  await page.waitForFunction(()=>document.querySelector('.hero-art img')?.complete);
  assert((await page.locator('.hero-art img').getAttribute('src')).includes('math-orbits-core.png'));
  assert(!(await page.locator('.electrons-moving').isVisible()));
  assert(await page.locator('.electrons-still').isVisible());
  assert.equal(await page.locator('.electrons-still .electron-core').count(),5);
  await page.emulateMedia({reducedMotion:'no-preference'});
  assert(await page.locator('.electrons-moving').isVisible());
  assert(!(await page.locator('.electrons-still').isVisible()));
  const positions=async(time)=>page.locator('.orbit-electrons').evaluate(async(svg,t)=>{
   svg.pauseAnimations();svg.setCurrentTime(t);
   await new Promise(requestAnimationFrame);
   await new Promise(requestAnimationFrame);
   return [...svg.querySelectorAll('.electrons-moving .electron-core')].map(node=>{
    const box=node.getBoundingClientRect();return {x:box.x+box.width/2,y:box.y+box.height/2};
   });
  },time);
  const start=await positions(0),later=await positions(2),loop=await positions(28);
  assert.equal(start.length,5);
  assert(start.every((point,i)=>Math.hypot(point.x-later[i].x,point.y-later[i].y)>3),'Every electron must move');
  assert(Math.hypot(start[0].x-loop[0].x,start[0].y-loop[0].y)<1,'Orbit should loop without a jump');
  await positions(3);
  // Let the existing CSS entrance finish after switching the motion preference.
  await page.evaluate(()=>Promise.all(document.getAnimations().filter(animation=>Number.isFinite(animation.effect?.getComputedTiming().endTime)).map(animation=>animation.finished.catch(()=>{}))));
  await page.screenshot({path:`${output}/orbit-${width}.png`});
  await page.emulateMedia({reducedMotion:'reduce'});
  const still=page.locator('.electrons-still .electron-core').first();
  const before=await still.boundingBox();await positions(7);const after=await still.boundingBox();
  assert.deepEqual(before,after,'Reduced-motion electrons should stay still');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  console.log(`PASS: ${width}px five moving electrons, seamless loop, static reduced motion, no overflow or browser errors`);
  await page.close();
 }
 if(process.env.RECORD_ORBIT){
  const context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:output,size:{width:1440,height:1000}}});
  const page=await context.newPage();await page.goto(base,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('.hero-art img')?.complete);
  const crop=await page.locator('.hero-art').boundingBox();
  await writeFile(`${output}/crop.json`,JSON.stringify(crop));
  await page.waitForTimeout(9000);
  const video=page.video();await context.close();
  await writeFile(`${output}/video-path.txt`,await video.path());
 }
}finally{await browser.close();}
