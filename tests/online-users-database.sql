begin;
set role authenticated;
select set_config('test.uid','00000000-0000-4000-8000-000000000002',true);
select public.record_presence();
do $$ begin
 begin perform public.admin_online_users();raise exception 'Ordinary user read online users';exception when insufficient_privilege then null;end;
 begin update public.user_presence set last_seen_at=now();raise exception 'Direct presence spoofing allowed';exception when insufficient_privilege then null;end;
end $$;
select set_config('test.uid','00000000-0000-4000-8000-000000000001',true);
do $$ begin
 if jsonb_array_length(public.admin_online_users())<>1 or public.admin_online_users()->0->>'id'<>'00000000-0000-4000-8000-000000000002' then raise exception 'Admin cannot see active user';end if;
end $$;
reset role;
update public.user_presence set last_seen_at=now()-interval '3 minutes';
set role authenticated;
do $$ begin if jsonb_array_length(public.admin_online_users())<>0 then raise exception 'Expired users still online';end if;end $$;
set role anon;
do $$ begin
 begin perform public.record_presence();raise exception 'Guest heartbeat allowed';exception when insufficient_privilege then null;end;
 begin perform public.admin_online_users();raise exception 'Guest read presence';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'PASS: authenticated heartbeat, admin-only online list, spoofing protection and automatic expiry';
