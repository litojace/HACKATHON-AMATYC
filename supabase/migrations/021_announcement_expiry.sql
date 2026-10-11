begin;

create index announcements_created_at on public.announcements(created_at);

create function public.delete_expired_announcements() returns bigint
language plpgsql security definer set search_path='' as $$
declare deleted bigint;
begin
 delete from public.announcements where created_at <= statement_timestamp() - interval '30 seconds';
 get diagnostics deleted = row_count;
 return deleted;
end $$;
revoke all on function public.delete_expired_announcements() from public,anon,authenticated;

create or replace function public.user_announcements() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',unread.id,'message',unread.message,'created_at',unread.created_at) order by unread.created_at,unread.id),'[]'::jsonb)
 into result from (
  select a.id,a.message,a.created_at
  from public.announcement_recipients r join public.announcements a on a.id=r.announcement_id
  where r.user_id=auth.uid() and r.read_at is null
   and a.created_at > statement_timestamp() - interval '30 seconds'
  order by a.created_at,a.id limit 50
 ) unread;
 return result;
end $$;

select public.delete_expired_announcements();
commit;
