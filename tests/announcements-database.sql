begin;
reset role;
insert into auth.users(id,email,raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000000063','offline@example.test','{"username":"offline"}'),
 ('00000000-0000-4000-8000-000000000064','boundary@example.test','{"username":"boundary"}'),
 ('00000000-0000-4000-8000-000000000065','publisher@example.test','{"username":"publisher"}');
insert into public.site_admins(user_id) values('00000000-0000-4000-8000-000000000065');
delete from public.user_presence;
insert into public.user_presence(user_id,last_seen_at) values
 ('00000000-0000-4000-8000-000000000002',now()),
 ('00000000-0000-4000-8000-000000000063',now()-interval '3 minutes'),
 ('00000000-0000-4000-8000-000000000064',now()-interval '2 minutes');
update public.profiles set is_public=false where id='00000000-0000-4000-8000-000000000002';

set role authenticated;
select set_config('test.uid','00000000-0000-4000-8000-000000000002',true);
do $$ begin
 begin perform public.admin_post_announcement('Not authorized');raise exception 'Ordinary user posted an announcement';exception when insufficient_privilege then null;end;
 begin perform 1 from public.announcements;raise exception 'Direct announcement reads allowed';exception when insufficient_privilege then null;end;
 begin perform 1 from public.announcement_recipients;raise exception 'Direct recipient reads allowed';exception when insufficient_privilege then null;end;
 begin insert into public.announcements(message) values('Spoof');raise exception 'Direct announcement writes allowed';exception when insufficient_privilege then null;end;
 begin update public.announcement_recipients set read_at=now();raise exception 'Direct read-status writes allowed';exception when insufficient_privilege then null;end;
end $$;

select set_config('test.uid','00000000-0000-4000-8000-000000000065',true);
do $$ declare posted jsonb;begin
 begin perform public.admin_post_announcement(null);raise exception 'Null message accepted';exception when invalid_parameter_value then null;end;
 begin perform public.admin_post_announcement(E' \t\n ');raise exception 'Blank message accepted';exception when invalid_parameter_value then null;end;
 begin perform public.admin_post_announcement(repeat('x',2001));raise exception 'Oversized message accepted';exception when invalid_parameter_value then null;end;
 posted:=public.admin_post_announcement(E' \t A contest starts soon. \n ');
 if posted->>'message'<>'A contest starts soon.' or (posted->>'recipient_count')::integer<>2 or posted->>'created_at' is null then raise exception 'Posting did not trim text or snapshot online users plus sender';end if;
 perform set_config('test.announcement_id',posted->>'id',true);
 if jsonb_array_length(public.user_announcements())<>1 then raise exception 'Publishing administrator did not receive their announcement';end if;
end $$;

select set_config('test.uid','00000000-0000-4000-8000-000000000063',true);
do $$ begin
 if public.user_announcements()<>'[]'::jsonb then raise exception 'Offline user received announcement';end if;
 perform public.dismiss_announcement(current_setting('test.announcement_id')::uuid);
end $$;
select public.record_presence();
do $$ begin if public.user_announcements()<>'[]'::jsonb then raise exception 'Late arrival received an announcement from before their presence';end if;end $$;
select set_config('test.uid','00000000-0000-4000-8000-000000000064',true);
do $$ begin if public.user_announcements()<>'[]'::jsonb then raise exception 'Expired boundary user received announcement';end if;end $$;

select set_config('test.uid','00000000-0000-4000-8000-000000000002',true);
do $$ declare unread jsonb;begin
 unread:=public.user_announcements();
 if jsonb_array_length(unread)<>1 or unread->0->>'id'<>current_setting('test.announcement_id') or unread->0->>'message'<>'A contest starts soon.' then raise exception 'Online private-profile recipient did not receive announcement';end if;
 perform public.dismiss_announcement(current_setting('test.announcement_id')::uuid);
 perform public.dismiss_announcement(current_setting('test.announcement_id')::uuid);
 perform public.dismiss_announcement('ffffffff-ffff-4fff-8fff-ffffffffffff');
 if public.user_announcements()<>'[]'::jsonb then raise exception 'Dismissed notification remained unread';end if;
end $$;
reset role;
do $$ begin
 if (select read_at from public.announcement_recipients where announcement_id=current_setting('test.announcement_id')::uuid and user_id='00000000-0000-4000-8000-000000000065') is not null then raise exception 'Recipient dismissed another account notification';end if;
 if (select count(*) from public.announcements)<>1 then raise exception 'Invalid messages were persisted';end if;
end $$;

set role authenticated;
select set_config('test.uid','00000000-0000-4000-8000-000000000065',true);
do $$ declare posted jsonb;begin
 posted:=public.admin_post_announcement(repeat('é',2000));
 if char_length(posted->>'message')<>2000 or (posted->>'recipient_count')::integer<>3 then raise exception 'Valid Unicode message or updated recipient snapshot rejected';end if;
 perform set_config('test.maximum_announcement_id',posted->>'id',true);
end $$;
reset role;
insert into public.announcements(id,author_id,message,created_at)
select ('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'00000000-0000-4000-8000-000000000065','Queued '||n,now()+n*interval '1 second' from generate_series(1,55) n;
insert into public.announcement_recipients(announcement_id,user_id)
select id,'00000000-0000-4000-8000-000000000002' from public.announcements where message like 'Queued %';
set role authenticated;
select set_config('test.uid','00000000-0000-4000-8000-000000000002',true);
do $$ declare unread jsonb;begin
 unread:=public.user_announcements();
 if jsonb_array_length(unread)<>50 or unread->0->>'id'<>current_setting('test.maximum_announcement_id') or unread->49->>'message'<>'Queued 49' then raise exception 'Unread batching did not return the oldest 50 messages';end if;
 perform public.dismiss_announcement(current_setting('test.maximum_announcement_id')::uuid);
 unread:=public.user_announcements();
 if unread->0->>'message'<>'Queued 1' or unread->49->>'message'<>'Queued 50' then raise exception 'Dismissal did not advance unread batch';end if;
end $$;

select set_config('test.uid','',true);
do $$ begin
 begin perform public.admin_post_announcement('Missing session');raise exception 'Missing session posted announcement';exception when insufficient_privilege then null;end;
 begin perform public.user_announcements();raise exception 'Missing session read notifications';exception when insufficient_privilege then null;end;
 begin perform public.dismiss_announcement(current_setting('test.announcement_id')::uuid);raise exception 'Missing session dismissed notification';exception when insufficient_privilege then null;end;
end $$;
set role anon;
do $$ begin
 begin perform public.admin_post_announcement('Guest');raise exception 'Guest posted announcement';exception when insufficient_privilege then null;end;
 begin perform public.user_announcements();raise exception 'Guest read notifications';exception when insufficient_privilege then null;end;
 begin perform public.dismiss_announcement(current_setting('test.announcement_id')::uuid);raise exception 'Guest dismissed notification';exception when insufficient_privilege then null;end;
end $$;

reset role;
delete from auth.users where id='00000000-0000-4000-8000-000000000065';
do $$ begin
 if not exists(select 1 from public.announcements where id=current_setting('test.announcement_id')::uuid and author_id is null) then raise exception 'Deleting author discarded announcement history';end if;
 if exists(select 1 from public.announcement_recipients where user_id='00000000-0000-4000-8000-000000000065') then raise exception 'Deleted account retained receipts';end if;
end $$;
set role authenticated;
select set_config('test.uid','00000000-0000-4000-8000-000000000063',true);
do $$ begin
 if public.user_announcements()->0->>'id'<>current_setting('test.maximum_announcement_id') then raise exception 'Deleting author removed delivery to remaining recipients';end if;
end $$;
reset role;
rollback;
select 'PASS: admin announcements, online recipient snapshot, private unread delivery, dismissal, validation and author deletion';
