begin;
-- Isolated fixture; all destructive checks roll back at the end.
insert into auth.users(id,email,raw_user_meta_data) values('00000000-0000-4000-8000-000000000077','delete-fixture@example.test','{}');
update public.profiles set username='delete-fixture',rating=1900,contests_attended=3 where id='00000000-0000-4000-8000-000000000077';
insert into public.bookmarks(user_id,problem_id) select '00000000-0000-4000-8000-000000000077',id from public.problems limit 1;
insert into public.problem_reports(problem_id,reporter_id,category,details) select id,'00000000-0000-4000-8000-000000000077','other','Deletion test' from public.problems limit 1;
insert into public.user_rating_admin_audit(user_id,admin_id,old_rating,new_rating,reason) values('00000000-0000-4000-8000-000000000077','00000000-0000-4000-8000-000000000001',800,1900,'Deletion fixture');
insert into public.problem_admin_audit(user_id,problem_id,action) select '00000000-0000-4000-8000-000000000077',id,'test' from public.problems limit 1;
insert into public.rating_history(user_id,contest_id,old_rating,new_rating,policy_version) select '00000000-0000-4000-8000-000000000077',id,800,1900,'test' from public.contests limit 1;
insert into public.practice_sessions(id,user_id,problem_id) select '00000000-0000-4000-8000-000000000078','00000000-0000-4000-8000-000000000077',id from public.problems limit 1;
insert into public.practice_attempts(id,user_id,problem_id,selected_answer,is_correct,score,time_spent_seconds) select id,user_id,problem_id,'A',true,1,1 from public.practice_sessions where id='00000000-0000-4000-8000-000000000078';
insert into public.contest_attempts(id,user_id,contest_id,deadline) select '00000000-0000-4000-8000-000000000079','00000000-0000-4000-8000-000000000077',id,now()+interval '1 hour' from public.contests limit 1;
insert into public.contest_answers(attempt_id,problem_id,selected_answer) select '00000000-0000-4000-8000-000000000079',id,'A' from public.problems limit 1;
set local role authenticated;
select set_config('test.uid','00000000-0000-4000-8000-000000000002',true);
do $$ begin
 begin perform public.admin_reset_data('progress','RESET PROGRESS','Test');raise exception 'Student reset data';exception when insufficient_privilege then null;end;
 begin perform public.admin_delete_user('00000000-0000-4000-8000-000000000077','DELETE delete-fixture','Test');raise exception 'Student deleted account';exception when insufficient_privilege then null;end;
end $$;
select set_config('test.uid','00000000-0000-4000-8000-000000000001',true);
do $$ begin
 begin perform public.admin_delete_user('00000000-0000-4000-8000-000000000077','WRONG','Test');raise exception 'Missing confirmation accepted';exception when invalid_parameter_value then null;end;
 begin perform public.admin_reset_data('progress',null,'Test');raise exception 'Null confirmation accepted';exception when invalid_parameter_value then null;end;
 begin perform public.admin_reset_data('community','CLEAR BOOKMARKS AND REPORTS',' ');raise exception 'Blank reason accepted';exception when invalid_parameter_value then null;end;
 begin perform public.admin_delete_user('00000000-0000-4000-8000-000000000001','DELETE self','Test');raise exception 'Admin deleted own account';exception when invalid_parameter_value then null;end;
 perform public.admin_delete_user('00000000-0000-4000-8000-000000000077','DELETE delete-fixture','Confirmed fixture deletion');
end $$;
reset role;
do $$ begin
 if exists(select 1 from auth.users where id='00000000-0000-4000-8000-000000000077') or exists(select 1 from public.profiles where id='00000000-0000-4000-8000-000000000077') then raise exception 'Auth/profile not deleted';end if;
 if exists(select 1 from public.practice_sessions where user_id='00000000-0000-4000-8000-000000000077') or exists(select 1 from public.practice_attempts where user_id='00000000-0000-4000-8000-000000000077') or exists(select 1 from public.contest_attempts where user_id='00000000-0000-4000-8000-000000000077') or exists(select 1 from public.contest_answers where attempt_id='00000000-0000-4000-8000-000000000079') then raise exception 'User attempts not deleted';end if;
 if exists(select 1 from public.rating_history where user_id='00000000-0000-4000-8000-000000000077') then raise exception 'Rating history retained';end if;
 if not exists(select 1 from public.user_rating_admin_audit where reason='Deletion fixture' and user_id is null) then raise exception 'Audit was not preserved';end if;
 if (select count(*) from public.admin_data_audit where action='delete_account')<>1 then raise exception 'Deletion not audited';end if;
