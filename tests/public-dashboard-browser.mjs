import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
const env = await readFile(".env.local", "utf8");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^\s"']+)/m)?.[1];
const browser = await chromium.launch(process.platform === "win32" ? { channel: "msedge", headless: true } : { headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const stamp = new Date().toISOString();
const profiles = {
  alice: { id: "alice", username: "alice", full_name: "Alice Example", rating: 900, contests_attended: 0, created_at: stamp, is_public: true, avatar_url: null, school: null, rating_history: [] },
  bob: { id: "bob", username: "bob", full_name: "Bob Example", rating: 1600, contests_attended: 2, created_at: stamp, is_public: true, avatar_url: null, school: null, rating_history: [] },
};
const activity = (name) => ({
  practice: [{ id: `${name}-practice`, problem_id: `${name}-question`, is_correct: name === "bob", score: name === "bob" ? 2 : 0, created_at: stamp, answered: true }],
  contests: [{ id: `${name}-attempt`, contest_id: "mock", status: "finalized", score: name === "bob" ? 37 : 12, started_at: stamp, finalized_at: stamp }],
});
const errors = [];
page.on("pageerror", error => errors.push(error.message));
await page.route(new URL(url).origin + "/**", route => route.fulfill({ json: [] }));
await page.route("**/api/**", route => {
  const path = new URL(route.request().url()).pathname.slice(5);
  if (path === "problem-directory") return route.fulfill({ json: ["alice", "bob"].map(name => ({ id: `${name}-question`, title: `${name} problem`, category: "Algebra", difficulty: "Easy", difficulty_rating: 800, topic_tags: [], option_count: 2 })) });
  if (path.startsWith("profile/")) {
    const [, name, action] = path.split("/");
    if (profiles[name]) return route.fulfill({ json: action === "dashboard" ? activity(name) : profiles[name] });
    return route.fulfill({ status: 404, json: { error: { message: "Profile not found" } } });
  }
  return route.fulfill({ json: [] });
});
try {
  for (const name of ["alice", "bob"]) {
    await page.goto(base + `/profile/${name}`);
    await page.getByRole("heading", { name: `${profiles[name].full_name}’s dashboard` }).waitFor();
    await page.getByRole("heading", { name: "Recent activity" }).waitFor();
    assert.ok(await page.getByText(name === "bob" ? "37 points" : "12 points", { exact: true }).count());
    assert.equal(await page.locator('a[href*="/results?attempt="]').count(), 0);
    assert.equal(await page.locator(`a[href="/problems/${name}-question"]`).count(), 1);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.setViewportSize({ width: 1280, height: 900 });
  }
  await page.goto(base + "/profile/private");
  await page.getByRole("alert").filter({ hasText: "Profile not found" }).waitFor();
  assert.equal(await page.getByRole("heading", { name: "Recent activity" }).count(), 0);
  assert.deepEqual(errors, []);
  console.log("Public dashboards verified: subject-specific statistics, safe contest links, mobile layout, private profile rejection.");
} finally { await browser.close(); }
