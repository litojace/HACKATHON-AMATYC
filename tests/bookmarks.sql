begin;
-- Match production's SELECT/INSERT/DELETE grants, even if the fixture grants more.
revoke update on public.bookmarks from authenticated;
select set_config('test.bookmark_problem',(select id from public.problems limit 1),true);
set role authenticated;
select set_config('test.uid','00000000-0000-4000-8000-000000000001',true);
do $$ begin
 begin
  insert into public.bookmarks(user_id,problem_id)
  values(auth.uid(),current_setting('test.bookmark_problem'))
  on conflict(user_id,problem_id) do update set problem_id=excluded.problem_id;
  raise exception 'Merge upsert unexpectedly succeeded without UPDATE permission';
 exception when insufficient_privilege then null;
 end;
 insert into public.bookmarks(user_id,problem_id)
 values(auth.uid(),current_setting('test.bookmark_problem'))
 on conflict(user_id,problem_id) do nothing;
 insert into public.bookmarks(user_id,problem_id)
 values(auth.uid(),current_setting('test.bookmark_problem'))
 on conflict(user_id,problem_id) do nothing;
 if (select count(*) from public.bookmarks where user_id=auth.uid() and problem_id=current_setting('test.bookmark_problem'))<>1 then
  raise exception 'Save or repeated save failed';
 end if;
 begin
  insert into public.bookmarks(user_id,problem_id)
  values('00000000-0000-4000-8000-000000000002',current_setting('test.bookmark_problem'));
  raise exception 'Another user bookmark insert accepted';
 exception when insufficient_privilege then null;
 end;
 delete from public.bookmarks where user_id=auth.uid() and problem_id=current_setting('test.bookmark_problem');
 if exists(select 1 from public.bookmarks where user_id=auth.uid() and problem_id=current_setting('test.bookmark_problem')) then
  raise exception 'Unsave failed';
 end if;
end $$;
reset role;
rollback;
select 'PASS: bookmark permission regression, repeated save, unsave and ownership enforcement';
