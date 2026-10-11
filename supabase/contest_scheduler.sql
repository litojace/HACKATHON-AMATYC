-- Run once as project owner in Supabase SQL Editor after migration 014.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('amatyc-contest-ratings','* * * * *','select public.process_due_contest_ratings();');
