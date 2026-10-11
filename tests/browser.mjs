import { chromium } from "playwright";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const library = await (await page.request.get(base + "/api/problems")).json();
  assert.ok(library.length > 0);
  for (const problem of library) {
    for (const field of ["correct_answer", "accepted_answers", "written_solution", "calculator_trick"]) assert.ok(!(field in problem));
  }
  const problem = library.find(item => !item.id.startsWith("demo-"));
  const contests = await (await page.request.get(base + "/api/contests")).json();
  const contest = contests[0];
  for (const [path, method, data] of [
    [`practice/${problem.id}/start`, "POST", {}],
    [`practice/${problem.id}`, "POST", {answer: "A", request_id: "00000000-0000-4000-8000-000000000001"}],
    [`practice/${problem.id}/solution`, "GET"],
    [`attempts/${contest.id}/start`, "POST", {}],
    ["attempts/00000000-0000-4000-8000-000000000001", "GET"],
    ["attempts/00000000-0000-4000-8000-000000000001", "PATCH", {problem_id: problem.id, answer: "A", flagged: false}],
    ["attempts/00000000-0000-4000-8000-000000000001/finish", "POST", {}],
  ]) {
    const response = await page.request.fetch(base + "/api/" + path, {method, ...(data ? {data} : {})});
    assert.equal(response.status(), 401, path);
  }
  await page.goto(base + "/problems");
  await page.getByRole("heading", {name: "Find your next breakthrough."}).waitFor();
  await page.goto(base + "/admin/carousel");
  await page.getByRole("heading", {name: "Sign in to manage the carousel."}).waitFor();
  assert.equal((await page.request.put(base + "/api/admin/carousel", {data: []})).status(), 401);
  const carouselResponse = await page.request.get(base + "/api/carousel");
  // A shared backend may not have applied the new migration yet.
  assert.ok([200, 503].includes(carouselResponse.status()));
  const slides = carouselResponse.ok() ? await carouselResponse.json() : [
    {src: "/images/community/team.png", label: "Team", alt: "Team", fit: "cover"},
    {src: "/images/community/pizza.png", label: "Pizza", alt: "Pizza", fit: "cover"},
  ];
  assert.ok(slides.length > 0);
  await page.route("**/api/carousel", route => route.fulfill({json: [
    {...slides[0], label: "Edited caption"},
    {...(slides[1] ?? slides[0]), label: "Second slide"},
  ]}));
  await page.goto(base);
  await page.getByText("Edited caption", {exact: true}).waitFor();
  const gallery = page.getByRole("complementary", {name: "AMATYC community"});
  await page.waitForFunction(() => Array.from(document.querySelectorAll('aside[aria-label="AMATYC community"] img')).some(image => image.parentElement.style.opacity === "1"));
  assert.equal(await gallery.locator("div.transition-opacity").first().evaluate(element => getComputedStyle(element).transitionDuration), "0.45s");
  assert.equal(await page.getByRole("link", {name: "Edit carousel"}).count(), 0);
  await page.mouse.move(0, 0);
  await page.getByText("Second slide", {exact: true}).waitFor({timeout: 8000});
  await page.getByRole("button", {name: "Show previous photo"}).click();
  await page.getByText("Edited caption", {exact: true}).waitFor();
  await page.getByRole("button", {name: "Show next photo"}).click();
  await page.getByText("Second slide", {exact: true}).waitFor();
  await page.getByRole("button", {name: "Show next photo"}).click();
  await page.getByText("Edited caption", {exact: true}).waitFor();
  await page.route("**/api/carousel", route => route.fulfill({json: Array.from({length: 10}, (_, index) => ({...slides[0], label: `Slide ${index + 1}`}))}));
  await page.setViewportSize({width: 390, height: 844});
  await page.goto(base);
  await page.getByRole("button", {name: "Show photo 10: Slide 10", exact: true}).waitFor();
  const strip = page.getByLabel("Choose a photo");
  assert.ok(await strip.evaluate(el => el.scrollWidth > el.clientWidth));
  assert.ok(await strip.evaluate(el => new Set([...el.children].map(child => child.offsetTop)).size === 1));
  const retainedImage = await page.locator('aside[aria-label="AMATYC community"] img[alt]').nth(1).elementHandle();
  await page.getByRole("button", {name: "Show photo 10: Slide 10", exact: true}).click();
  await page.getByText("Slide 10", {exact: true}).waitFor();
  assert.ok(await retainedImage.evaluate(el => el.isConnected));
  await page.waitForFunction(() => document.querySelector('.carousel-thumbnails').scrollLeft > 0);
  await page.setViewportSize({width: 1280, height: 900});
  await page.goto(base + "/problems/" + problem.id);
  await page.getByRole("heading", {name: "Sign in to practice."}).waitFor();
  assert.equal(await page.getByRole("button", {name: "Submit Answer", exact: true}).count(), 0);
  const signIn = page.getByRole("link", {name: "Sign in", exact: true});
  assert.equal(await signIn.getAttribute("href"), "/login?next=" + encodeURIComponent("/problems/" + problem.id));
  await signIn.click();
  await page.getByRole("heading", {name: "Welcome back."}).waitFor();
  if (await page.getByRole("button", {name: "Continue with Google"}).count()) {
    assert.equal(await page.getByRole("button", {name: "Continue with Google"}).getAttribute("type"), "button");
  } else {
    await page.getByText(/Sign-in is not available yet/).waitFor();
  }
  await page.goto(base + "/contests/" + contest.id);
  await page.getByRole("link", {name: "Sign in to begin"}).waitFor();
  assert.equal(await page.getByRole("button", {name: "Start / resume exam"}).count(), 0);
  for (const suffix of ["take", "results"]) {
    await page.goto(base + `/contests/${contest.id}/${suffix}`);
    await page.getByRole("heading", {name: "Sign in to practice."}).waitFor();
  }
  await page.goto(base + "/auth/callback#error=access_denied&error_description=Sign-in%20cancelled");
  await page.locator("main").getByRole("alert").waitFor();
  assert.match(await page.locator("main").getByRole("alert").innerText(), /cancelled/);
  await page.goto(base);
  const initialTheme = await page.locator("html").getAttribute("data-theme");
  await page.getByRole("button", {name: "Toggle color theme"}).click();
  const switched = initialTheme === "dark" ? "light" : "dark";
  await page.reload();
  await page.waitForFunction(theme => document.documentElement.dataset.theme === theme, switched);
  await page.setViewportSize({width: 390, height: 844});
  await page.getByRole("button", {name: "Open navigation"}).click();
  await page.getByRole("link", {name: "Problems", exact: true}).click();
  await page.getByRole("heading", {name: "Find your next breakthrough."}).waitFor();
  assert.deepEqual(errors, []);
  console.log("PASS: public browsing, answer confidentiality, guest API rejection, practice/contest login gates, return links, callback errors, theme persistence and mobile navigation.");
} finally { await browser.close(); }
