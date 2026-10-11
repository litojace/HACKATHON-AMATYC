begin;
reset role;
insert into public.announcements(id,message,created_at)
select ('00000000-0000-4000-9000-'||lpad(n::text,12,'0'))::uuid,'Update '||n,now()+make_interval(secs=>n)
from generate_series(1,22) n;
insert into public.announcement_recipients(announcement_id,user_id,read_at)
select id,'00000000-0000-4000-8000-000000000002',now()
from public.announcements where message like 'Update %';
select public.delete_expired_announcements();
do $$ begin
 if (select count(*) from public.announcements where message like 'Update %')<>22 then raise exception 'Archive cleanup deleted history'; end if;
end $$;
set role authenticated;
select set_config('test.uid','00000000-0000-4000-8000-000000000002',true);
do $$ declare page jsonb; begin
 page:=public.announcement_history(0);
 if jsonb_array_length(page->'items')<>20 or not (page->>'has_more')::boolean then raise exception 'Archive pagination failed'; end if;
 if page->'items'->0->>'message'<>'Update 22' then raise exception 'Newest-first order failed'; end if;
 if jsonb_array_length(public.announcement_history(1)->'items')<>2 then raise exception 'Older page failed'; end if;
 if public.user_announcements()<>'[]'::jsonb then raise exception 'History altered dismissed state'; end if;
 begin perform public.announcement_history(-1); raise exception 'Invalid page accepted'; exception when invalid_parameter_value then null; end;
end $$;
select set_config('test.uid','00000000-0000-4000-8000-000000000001',true);
do $$ begin
 if public.announcement_history(0)->'items'<>'[]'::jsonb then raise exception 'Another user could read recipient history'; end if;
end $$;
reset role;
set role anon;
do $$ begin
 begin perform public.announcement_history(0);raise exception 'Anonymous history access allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'PASS: archive includes dismissed messages, newest-first pagination, recipient isolation and anonymous denial';
