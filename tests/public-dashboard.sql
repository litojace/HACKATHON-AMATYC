begin;
reset role;
update public.profiles set is_public=true where id='00000000-0000-4000-8000-000000000002';
select set_config('test.dashboard_username',username,true) from public.profiles where id='00000000-0000-4000-8000-000000000002';
set role anon;
do $$ declare data jsonb; begin
 data:=public.public_dashboard(current_setting('test.dashboard_username'));
 if data is null then raise exception 'Public dashboard not readable by guest'; end if;
 if public.public_dashboard('nonexistent-dashboard-user') is not null then raise exception 'Missing profile exposed'; end if;
end $$;
reset role;
do $$ declare data jsonb; name text; begin
 select username into name from public.profiles where id='00000000-0000-4000-8000-000000000002';
 data:=public.public_dashboard(name);
 if data is null or jsonb_typeof(data->'practice')<>'array' or jsonb_typeof(data->'contests')<>'array' then raise exception 'Dashboard shape invalid'; end if;
 if data::text like '%selected_answer%' or data::text like '%correct_answer%' or data::text like '%bookmarks%' or data::text like '%written_solution%' then raise exception 'Private fields exposed'; end if;
 if jsonb_array_length(data->'practice')<>(select count(*) from public.practice_attempts where user_id='00000000-0000-4000-8000-000000000002') then raise exception 'Wrong competitor activity'; end if;
 update public.profiles set is_public=false where username=name;
 perform set_config('test.uid','',true);
 if public.public_dashboard(name) is not null then raise exception 'Private dashboard exposed'; end if;
end $$;
rollback;
