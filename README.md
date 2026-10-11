# AMATYC Arena

**Practice Smarter. Compete Stronger.** A working mathematics competition learning platform built with Next.js 16, React 19, strict TypeScript, Tailwind 4, KaTeX, Recharts, Zod, and Supabase. Independent educational project; no affiliation with AMATYC or Codeforces is claimed.

## Run on your computer

Install Node.js **22.13+** (or current Node 24 LTS), extract the project, and open a terminal inside `HACKATHON-AMATYC-`:

```sh
npm ci
npm run dev
```

Open http://localhost:3000 in your local browser. Stop with Ctrl+C. Browsing is public; solving problems and taking contests requires a signed-in Supabase account. Each cloud task already has an isolated checkout; use it rather than creating a Git worktree.

For a production server:

```sh
npm run build
npm start
```

On Linux/macOS, `PORT=3001 npm start` selects another port. On Windows PowerShell, use `$env:PORT="3001"; npm start`. `npm start` uses a portable Node launcher, binds all interfaces, and serves the standalone build with its copied public/static assets.

## Features and routes

- `/`: independent logo, real or explicitly labeled demo statistics, functional practice/contest links.
- `/problems`: title/keyword search, topic, difficulty, rating range, source, solved status, bookmarks, sorting, pagination, URL-shareable combined filters.
- `/problems/[id]`: centered math arena, A–E selection, blank submission, retry, scoring, mathematical solutions, submission statistics, diagram zoom, keyboard help.
- `/contests`: configured contest cards, completion and best scores.
- `/contests/[id]`: rules, configurable duration/scoring, start/resume.
- `/contests/[id]/take`: server deadline, automatic answer saves, flags, navigation, answered/blank counts, confirmation, refresh recovery, immutable finalization.
- `/contests/[id]/results`: score, answer counts, accuracy, elapsed time, charts, topic analysis, full solution review when permitted.
- `/dashboard`: private authenticated analytics in configured mode; actual browser-local demo activity otherwise. Ratings, solved status, accuracy, activity/difficulty/topic charts, recent attempts, and clearly explained rule-based recommendations.
- `/leaderboard`: public stored profiles (or explicitly sample profiles in demo), search, schools, pagination, ties, current-user ranking, deltas, profile links.
- `/profile/[username]`: public profile and rating history; private practice/exam answers are excluded.
- `/settings`: display name, school, HTTPS avatar URL, profile visibility. Header theme toggle persists dark/light preference.
- `/login`, `/signup`, `/forgot-password`, `/reset-password`: Supabase email/password auth and recovery; demo explains account setup instead of faking an account.
- `/api/health`: deployment readiness endpoint.

Legacy `/contest` and `/auth` redirect to the new routes. Loading, error, not-found, empty, and toast states are included. Keyboard shortcuts pause in fields/dialogs; modal dialogs trap focus and support Escape. Reduced motion is respected. Charts include accessible data lists.

## Public browsing and configured accounts

Admins can manage homepage carousel images at `/admin/carousel`: upload/replace images, edit captions and descriptions, choose image fit, reorder and remove slides, then save to publish. Apply migration 010 and grant the intended account admin access as described in `docs/carousel-admin.md`.

Leave both public Supabase settings empty to browse the bundled library: 820 historical questions from 41 exams (2004–2025). Original exam images preserve formulas and diagrams; OCR transcripts are used for search. Answers and solutions remain server-only. See `docs/historical-library.md` for coverage and editorial status.

Practice and contests require a signed-in Supabase user. Guest submissions, practice session starts, explanations, contest starts, answer saves and finalization are rejected by the API. Without Supabase configured, the library is available for browsing but no guest demo attempts can be created. Existing local demonstration history is not a verified account record.

Both public Supabase settings must be provided before building. Incomplete settings and database failures show service errors rather than substituting demonstration activity. Service-role credentials are never used by the browser or ordinary web API. Google accounts and email/password accounts use the same profile and private attempt storage.

## Supabase setup

For a new installation use a fresh Supabase project. Existing v2 installations apply missing migrations through 010, then rerun the seed. Migration 006 adds public practice submission counts. Migration 004 resets only unused default-1500 profiles without rating history to 800. The old `supabase/schema.sql` and `hardening.sql` describe the v1 schema and are retained only as history; **do not run them for v2**. The new migration explicitly rejects the legacy answer-in-problems schema to prevent accidental data loss. Existing users/data need a separately reviewed migration; no automatic table deletion is performed.

