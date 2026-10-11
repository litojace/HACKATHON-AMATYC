import { chromium } from "playwright";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
const browser = await chromium.launch({headless: true, executablePath: process.env.BROWSER_EXECUTABLE ?? "/usr/bin/chromium", args: ["--no-sandbox"]});
try {
  const page = await browser.newPage({viewport: {width: 490, height: 900}});
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const profiles = [
    {id: "a", username: "alice", full_name: "Alice", school: "OCC", rating: 800, contests_attended: 0},
    {id: "b", username: "bob", full_name: "Bob", school: "Other school", rating: 900, contests_attended: 0},
  ];
  const problems = Array.from({length: 15}, (_, i) => ({id: `problem-${i}`, title: `Problem ${i}`, category: "Algebra", difficulty: "Easy", difficulty_rating: 800 + i * 100, topic_tags: [], contest_name: "Test", option_count: 2}));
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({json: path === "/api/leaderboard" ? profiles : (path === "/api/problem-directory" || path === "/api/problems") ? problems : []});
  });
  await page.goto(base + "/leaderboard");
  const school = page.getByRole("combobox", {name: "Filter by school"});
  await school.waitFor();
  const search = page.getByRole("textbox", {name: "Search competitors"});
  assert.equal((await school.boundingBox()).width, (await search.boundingBox()).width);
  await school.click();
  await page.getByRole("option", {name: "OCC", exact: true}).waitFor();
  assert.equal(await school.getAttribute("aria-expanded"), "true");
  assert.ok(await page.getByRole("option", {name: "OCC", exact: true}).evaluate(el => el.getAnimations().length > 0));
  await page.getByRole("option", {name: "OCC", exact: true}).click();
  await page.getByRole("link", {name: "Alice", exact: true}).waitFor();
  assert.equal(await page.getByRole("link", {name: "Bob", exact: true}).count(), 0);
  assert.equal(await page.locator('select[aria-label="Filter by school"]').inputValue(), "OCC");
  await school.focus(); await school.press("Home"); await school.press("Enter");
  await page.getByRole("link", {name: "Bob", exact: true}).waitFor();
  await school.press("End"); await school.press("Escape");
  assert.equal(await school.innerText(), "All schools");
  await school.press("o"); await school.press("c"); await school.press("Enter");
  assert.equal(await school.innerText(), "OCC");
  await school.click(); await school.press("Tab");
  assert.equal(await school.getAttribute("aria-expanded"), "false");
  await school.click(); await page.getByRole("heading").first().click();
  assert.equal(await school.getAttribute("aria-expanded"), "false");
  await page.goto(base + "/problems");
  const difficulty = page.getByRole("combobox", {name: "Difficulty", exact: true});
  await difficulty.focus(); await difficulty.press("ArrowDown"); await difficulty.press("Enter");
  await page.waitForURL("**/problems?difficulty=Easy");
  const maximum = page.getByRole("combobox", {name: "Maximum rating"});
  await maximum.scrollIntoViewIfNeeded(); await maximum.click();
  await maximum.press("End");
  const popup = page.getByRole("listbox");
  await page.waitForFunction(() => document.querySelector('[role="listbox"]')?.scrollTop > 0);
  await maximum.press("Enter");
  await page.waitForURL(/max=2200/);
  await page.emulateMedia({reducedMotion: "reduce"});
  await maximum.click();
  assert.equal(await page.getByRole("option", {name: "2200", exact: true}).evaluate(el => getComputedStyle(el).animationName), "none");
  const bounds = await popup.boundingBox();
  assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 900);
  const touch = await browser.newPage({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true});
  await touch.route("**/api/**", route => route.fulfill({json: new URL(route.request().url()).pathname === "/api/leaderboard" ? profiles : []}));
  await touch.goto(base + "/leaderboard");
  await touch.getByRole("combobox", {name: "Filter by school"}).tap();
  await touch.getByRole("option", {name: "OCC", exact: true}).tap();
  await touch.getByRole("link", {name: "Alice", exact: true}).waitFor();
  assert.equal(await touch.getByRole("link", {name: "Bob", exact: true}).count(), 0);
  await touch.close();
  assert.deepEqual(errors, []);
  console.log("PASS: animated dropdown options, school filtering, native form values, arrows, Home/End, typeahead, Escape/Tab, outside click, long-list scrolling, viewport placement, touch selection and reduced motion.");
} finally { await browser.close(); }
