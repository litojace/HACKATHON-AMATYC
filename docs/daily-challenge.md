# Daily Challenge

Each account receives one frozen **10-question set per Pacific calendar day**, with **up to 40 minutes** from starting. The server chooses two warm-ups, six near-level questions and two gentle stretches, falling back to nearby eligible questions when a band is scarce. Questions must be published, answer-verified, multiple-choice and use standard grading. They stay within 400 points below / 300 above the matching level. Matching starts at 800 so lower-rated users can recover; their actual rating is preserved. Previously opened practice questions, questions from the user's mock attempts, and earlier daily assignments are excluded.

Answers save individually. Users can resume on another device without rerolling questions or extending the deadline. All ten answers are required to submit early. When time expires, saved answers are graded and blanks count as incorrect. The open page requests grading automatically at zero; if the browser is closed or offline, the next authenticated daily-status/start/save/finish request settles the expired set, including after the date changes. Late answers are rejected from the grade. No background scheduler is needed.

| Correct | Rating change |
| --- | --- |
| 10 | +40 |
| 9 | +32 |
| 8 | +24 |
| 7 | +15 |
| 6 | +6 |
| 5 | 0 |
| 4 | −2 |
| 3 | −3 |
| 2 | −5 |
| 1 | −6 |
| 0 | −8 |

Ratings stop at 1. Grading uses immutable answer-key snapshots, while the change applies to the current profile rating so intervening administrator adjustments are retained. Finishing, retrying or timing out awards exactly one rating update. Results unlock solutions and show the next title milestone. Completed challenges also count toward study streaks.

The daily reset is midnight **America/Los_Angeles**, including daylight-saving transitions. A set started less than 40 minutes before reset closes at that midnight. The deadline is set by the database; changing the device clock or refreshing cannot extend it. The client countdown uses server time and resynchronizes when returning to the tab. If fewer than ten fresh eligible questions remain near the matching level, starting fails without consuming the day.

## Existing five-question sets

Migration 026 preserves all existing question IDs, answer snapshots, saved answers, ratings and completed results. An already-started five-question set remains untimed until its original midnight reset. Its rewards stay +20 / +12 / +3 / −2 / −5 / −8 for 5 through 0 correct. An unfinished legacy set closes without a rating change. New sets use the ten-question timed rules.

## Production setup

Apply `supabase/migrations/025_daily_challenges.sql` after migrations 001–024 if missing, then **`supabase/migrations/026_timed_daily_challenges.sql`**, before deploying the updated app. Migration 026 adds deadlines and timeout grading, replaces owner-checking RPCs and extends private snapshot constraints. It does not reset user progress or contest history. Do not rerun migrations already applied.

The app uses the public anon key and the signed-in user's bearer token. No service-role key belongs in the application. Starting uses the new `start_timed_daily_challenge` RPC: missing migration 026 displays a setup message instead of silently starting a five-question set. The repository's local tests do not apply migrations to live Supabase.

## Verification

`npm test` covers reward tables, title boundaries, request validation and daily dashboard activity. `npm run test:db` applies the entire migration chain to isolated PostgreSQL. It verifies legacy sets created before 026, all eleven new reward tiers, deadlines, timeout and blank grading, late saves, rollover, snapshot privacy, frozen keys, ownership, rating floors, and concurrent start/finish requests. Repeated or concurrent grading must produce exactly one history row and one rating change.

Regular practice remains unrated. Historical mock contests remain available. Daily challenges replace inactive Saturday-contest promotions without requiring an organizer-run event.
