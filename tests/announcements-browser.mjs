import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
const env = await readFile(".env.local", "utf8").catch(() => "");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^\s"']+)/m)?.[1];
if (!url) throw new Error("This mocked announcement UI test requires Supabase configuration. No real sign-in or database writes are performed.");

const users = {
  admin: { id: "00000000-0000-4000-8000-000000000001", username: "admin", full_name: "Test Admin" },
  learner: { id: "00000000-0000-4000-8000-000000000002", username: "learner", full_name: "Test Learner" },
};
const announcement = {
  id: "00000000-0000-4000-8000-000000000101",
  message: "Contest starts soon.\n<strong>Bring a calculator.</strong>",
  created_at: new Date().toISOString(),
};
const authKey = "sb-" + new URL(url).hostname.split(".")[0] + "-auth-token";
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, headless: true });
const errors = [];
const artifactDir = join(tmpdir(), "amatyc-announcements-ui");
await mkdir(artifactDir, { recursive: true });

async function createMock(role) {
  const identity = users[role];
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const state = { unread: [], feedCalls: 0, posts: [], dismissals: [], failDismiss: false, adminChecks: 0 };
  if (identity) {
    const user = { ...identity, aud: "authenticated", role: "authenticated", email: role + "@example.test", app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
    const jwt = [{ alg: "HS256", typ: "JWT" }, { sub: user.id, aud: "authenticated", role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 }].map(value => Buffer.from(JSON.stringify(value)).toString("base64url")).join(".") + ".mock";
    await context.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), {
      key: authKey,
      session: { access_token: jwt, refresh_token: "mock-refresh", expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: "bearer", user },
    });
  }
  await context.route(new URL(url).origin + "/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/user_announcements")) {
      state.feedCalls++;
      return route.fulfill({ json: state.unread });
    }
    if (path.endsWith("/admin_post_announcement")) {
      const data = route.request().postDataJSON();
      state.posts.push(data);
      return route.fulfill({ json: { ...announcement, message: data.p_message, recipient_count: 3 } });
    }
    if (path.endsWith("/dismiss_announcement")) {
      const data = route.request().postDataJSON();
      state.dismissals.push(data);
      if (state.failDismiss) {
        state.failDismiss = false;
        return route.fulfill({ status: 503, json: { message: "Unable to dismiss announcement. Please try again." } });
      }
      state.unread = state.unread.filter(item => item.id !== data.p_id);
      return route.fulfill({ json: null });
    }
    if (path.endsWith("/is_site_admin")) {
      state.adminChecks++;
      return route.fulfill({ json: role === "admin" });
    }
    if (path.endsWith("/record_presence")) return route.fulfill({ json: null });
    if (path.includes("/auth/")) return route.fulfill({ json: identity ?? null });
    return route.fulfill({ status: 404, json: { message: "Unexpected mocked backend request." } });
  });
  await context.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname.slice(5);
    const profile = value => ({ ...value, avatar_url: null, school: null, rating: 800, contests_attended: 0, is_public: true, created_at: new Date().toISOString(), rating_history: [] });
    if (path.startsWith("profile/")) return route.fulfill({ json: profile(users[path.slice(8)] ?? users.learner) });
    if (path === "me") return route.fulfill({ json: profile(identity ?? users.learner) });
    if (path === "activity") return route.fulfill({ json: { practice: [], contests: [], ratings: [], bookmarks: [] } });
    if (path === "carousel") return route.fulfill({ json: [{ src: "/images/community/team.png", label: "Team", alt: "Team", fit: "cover", duration_seconds: 3 }] });
    return route.fulfill({ json: [] });
  });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  return { context, page, state };
}

