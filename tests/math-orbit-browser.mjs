import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.TEST_BASE_URL??'http://localhost:3037';
const output=process.env.TEST_SCREENSHOT_DIR??'/tmp/math-orbit-preview';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE??'/usr/bin/chromium',headless:true});
try {
 for(const width of [360,390,430,768,900,1023,1024,1440]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base,{waitUntil:'networkidle'});
  await page.locator('.hero-art img').waitFor();
  await page.waitForFunction(()=>document.querySelector('.hero-art img')?.complete);
  assert((await page.locator('.hero-art img').getAttribute('src')).includes('math-orbits-core.png'));
  assert(!(await page.locator('.electrons-moving').isVisible()));
  assert(await page.locator('.electrons-still').isVisible());
  assert.equal(await page.locator('.electrons-still .electron-core').count(),5);
  assert.equal(await page.locator('.orbit-rings').evaluate(image=>getComputedStyle(image).animationName),'none');
  const artwork=await page.locator('.hero-art').boundingBox();
  const illustration=await page.locator('.hero-illustration').boundingBox();
  const tracks=await page.locator('.electron-tracks').boundingBox();
  const halo=(await page.locator('.orbit-electrons').boundingBox()).width*36/1536;
  assert(tracks.x-halo>=artwork.x && tracks.x+tracks.width+halo<=artwork.x+artwork.width,'Enlarged orbits and electron glows should fit horizontally');
  assert(tracks.y-halo>=artwork.y && tracks.y+tracks.height+halo<=artwork.y+artwork.height,'Enlarged orbits and electron glows should fit vertically');
  assert(artwork.x>=illustration.x-.5 && artwork.x+artwork.width<=illustration.x+illustration.width+.5,'Full artwork should fit inside its column');
  if(width<1024){
   assert(artwork.y>=illustration.y-.5 && artwork.y+artwork.height<=illustration.y+illustration.height+.5,'Full artwork should fit vertically too');
  }
  await page.emulateMedia({reducedMotion:'no-preference'});
  assert(await page.locator('.electrons-moving').isVisible());
  assert(!(await page.locator('.electrons-still').isVisible()));
  await page.locator('.orbit-rings').evaluate(async image=>{
   const animation=image.getAnimations().find(animation=>animation.animationName==='orbit-rings-float');
   if(!animation) throw new Error('Rings should animate');
   animation.pause();animation.currentTime=0;
   const start=getComputedStyle(image).transform;
   animation.currentTime=7000;
   if(getComputedStyle(image).transform===start) throw new Error('Rings should tilt and float');
   animation.currentTime=14000;
   if(getComputedStyle(image).transform!==start) throw new Error('Ring motion should loop seamlessly');
   animation.currentTime=3500;
  });
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
  console.log(`PASS: ${width}px full artwork, floating rings, orbiting electrons, seamless loops, reduced motion, no overflow or browser errors`);
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
