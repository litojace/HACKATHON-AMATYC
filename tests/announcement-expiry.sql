begin;
reset role;
insert into public.announcements(id,message,created_at) values
 ('00000000-0000-4000-8000-000000000201','Expired',statement_timestamp()-interval '31 seconds'),
 ('00000000-0000-4000-8000-000000000202','Current',statement_timestamp());
insert into public.announcement_recipients(announcement_id,user_id)
select id,'00000000-0000-4000-8000-000000000002'::uuid from public.announcements
where id in ('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000202');
set role authenticated;
select set_config('test.uid','00000000-0000-4000-8000-000000000002',true);
do $$ begin
 if public.user_announcements()::text like '%Expired%' then raise exception 'Expired announcement returned'; end if;
 begin perform public.delete_expired_announcements(); raise exception 'User can delete announcements globally'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select public.delete_expired_announcements();
do $$ begin
 if exists(select 1 from public.announcements where id='00000000-0000-4000-8000-000000000201') then raise exception 'Expired announcement retained'; end if;
 if exists(select 1 from public.announcement_recipients where announcement_id='00000000-0000-4000-8000-000000000201') then raise exception 'Expired receipts retained'; end if;
 if not exists(select 1 from public.announcements where id='00000000-0000-4000-8000-000000000202') then raise exception 'Current announcement deleted'; end if;
end $$;
rollback;
