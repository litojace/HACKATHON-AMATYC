-- Run as project owner in Supabase SQL Editor after migration 021.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule(
 'amatyc-announcement-expiry',
 '1 second',
 'select public.delete_expired_announcements();'
);