1. Run these migrations in order in the SQL editor:
   - `supabase/migrations/001_platform.sql`
   - `supabase/migrations/002_import.sql`
   - `supabase/migrations/003_practice_review.sql`
   - `supabase/migrations/004_initial_rating.sql`
   - `supabase/migrations/005_historical_formats.sql`
   - `supabase/migrations/006_problem_submission_stats.sql`
   - `supabase/migrations/007_profile_avatars.sql`
   - `supabase/migrations/008_avatar_upload_limit.sql`
   - `supabase/migrations/009_remove_demonstration_set.sql`
   - `supabase/migrations/010_home_carousel.sql`
   - `supabase/migrations/011_admin_problems.sql`
   - `supabase/migrations/012_admin_problem_delete.sql`
   - `supabase/migrations/013_delete_problems_preserve_history.sql`
   - `supabase/migrations/014_admin_contests.sql`
2. Copy `.env.example` to `.env.local` and set the project URL and public anon key. Keep any service-role key in a trusted shell only.
3. Enable email authentication. Set the Site URL to your actual application domain and add your local/deployed `/login` and `/reset-password` URLs to the redirect allowlist. Supabase's implicit browser auth flow restores sessions from confirmation/recovery links. Configure email delivery/rate limits before a public launch.
4. Export `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in an organizer-only shell, then run `npm run seed`. The seed validates all 840 records, imports them in transactional batches, and upserts 42 unrated contests. It also refreshes reviewed difficulty metadata and detailed explanations on existing records when their answer keys match. Scripts do not automatically load `.env.local`. Repeated seed/import commands skip immutable published problems.
5. Restart/rebuild after changing public settings. Register, confirm email, sign in, submit a problem, run an exam, and check the private dashboard against your real project.
6. Enable `pg_cron` in the Supabase dashboard and execute `docs/expiry-scheduler.sql` to finalize expired attempts unattended every minute. Deadlines are enforced regardless of the job: late writes are always rejected, and read/finalize requests finalize expired attempts with their actual deadline timestamp. Monitor this scheduled job in production.

The `problem-images` Storage bucket is public, supports PNG/JPEG/WebP up to 5 MB, and has no client upload policy. Trusted organizers upload via dashboard/service-role. **Do not upload unreleased rated-event diagrams to a public bucket**; use private storage/signed asset delivery before enabling restricted diagram events. The demo semicircle is an original local SVG. Multiple figure records and private signed diagram delivery are extension points, not implemented claims.

Google OAuth and email/password sign-in are supported. Enable the Google provider in the shared Supabase project; see `docs/google-login.md` for callback URLs and setup. Practice and contests require authentication, including when browsing the bundled library without Supabase configuration.

## Backend architecture and security

`app/api/[...path]/route.ts` dispatches validated operations. Zod validates answers, request IDs, profile edits, and imports. The API validates bearer sessions with Supabase `getUser()`; the database also validates `auth.uid()`. Normal operations use the public anon key and the authenticated user's bearer token, not the service role. There is a consistent `{error:{message}}` response format.

Normalized tables include profiles, schools, topics, problems/options/private solutions, problem-topic mapping, contests/problems, attempts/answers, practice sessions/attempts, bookmarks, and rating history. UTC server timestamps are rendered in the user's local timezone.

Public APIs return explicit public projections, never complete import records. Private helper RPCs have no anon/authenticated execute grants. SECURITY DEFINER functions pin an empty search path and check ownership. Direct client grade, score, rating, completion, answer-key, and verification writes are denied. Practice start creates a server timestamp; grading does not trust client score or elapsed-time values. Practice request IDs make retries idempotent. Contest answer saves and finalization lock the attempt; finalized/late answers are rejected. Rated-event solutions are withheld until `review_at`. Active unreleased rated questions are excluded from ordinary practice.

API mutations check request origin and use a per-instance limiter (60/minute per token/demo identity/IP). Database practice starts serialize per profile and enforce 30/minute. **Before public deployment**, configure a shared deployment-layer rate limiter/WAF for submission and auth endpoints; the in-process limiter is not a distributed abuse-control guarantee. Requests without a browser Origin still require their normal bearer/ownership checks; demo cookies are SameSite Strict. Apply appropriate privacy notices and an operational retention policy for real student data.

Settings supports PNG, JPEG, and WebP avatar uploads up to 10 MB to the public `avatars` bucket. Storage rules restrict uploads and deletion to each account’s own folder. Signup uses a display name; internal unique handles preserve public profile routes. Full profile deletion and an admin content-review UI are not implemented; privileged operations use documented trusted tooling.

## Practice scores and rating policy

Default AMATYC-style scores are +2 correct, −0.5 wrong, and 0 blank. A 20-question default exam ranges from −10 to 40. Contest duration, count, and point values are stored independently.

**AMATYC Arena Rating — Beta** implements the specified seed/geometric-rank/performance-search/raw-delta/population-shift variant. It is not the official full Codeforces algorithm: top-participant correction and official new-participant handling are not independently verified. Ties receive shared last-place rank in the provisional module. New users start at 800 and receive no special adjustment; tiny/empty fields are tested, with singletons unchanged. The shift is not strictly zero-sum; floor clamping can change total deltas.

Codeforces rank thresholds and colors (including Expert blue) are defined in `lib/rating.ts`. Migration 014 enables admin-created rated events with one attempt per competitor. The Supabase Cron job processes ratings 15 minutes after closing using the same provisional algorithm, with atomic profile/history updates and duplicate-batch protection. Historical mocks and practice never change ratings or rated participation counts. Clients cannot write ratings or execute rating batches. See [admin contest setup](docs/admin-contests.md) to enable the scheduler.

## Testing

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

With Docker available:

```sh
npm run test:db
```

This creates and removes an isolated PostgreSQL 17 container with minimal Supabase Auth/Storage fixtures. It checks answer confidentiality, grading authorization, profile/score/rating protections, unique requests/active attempts, saved answers and flags, server deadlines, finalization, cross-account isolation, and expiry sweeping. It does not simulate Supabase Auth email/OAuth/Storage HTTP services.

With the production server running and Supabase settings empty:

```sh
npx playwright install chromium
npm run smoke
node tests/historical-browser.mjs
```

Or use system Chromium: `BROWSER_EXECUTABLE=/usr/bin/chromium npm run smoke`. `TEST_BASE_URL` selects another server/port. Browser smoke tests verify public browsing, guest API rejection, login gates, return links, callback failures, theme persistence and mobile navigation. Historical browser tests check source assets and authentication requirements. Live signup/login/recovery tests need a real configured project and are not claimed as passed without one.

## Dataset imports

The supplied QUESTIONS.zip and KEYS.zip have been imported. Source archives stay outside the public application; extracted statement images and reviewed private records are bundled. See `docs/historical-library.md` and `docs/import-review.md` for provenance and reproduction. There is no general automatic verified math-PDF parser.

```sh
npm run import:json -- /path/reviewed.json --validate-only
npm run import:json -- /path/reviewed.json
npm run import:json -- /path/reviewed.json --publish
```

Imports default to drafts. Publication requires a source image matched to a verified official key, or a fully verified worked solution. Missing editorials stay explicitly unavailable. Published records are immutable through the importer; revised content needs a new ID. Historical content uses the supplied original statements and official keys.

## Deployment

### Vercel

Import the GitHub repository using the standard Next.js preset and Node 22.13+ or 24. Set public Supabase settings before building and the optional demo key if demo sessions must survive instances. Redeploy after changing public settings. Apply database migrations, seed reviewed content, configure auth redirects, expiry scheduling, and production rate limits. No service-role key is needed by the web application.

### Render

Use `render.yaml`, or a Node web service with build `npm ci && npm run build`, start `npm start`, and health check `/api/health`. Render supplies `PORT`; the server binds `0.0.0.0`. Configure settings before the build. Persist real data in Supabase, never the service filesystem.

### Docker

```sh
docker build -t amatyc-code .
docker run --rm -p 3000:3000 amatyc-code
```

Build args `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` embed public settings. `DEMO_SESSION_SECRET` is a runtime server-only environment variable. The Node 22 Alpine multi-stage image uses a non-root runner. For a TLS-inspecting proxy, supply a trusted CA with BuildKit `--secret id=npm_ca,src=/path/to/ca.pem` plus the HTTP_PROXY/HTTPS_PROXY build arguments. DNS overrides may be required by a cloud BuildKit sandbox. Keep TLS verification enabled; CA build secrets are not retained in the image.

No GitHub push, Vercel/Render deployment, or cloud publication is performed automatically. Review and commit the files, then deploy using your own accounts. The pre-upgrade app is preserved as `AMATYC-Code-v1.zip` outside the checkout.

Migration 009 permanently removes the redundant Original Demonstration Set, its mock contest, and their associated activity. The seed now imports only the 820 historical questions and 42 historical contests. Demo source files remain as development fixtures.

Migration 011 enables admin problem creation and editing at `/admin/problems`, using the admin membership established by migration 010. See [admin editor setup](docs/admin-problems.md) for permissions, publication and revision rules.

Migration 014 adds scheduled admin contests, private question snapshots, participant monitoring and delayed rating batches. Run `supabase/contest_scheduler.sql` to enable the background job. See [admin contest setup](docs/admin-contests.md).

Administrators can use `/admin/users` (Manage user ratings on their own public profile) to adjust any account’s rating, including their own. Apply `015_admin_user_ratings.sql` after the existing migrations. A reason is required; changes are recorded in the private `user_rating_admin_audit` table and do not count as rated contests.

Admins can post a text announcement from their own profile. Signed-in users who are online when it is posted receive a dismissible notice on every page, including contests. Apply migrations 016 and 017; see [announcement setup](docs/announcements.md). Unread notices stay available after a refresh, and dismissing one persists across tabs and devices.
