import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
const env = await readFile(".env.local", "utf8").catch(() => "");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^\s"']+)/m)?.[1];
if (!url) throw new Error("Supabase configuration is required for mocked auth; no real backend writes are made.");
const browser = await chromium.launch(process.env.BROWSER_EXECUTABLE
  ? { executablePath: process.env.BROWSER_EXECUTABLE, headless: true }
  : { channel: process.platform === "win32" ? "msedge" : undefined, headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const user = { id: "00000000-0000-4000-8000-000000000002", aud: "authenticated", role: "authenticated", email: "learner@example.test", app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
const jwt = [{ alg: "HS256", typ: "JWT" }, { sub: user.id, aud: user.aud, role: user.role, exp: Math.floor(Date.now() / 1000) + 3600 }].map(value => Buffer.from(JSON.stringify(value)).toString("base64url")).join(".") + ".mock";
await context.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), {
  key: "sb-" + new URL(url).hostname.split(".")[0] + "-auth-token",
  session: { access_token: jwt, refresh_token: "mock-refresh", expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: "bearer", user },
});
const questions = Array.from({ length: 5 }, (_, i) => ({ id: `question-${i}`, title: `Test question ${i + 1}`, contest_name: "Test contest", question_number: i + 1, category: "Algebra", topic_tags: [], difficulty: "Easy", difficulty_rating: 800, question_latex: "1 + 1 = ?", option_count: 2, options: [{ label: "A", text: "2" }, { label: "B", text: "3" }], figure_required: false, figure_image_path: null, verification_status: "verified" }));
let finalized = false;
await context.route(new URL(url).origin + "/**", route => route.fulfill({ json: route.request().url().includes("/auth/") ? user : [] }));
await context.route("**/api/**", route => {
  const path = new URL(route.request().url()).pathname.slice(5);
  if (path === "problems" || path === "problem-directory") return route.fulfill({ json: questions });
  if (path === "me") return route.fulfill({ json: { ...user, username: "learner", full_name: "Test Learner", rating: 800, contests_attended: 0, is_public: true, avatar_url: null, school: null } });
  if (path === "activity") return route.fulfill({ json: { practice: [], contests: [], ratings: [], bookmarks: [] } });
  if (path.startsWith("attempts/")) {
    if (path.endsWith("/finish")) finalized = true;
    return route.fulfill({ json: { id: "mock-attempt", contest_id: "mock", started_at: new Date().toISOString(), deadline: new Date(Date.now() + 600000).toISOString(), finalized_at: finalized ? new Date().toISOString() : null, status: finalized ? "finalized" : "active", answers: {}, flags: [], score: finalized ? 0 : null, questions, server_now: new Date().toISOString(), breakdown: [] } });
  }
  if (path.startsWith("practice/")) return route.fulfill({ json: path.endsWith("/start") ? { request_id: "mock-request" } : { id: path, problem_id: path.split("/")[1], selected_answer: null, is_correct: false, score: 0, time_spent_seconds: 0, created_at: new Date().toISOString(), correct_answer: "A", written_solution: "Two." } });
  return route.fulfill({ json: [] });
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));
try {
  await page.goto(base + "/training");
  await page.getByRole("button", { name: "Start training" }).click();
  await page.getByRole("link", { name: "Problems", exact: true }).first().click();
  const trainingDialog = page.getByRole("dialog", { name: "Leave this training session?" });
  await trainingDialog.waitFor();
  assert.match(page.url(), /\/training$/);
  await trainingDialog.getByRole("button", { name: "Keep training" }).click();
  await trainingDialog.waitFor({ state: "detached" });
  assert.match(page.url(), /\/training$/);
  await page.getByRole("link", { name: "Problems", exact: true }).first().click();
  await page.keyboard.press("Escape");
  await trainingDialog.waitFor({ state: "detached" });
  await page.getByRole("link", { name: "Problems", exact: true }).first().click();
  await trainingDialog.getByRole("button", { name: "Leave training", exact: true }).click();
  await page.waitForURL("**/problems");

  await page.goto(base + "/training");
  await page.getByRole("button", { name: "Start training" }).click();
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Submit test", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Submit test", exact: true }).click();
  await page.getByText("Session complete", { exact: true }).waitFor();
  await page.waitForFunction(() => sessionStorage.getItem("amatyc-training-result-v1") !== null);
  await page.reload();
  await page.getByText("Session complete", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Set up another session" }).click();
  assert.equal(await page.evaluate(() => sessionStorage.getItem("amatyc-training-result-v1")), null);
  await page.reload();
  await page.getByRole("button", { name: "Start training" }).waitFor();
  assert.equal(await page.getByText("Session complete", { exact: true }).count(), 0);
  // Restore a completed snapshot to verify navigating away clears it too.
  await page.evaluate(({ userId, questions }) => sessionStorage.setItem("amatyc-training-result-v1", JSON.stringify({
    userId, session: questions, answers: {}, results: Object.fromEntries(questions.map(q => [q.id, { is_correct: false, correct_answer: "A" }])), deadline: Date.now(), timedOut: true,
  })), { userId: user.id, questions });
  await page.reload();
  await page.getByText("Session complete", { exact: true }).waitFor();
  await page.getByRole("heading", { name: "Time's up! Your training session has ended." }).waitFor();
  await page.getByRole("link", { name: "Problems", exact: true }).first().click();
  await page.waitForURL("**/problems");
  await page.waitForFunction(() => sessionStorage.getItem("amatyc-training-result-v1") === null);
  await page.getByRole("link", { name: "Training", exact: true }).first().click();
  await page.getByRole("button", { name: "Start training" }).waitFor();
  assert.equal(await page.getByRole("dialog").count(), 0);

  await page.goto(base + "/contests/mock/take");
  await page.getByRole("heading", { name: "Question 1 / 5" }).waitFor();
  await page.getByRole("link", { name: "Training", exact: true }).first().click();
  const contestDialog = page.getByRole("dialog", { name: "Leave this contest session?" });
  await contestDialog.waitFor();
  await contestDialog.getByRole("button", { name: "Stay in contest" }).click();
  await contestDialog.waitFor({ state: "detached" });
  assert.match(page.url(), /\/contests\/mock\/take/);
  await page.getByRole("link", { name: "Training", exact: true }).first().click();
  await contestDialog.getByRole("button", { name: "Leave contest", exact: true }).click();
  await page.waitForURL("**/training");
  assert.deepEqual(errors, []);
  console.log("Leave session checks passed: cancel, Escape, confirmed navigation, completed training, active contest.");
} finally {
  await browser.close();
}
