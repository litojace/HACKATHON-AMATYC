# Admin contests

Run migration `014_admin_contests.sql` after 001–013 in the same Supabase project used by the application. Admin membership uses `site_admins` from migration 010.

Enable Supabase Cron and run `supabase/contest_scheduler.sql` as project owner in SQL Editor. This installs a named job that runs every minute, finalizes expired attempts and processes due ratings even when the website is closed. See [Supabase Cron installation](https://supabase.com/docs/guides/cron/install) and [quickstart](https://supabase.com/docs/guides/cron/quickstart). Migration 014 creates the job directly if Cron was already enabled. Running the scheduler script again updates the same named job.

Check its schedule and runs:

```sql
select jobname, schedule, command, active from cron.job
where jobname = 'amatyc-contest-ratings';
select status, return_message, start_time, end_time
from cron.job_run_details
where jobid in (select jobid from cron.job where jobname = 'amatyc-contest-ratings')
order by start_time desc limit 10;
```

Open **Profile → Manage contests → Create contest**, or `/admin/contests/new`. Presets are 5 questions/15 minutes, 10/30 or 20/60. Choose a future start and closing time; the event window must allow the full duration. Each user receives their own server deadline, capped by event closing, and one rated attempt.

Select existing problems, reorder them, or create new questions using the embedded problem editor. New questions can stay as private drafts but must have a reviewed solution or a verified original image and key before they can be added to a contest. Canceling contest creation leaves already saved source drafts in Manage problems. Contest questions are private snapshots; later source edits do not alter the competition. Reused questions may already be familiar to participants.

Save a private contest draft or publish immediately. Drafts can be published from their monitor before the start time. Once created, the schedule and question snapshots are fixed. Create another contest for revisions. Historical mocks retain their existing unrated behavior.

The monitor at `/admin/contests/[id]` refreshes every 10 seconds, showing competitor names, saved answer counts, flags, elapsed time and status. Finalized scores and rating changes appear as available. Other users cannot access this private progress data.

The exam displays one question at a time, Previous/Next, a scrollable question list at the right, and Submit contest on the last question. Choices save without revealing correctness or solutions. Short answers use a brief debounce; failed saves expose a retry button and block manual submission. Expired attempts are finalized using only server-saved answers. Submission asks for confirmation.

Solutions unlock and ratings become due **15 minutes after event closing**, not 15 minutes after each participant submits. The minute scheduler applies them within the next minute. The rating algorithm matches `lib/rating.ts`, ranks by score with shared ties and a floor of 1. Time is displayed but does not break rating ties. All rated participants receive a history entry and their event count increases; a single participant's rating stays unchanged. Event processing and all profile/history writes are one transaction with a lock and processed marker to prevent duplicate updates. No web client has permission to process rating batches.

Validation: `npm test`, `npm run test:db`, and `BROWSER_EXECUTABLE=... node tests/admin-contests-browser.mjs`. The browser suite mocks authentication and API responses and does not publish live contests. Database tests use isolated fixtures. Actual cloud Cron scheduling must be checked in the Supabase project after setup.
