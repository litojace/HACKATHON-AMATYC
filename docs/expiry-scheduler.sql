-- Optional Supabase SQL editor step after enabling pg_cron in Extensions.
-- The owner runs this trusted function every minute. Deadline enforcement does
-- not depend on the job: saves are rejected after deadlines and reads finalize.
select cron.schedule('amatyc-finalize-expired','* * * * *',
  $$select public.finalize_expired_attempts();$$);
