# Daily Challenge

Users open `/daily` from the homepage, dashboard, or navigation. Each account receives one frozen five-question set per Pacific calendar day. The server chooses one warm-up, three near-level questions, and a gentle stretch, falling back to the nearest eligible fresh questions when a band is scarce. Questions must be published, answer-verified, multiple-choice, and use standard grading. They stay within 400 points below / 300 above the matching level. The matching level starts at 800 so users with a lower rating can still get starter questions and recover; their actual rating is preserved. Previously opened practice questions, questions from that user's mock attempts, and all earlier daily assignments are excluded.

Answers save individually to the database. Users can leave and resume during the same day. All five answers are required before submission. The rating changes are: 5 correct +20; 4 +12; 3 +3; 2 −2; 1 −5; 0 −8. Ratings stop at 1. Grading uses immutable answer-key snapshots, while the delta is applied to the current profile rating so an intervening administrator adjustment is retained. Results unlock the solutions and show the next title milestone. Completed daily challenges also count toward study streaks.

The daily reset is midnight **America/Los_Angeles**, including daylight-saving transitions. Yesterday's unfinished set closes without changing rating; its questions are not recycled for that user. Each new day's set is generated on demand, so no cron job or organizer-run event is needed. If fewer than five fresh questions remain near a user's level, starting fails without consuming the day; ordinary practice stays available.

## Production setup

Apply `supabase/migrations/025_daily_challenges.sql` in the Supabase SQL editor **after migrations 001–024**, then deploy the application. The migration adds private challenge snapshots, owner-checking RPCs, a daily source for rating history, guards against unlocking assigned solutions through overlapping practice/mock attempts, and daily cleanup in the existing administrator progress reset. It does not reset existing ratings or alter completed contest history.

The app uses the normal public anon key plus the signed-in user's bearer token. No service-role key belongs in the application. An installation missing the migration displays a setup message instead of creating fake challenge progress. This repository's local tests do not apply migrations to the live Supabase project.

## Verification

`npm test` covers rewards, title boundaries, request validation, and daily dashboard activity. `npm run test:db` applies the full migration chain to an isolated PostgreSQL container and checks all reward tiers, snapshot privacy, saved progress, frozen keys, expired challenges, no rerolls/repeats, ownership, rating floors, profile deletion, administrator reset, and simultaneous start/finish requests. A repeated or concurrent finish must produce exactly one rating-history row and one rating change.

Regular practice remains unrated. Historical mock contests remain available. Daily challenges replace the inactive Saturday-contest promotions, without requiring a weekly event.
