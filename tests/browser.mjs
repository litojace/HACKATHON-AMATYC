import { chromium } from "playwright";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_EXECUTABLE,
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page
    .getByRole("heading", { name: "Master Mathematics. Climb the Rankings." })
    .waitFor();
  await page.screenshot({
    path: join(tmpdir(), "amatyc-v2-desktop.png"),
    fullPage: true,
  });
  const publicData = await (
    await page.request.get(base + "/api/problems")
  ).json();
  assert.equal(publicData.length, 840);
  assert.ok(
    publicData.every(
      (p) =>
        !("correct_answer" in p) &&
        !("written_solution" in p) &&
        !("calculator_trick" in p),
    ),
  );
  assert.equal(
    (
      await page.request.post(base + "/api/practice/demo-01", {
        data: { answer: "D", request_id: crypto.randomUUID() },
      })
    ).status(),
    409,
  );
  await page.getByRole("link", { name: /Start Practicing/ }).click();
  await page
    .getByRole("link", { name: "Nested Operations", exact: true })
    .waitFor();
  assert.equal(await page.locator("tbody tr").count(), 12);
  await page
    .getByRole("combobox", { name: "Topic", exact: true })
    .selectOption("Geometry");
  assert.ok((await page.locator("tbody tr").count()) > 0);
  assert.ok(page.url().includes("topic=Geometry"));
  await page
    .getByRole("combobox", { name: "Topic", exact: true })
    .selectOption("");
  await page
    .getByRole("button", { name: "Bookmark Nested Operations", exact: true })
    .click();
  await page.getByLabel("Bookmarked only").check();
  await page.waitForFunction(
    () => document.querySelectorAll("tbody tr").length === 1,
  );
  await page
    .getByRole("link", { name: "Nested Operations", exact: true })
    .click();
  const submit = page.getByRole("button", {
    name: "Submit Answer",
    exact: true,
  });
  await submit.waitFor();
  await page.waitForFunction(() =>
    [...document.querySelectorAll("button")].some(
      (b) => b.textContent === "Submit Answer" && !b.disabled,
    ),
  );
  await page.keyboard.press("4");
  await page.keyboard.press("Enter");
  await page.getByRole("heading", { name: "Mathematical Solution" }).waitFor();
  await page.getByText("+2.0 pts", { exact: true }).waitFor();
  await page.waitForFunction(() => {
    const stats = Object.fromEntries([...document.querySelectorAll("dl > div")].map(el => [el.querySelector("dt")?.textContent, el.querySelector("dd")?.textContent]));
    return stats.Accepted === "1" && stats.Attempts === "1" && stats["Acceptance rate"] === "100.0%";
  });
  assert.equal(await page.getByRole("tab", { name: "Casio Calculator Strategy" }).count(), 0);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await submit.click();
  await page.getByText("0.0 pts", { exact: true }).waitFor();
  await page.waitForFunction(() => {
    const stats = Object.fromEntries([...document.querySelectorAll("dl > div")].map(el => [el.querySelector("dt")?.textContent, el.querySelector("dd")?.textContent]));
    return stats.Accepted === "1" && stats.Attempts === "2" && stats["Acceptance rate"] === "50.0%";
  });
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await page.getByRole("heading", { name: /Your progress/ }).waitFor();
  await page.getByText("Recent activity", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Rating", exact: true }).click();
  await page.getByRole("heading", { name: "Solved rating distribution" }).waitFor();
  assert.equal(await page.getByRole("img", { name: "Solved rating distribution chart" }).count(), 1);
  await page.getByRole("button", { name: "Difficulty", exact: true }).click();
  await page.getByRole("heading", { name: "Solved difficulty distribution" }).waitFor();
  assert.ok(
    await page
      .getByText("Nested Operations · Solved", { exact: false })
      .count(),
  );
  await page.goto(base + "/contests");
  await page.getByRole("link", { name: /View contest/ }).first().click();
  await page.getByRole("button", { name: "Start / resume exam" }).click();
  await page.getByRole("timer").waitFor();
  await page
    .locator("button[aria-pressed]")
    .filter({ hasText: /D/ })
    .last()
    .click();
  await page
    .getByRole("button", { name: "Flag for review", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Question 1, flagged", exact: true })
    .waitFor();
  const attemptId = new URL(page.url()).searchParams.get("attempt");
  const before = await (
    await page.request.get(base + "/api/attempts/" + attemptId)
  ).json();
  assert.ok(!JSON.stringify(before).includes("correct_answer"));
  await page.getByRole("button", { name: "Next problem", exact: true }).click();
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await page.reload();
  await page.getByRole("timer").waitFor();
  const after = await (
    await page.request.get(base + "/api/attempts/" + attemptId)
  ).json();
  assert.equal(before.deadline, after.deadline);
  assert.equal(after.answers["demo-01"], "D");
  assert.ok(after.flags.includes("demo-01"));
  await page.getByRole("button", { name: "Submit Exam", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("timer").waitFor();
  await page.getByRole("button", { name: "Submit Exam", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm submission", exact: true })
    .click();
  await page.waitForURL("**/results?attempt=*");
  await page
    .getByRole("heading", { name: "Every attempt is a step forward." })
    .waitFor();
  assert.equal(await page.locator("tbody tr").count(), 20);
  const result = await (
    await page.request.get(base + "/api/attempts/" + attemptId)
  ).json();
  assert.equal(result.score, 2);
  assert.equal(result.status, "finalized");
  assert.equal(
    (
      await page.request.patch(base + "/api/attempts/" + attemptId, {
        data: { problem_id: "demo-01", answer: "A", flagged: false },
      })
    ).status(),
    409,
  );
  const again = await (
    await page.request.post(base + "/api/attempts/" + attemptId + "/finish", {
      data: {},
    })
  ).json();
  assert.equal(again.finalized_at, result.finalized_at);
  await page
    .getByRole("button", { name: "View solution", exact: true })
    .first()
    .click();
  await page.getByRole("heading", { name: "Mathematical Solution" }).waitFor();
  await page
    .getByRole("link", { name: "View your progress", exact: true })
    .click();
  await page.getByText("Best mock score", { exact: true }).waitFor();
  await page.goto(base + "/leaderboard");
  await page.getByText("Demonstration rankings", { exact: false }).waitFor();
  await page
    .getByRole("link", { name: "sample_integral", exact: true })
    .click();
  await page.getByText("SAMPLE PUBLIC PROFILE", { exact: true }).waitFor();
  for (const route of ["login", "signup", "forgot-password", "settings"]) {
    await page.goto(base + "/" + route);
    assert.ok(await page.locator("main").innerText());
  }
  await page.goto(base);
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  await page.reload();
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "light",
  );
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Problems", exact: true }).click();
  await page
    .getByRole("link", { name: "Nested Operations", exact: true })
    .waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: join(tmpdir(), "amatyc-v2-mobile.png"),
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: demo journey, public answer confidentiality, bookmarks, combined filters, practice/blank submission/retry, submission statistics, dashboard, server-timed exam saves/flags/refresh/finalization, immutable results, profiles, account pages, theme persistence, mobile layout; no browser errors.",
  );
} finally {
  await browser.close();
}