try {
  const admin = await createMock("admin");
  const { page, state } = admin;
  await page.goto(base + "/profile/admin");
  await page.getByRole("heading", { name: "Post an announcement", exact: true }).waitFor();
  const input = page.getByLabel("Announcement", { exact: true });
  const post = page.getByRole("button", { name: "Post announcement", exact: true });
  assert.equal(await post.isDisabled(), true);
  await input.fill("   \n  ");
  assert.equal(await post.isDisabled(), true);
  assert.equal(await input.getAttribute("maxlength"), "2000");
  await input.fill(announcement.message);
  await post.click();
  await page.getByText("Announcement sent to 3 online users.", { exact: true }).waitFor();
  assert.deepEqual(state.posts, [{ p_message: announcement.message }]);

  // A message published after the initial empty feed appears on the next poll.
  await page.waitForFunction(() => document.readyState === "complete");
  assert.ok(state.feedCalls > 0);
  state.unread = [announcement];
  const feed = page.getByLabel("Announcements", { exact: true });
  await feed.getByText(announcement.message, { exact: true }).waitFor({ timeout: 9000 });
  assert.equal(await feed.locator("strong").count(), 0, "Announcement markup must remain literal text.");
  assert.ok(await feed.getByText(announcement.message, { exact: true }).evaluate(el => getComputedStyle(el).whiteSpace.startsWith("pre")), "Multiline text keeps its line breaks.");
  await page.screenshot({ path: join(artifactDir, "admin-announcements-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.screenshot({ path: join(artifactDir, "admin-announcements-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  const retainedMessage = await feed.getByText(announcement.message, { exact: true }).elementHandle();
  await page.getByRole("link", { name: "Problems", exact: true }).first().click();
  await page.getByRole("heading", { name: "Find your next breakthrough.", exact: true }).waitFor();
  assert.ok(await retainedMessage.evaluate(el => el.isConnected), "Navigation must keep the notification visible.");

  state.failDismiss = true;
  const close = page.getByRole("button", { name: "Dismiss announcement", exact: true });
  await close.click();
  await page.getByText("Could not dismiss the announcement. Please try again.", { exact: true }).waitFor();
  assert.equal(state.dismissals.length, 1);
  assert.equal(await feed.getByText(announcement.message, { exact: true }).isVisible(), true);
  await close.click();
  await feed.getByText(announcement.message, { exact: true }).waitFor({ state: "detached" });
  assert.deepEqual(state.dismissals, [{ p_id: announcement.id }, { p_id: announcement.id }]);
  const previousFeedCalls = state.feedCalls;
  await page.reload();
  await page.getByRole("heading", { name: "Find your next breakthrough.", exact: true }).waitFor();
  await page.waitForTimeout(500);
  assert.ok(state.feedCalls > previousFeedCalls);
  assert.equal(await page.getByText(announcement.message, { exact: true }).count(), 0);
  const visibleFeedCalls = state.feedCalls;
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(5500);
  assert.equal(state.feedCalls, visibleFeedCalls, "Hidden tabs do not poll the announcement feed.");
  const resumed = page.waitForResponse(response => response.url().endsWith("/user_announcements"));
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await resumed;
  assert.ok(state.feedCalls > visibleFeedCalls, "Returning to the tab refreshes the feed immediately.");

  await page.goto(base + "/profile/learner");
  await page.getByRole("heading", { name: "Test Learner", exact: true }).waitFor();
  await page.waitForTimeout(500);
  assert.equal(await page.getByRole("heading", { name: "Post an announcement", exact: true }).count(), 0);
  await admin.context.close();

  const learner = await createMock("learner");
  learner.state.unread = [announcement];
  await learner.page.goto(base + "/profile/learner");
  await learner.page.getByLabel("Announcements", { exact: true }).getByText(announcement.message, { exact: true }).waitFor();
  await learner.page.getByRole("heading", { name: "Test Learner", exact: true }).waitFor();
  await learner.page.waitForTimeout(500);
  assert.equal(await learner.page.getByRole("heading", { name: "Post an announcement", exact: true }).count(), 0);
  assert.equal(learner.state.posts.length, 0);
  await learner.page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await learner.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  const mobileBounds = await learner.page.getByLabel("Announcements", { exact: true }).boundingBox();
  assert.ok(mobileBounds && mobileBounds.x >= 0 && mobileBounds.x + mobileBounds.width <= 390, "Notifications fit the mobile viewport.");
  await learner.page.getByRole("button", { name: "Dismiss announcement", exact: true }).click();
  await learner.page.getByText(announcement.message, { exact: true }).waitFor({ state: "detached" });
  assert.deepEqual(learner.state.dismissals, [{ p_id: announcement.id }]);
  await learner.context.close();

  const guest = await createMock("guest");
  await guest.page.goto(base + "/profile/admin");
  await guest.page.getByRole("heading", { name: "Test Admin", exact: true }).waitFor();
  await guest.page.waitForTimeout(5500);
  assert.equal(guest.state.feedCalls, 0, "Guests do not poll the private announcement feed.");
  assert.equal(await guest.page.getByRole("heading", { name: "Post an announcement", exact: true }).count(), 0);
  assert.equal(await guest.page.getByRole("button", { name: "Dismiss announcement", exact: true }).count(), 0);
  await guest.context.close();
  assert.deepEqual(errors, []);
  console.log("PASS: admin announcement composer, online recipient count, literal multiline messages, visible-tab polling, navigation, dismissal/retry/persistence, role visibility and mobile layout; no live database writes.");
  console.log("Screenshots:", join(artifactDir, "admin-announcements-desktop.png"), join(artifactDir, "admin-announcements-mobile.png"));
} finally {
  await browser.close();
}
