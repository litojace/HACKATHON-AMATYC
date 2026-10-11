import { chromium } from "playwright";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
const browser = await chromium.launch({executablePath: process.env.BROWSER_EXECUTABLE, headless: true});
try {
  const page = await browser.newPage();
  const questions = await (await page.request.get(base + "/api/problems")).json();
  assert.equal(questions.length, 840);
  for (const question of questions) for (const secret of ["correct_answer", "accepted_answers", "grading_policy", "written_solution", "calculator_trick"]) assert.ok(!(secret in question));
  for (const id of ["amatyc-2025-spring-q14", "amatyc-2004-fall-q03"]) {
    const question = questions.find(p => p.id === id);
    assert.ok(question.source_image_path);
    assert.equal((await page.request.get(base + question.source_image_path)).status(), 200);
    await page.goto(base + "/problems/" + id);
    await page.getByRole("heading", {name: "Sign in to practice."}).waitFor();
    assert.equal(await page.getByRole("button", {name: "Submit Answer", exact: true}).count(), 0);
  }
  console.log("PASS: historical public library, original image assets, answer privacy and authentication gates.");
} finally { await browser.close(); }
