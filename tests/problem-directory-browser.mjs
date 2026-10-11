import { chromium } from "playwright";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3016";
const browser = await chromium.launch({executablePath: process.env.BROWSER_EXECUTABLE ?? "/usr/bin/chromium", headless:true,args:["--no-sandbox"]});
try {
 const page = await browser.newPage({viewport:{width:626,height:1108}});
 const fullResponse = await page.request.get(base+"/api/problems");
 const summaryResponse = await page.request.get(base+"/api/problem-directory");
 assert.equal(fullResponse.status(),200);assert.equal(summaryResponse.status(),200);
 const full = await fullResponse.json(), summary = await summaryResponse.json();
 assert.equal(full.length, summary.length);assert.ok(full.length>0);
 for (const p of full) {
  const entry = summary.find(x=>x.id===p.id);
  const expected = {...p};
  for (const key of ["options","figure_required","figure_image_path","source_image_path","answer_format","difficulty_rationale"]) delete expected[key];
  assert.deepEqual(entry,{...expected,option_count:p.options.length});
  for(const key of ["correct_answer","written_solution","calculator_trick","accepted_answers","grading_policy"]) assert.ok(!(key in entry) && !(key in p));
 }
 const detail = await (await page.request.get(base+"/api/problems/"+full[0].id)).json();
 assert.deepEqual(detail,full[0]);
 const requests=[];const errors=[];
 page.on("request",req=>{if(new URL(req.url()).pathname.startsWith("/api/"))requests.push(new URL(req.url()).pathname);});
 page.on("pageerror",e=>errors.push(e.message));
 await page.goto(base+"/problems");
 await page.getByRole("heading",{name:"Find your next breakthrough."}).waitFor();
 const searchBounds=await page.getByRole("textbox",{name:"Search problems"}).boundingBox();
 const iconBounds=await page.getByRole("textbox",{name:"Search problems"}).locator("..").locator("svg").boundingBox();
 const topicBounds=await page.getByRole("combobox",{name:"Topic",exact:true}).boundingBox();
 assert.ok(iconBounds.x>searchBounds.x && iconBounds.x+iconBounds.width<searchBounds.x+searchBounds.width);
 assert.equal(searchBounds.x,topicBounds.x);assert.equal(searchBounds.width,topicBounds.width);
 await page.screenshot({path:"/tmp/amatyc-library-019.png"});
 await page.locator('main a[href^="/problems/"]').first().click();
 await page.waitForURL(/\/problems\//);
 await page.getByText("Sign in to practice.",{exact:true}).waitFor();
 await page.getByRole("link",{name:"← Back to problems"}).click();
 await page.getByRole("heading",{name:"Find your next breakthrough."}).waitFor();
 assert.equal(requests.filter(p=>p==="/api/problem-directory").length,1,JSON.stringify(requests));
 assert.equal(requests.filter(p=>p==="/api/problems").length,0);
 assert.equal(requests.filter(p=>p.startsWith("/api/problems/")).length,1);
 await page.locator('header a[href="/"]').click();
 await page.getByRole("complementary",{name:"MAT Community"}).waitFor();
 const strip=page.getByLabel("Choose a photo");
 await page.getByRole("button",{name:/Show photo 1:/}).waitFor();
 await page.waitForFunction(()=>!document.querySelector('[aria-label="Choose a photo"] button')?.disabled);
 await page.mouse.move(620,90);
 // Native horizontal scrolling remains independent, and autoplay pauses during a drag.
 const before=await strip.locator('[aria-pressed="true"]').getAttribute("aria-label");
 await strip.evaluate(el=>{el.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true}));el.scrollLeft=el.scrollWidth;el.dispatchEvent(new Event("scroll"));});
 await page.waitForTimeout(3000);
 assert.equal(await strip.locator('[aria-pressed="true"]').getAttribute("aria-label"),before);
 await page.evaluate(()=>window.dispatchEvent(new PointerEvent("pointerup")));
 assert.deepEqual(errors,[]);
 console.log(`PASS: ${full.length} full/summary API responses, individual detail compatibility, one directory request across navigation, carousel scrollbar interaction`);
} finally {await browser.close();}