end $$;
-- Ensure cleanup and progress reset are independent.
create temp table control_before as select (select count(*) from public.practice_attempts) attempts,(select count(*) from public.problems) problems,(select count(*) from auth.users) users;
insert into public.bookmarks(user_id,problem_id) select '00000000-0000-4000-8000-000000000002',id from public.problems limit 1 on conflict do nothing;
set local role authenticated;
select public.admin_reset_data('community','CLEAR BOOKMARKS AND REPORTS','Community cleanup test');
reset role;
do $$ begin
 if exists(select 1 from public.bookmarks) or exists(select 1 from public.problem_reports) then raise exception 'Community cleanup failed';end if;
 if (select count(*) from public.practice_attempts)<>(select attempts from control_before) then raise exception 'Cleanup erased progress';end if;
end $$;
insert into public.bookmarks(user_id,problem_id) select '00000000-0000-4000-8000-000000000002',id from public.problems limit 1;
-- Explicitly test active-rated-contest protection before allowing a reset.
update public.contests set kind='rated',rating_enabled=true,starts_at=now()-interval '1 hour',ends_at=now()+interval '1 hour',review_at=now()+interval '2 hours' where id=(select id from public.contests limit 1);
set local role authenticated;
do $$ begin
 begin perform public.admin_reset_data('progress','RESET PROGRESS','Must block');raise exception 'Active contest reset';exception when object_not_in_prerequisite_state then null;end;
end $$;
reset role;
update public.contests set ends_at=now()-interval '1 minute',starts_at=now()-interval '1 hour',review_at=now()+interval '15 minutes' where kind='rated';
set local role authenticated;
select public.admin_reset_data('progress','RESET PROGRESS','Confirmed progress reset');
reset role;
do $$ begin
 if exists(select 1 from public.practice_attempts) or exists(select 1 from public.practice_sessions) or exists(select 1 from public.contest_attempts) or exists(select 1 from public.contest_answers) or exists(select 1 from public.rating_history) then raise exception 'Progress not fully cleared';end if;
 if exists(select 1 from public.profiles where rating<>800 or contests_attended<>0) then raise exception 'Ranks not reset';end if;
 if not exists(select 1 from public.bookmarks) then raise exception 'Progress reset erased bookmarks';end if;
 if (select count(*) from public.problems)<>(select problems from control_before) or (select count(*) from auth.users)<>(select users from control_before) then raise exception 'Content/accounts were erased';end if;
 if exists(select 1 from public.contests where kind='rated' and ends_at<=now() and ratings_processed_at is null) then raise exception 'Closed event may reapply ratings';end if;
 if exists(select 1 from public.problems p where (public.problem_json(p.id)->>'attempt_count')::int<>0 or (public.problem_json(p.id)->>'accepted_count')::int<>0 or public.problem_json(p.id)->'acceptance_rate'<>'null'::jsonb) then raise exception 'Acceptance did not reset';end if;
end $$;
set local role anon;
do $$ begin
 begin perform public.admin_reset_data('progress','RESET PROGRESS','Guest');raise exception 'Guest reset';exception when insufficient_privilege then null;end;
 begin perform public.admin_delete_user('00000000-0000-4000-8000-000000000001','DELETE self','Guest');raise exception 'Guest deleted';exception when insufficient_privilege then null;end;
end $$;
rollback;
select 'PASS: admin-only reset/delete, typed confirmations, self protection, audit preservation, separate cleanup, active-contest guard, retained content and reset acceptance';
