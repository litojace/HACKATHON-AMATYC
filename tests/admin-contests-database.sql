reset role;
-- Keep this entire suite rollbackable so it can also run on a fixture database.
begin;
set role authenticated;
select set_config('test.uid','00000000-0000-4000-8000-000000000002',true);
do $$ begin
 begin perform public.admin_contest_records();raise exception 'Non-admin monitor access';exception when insufficient_privilege then null;end;
 begin perform public.admin_create_contest('{}');raise exception 'Non-admin create access';exception when insufficient_privilege then null;end;
 begin perform public.process_due_contest_ratings();raise exception 'User changed ratings';exception when insufficient_privilege then null;end;
end $$;
reset role;
update public.profiles set rating=800 where id in ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002');
select set_config('test.contest_sources',(select jsonb_agg(id)::text from (select id from public.problems where deleted_at is null and not contest_only and verification_status in ('fully_verified','answer_verified') order by id limit 20) p),true);
set role authenticated;
select set_config('test.uid','00000000-0000-4000-8000-000000000001',true);
do $$ declare input jsonb;c jsonb;ids jsonb;n integer;begin
 for n in select unnest(array[5,10,20]) loop
  select jsonb_agg(value) into ids from jsonb_array_elements(current_setting('test.contest_sources')::jsonb) with ordinality p(value,i) where i<=n;
  input:=jsonb_build_object('name','Test competition','description','','question_count',n,'starts_at',now()+interval '1 hour','ends_at',now()+interval '3 hours','published',n=5,'problem_ids',ids);
  c:=public.admin_create_contest(input);
  if (c->>'duration_seconds')::integer<>n*180 or (c->>'review_at')::timestamptz<>(c->>'ends_at')::timestamptz+interval '15 minutes' then raise exception 'Wrong preset or review delay';end if;
  if n=5 then perform set_config('test.contest_id',c->>'id',true);end if;
  if n=10 then perform public.admin_publish_contest(c->>'id');end if;
 end loop;
 begin perform public.admin_create_contest(input||'{"question_count":6}');raise exception 'Invalid preset allowed';exception when raise_exception then if sqlerrm not like 'Choose a future%' then raise;end if;end;
 begin perform public.admin_create_contest(input||jsonb_build_object('problem_ids',jsonb_build_array('same','same','same','same','same'),'question_count',5));raise exception 'Duplicate questions allowed';exception when raise_exception then if sqlerrm not like 'Choose the required%' then raise;end if;end;
end $$;
reset role;
do $$ begin
 if exists(select 1 from public.contest_problems cp where cp.contest_id=current_setting('test.contest_id') and cp.problem_id in (select jsonb_array_elements_text(current_setting('test.contest_sources')::jsonb))) then raise exception 'Source questions not copied';end if;
end $$;
update public.contests set starts_at=now()-interval '10 minutes',ends_at=now()+interval '5 minutes',review_at=now()+interval '20 minutes' where id=current_setting('test.contest_id');
set role authenticated;
select set_config('test.uid','00000000-0000-4000-8000-000000000001',true);
do $$ declare a jsonb;pid text;monitor jsonb;begin
 a:=public.start_contest(current_setting('test.contest_id'));pid:=a->'questions'->0->>'id';
 if a->'questions'->0 ? 'correct_answer' or a->'breakdown'<>'null'::jsonb then raise exception 'Answer exposed during contest';end if;
 -- The admin is allowed to access source keys, but public attempts are not.
 perform set_config('test.attempt_one',a->>'id',true);perform set_config('test.snapshot_id',pid,true);
end $$;
reset role;
select set_config('test.key',(select correct_answer from public.problem_solutions where problem_id=current_setting('test.snapshot_id')),true);
set role authenticated;
do $$ declare a jsonb;m jsonb;begin
 a:=public.save_contest_answer(current_setting('test.attempt_one')::uuid,current_setting('test.snapshot_id'),current_setting('test.key'),false);
 m:=public.admin_contest_records(current_setting('test.contest_id'));
 if m->'participants'->0->>'answered'<>'1' or m->'participants'->0->>'status'<>'active' or m->'participants'->0->'score'<>'null'::jsonb then raise exception 'Monitor progress incorrect';end if;
 a:=public.finalize_contest(current_setting('test.attempt_one')::uuid);
 if a->'breakdown'<>'null'::jsonb then raise exception 'Early solutions exposed';end if;
 begin perform public.start_contest(current_setting('test.contest_id'));raise exception 'Second rated attempt allowed';exception when raise_exception then if sqlerrm<>'Rated event permits one attempt' then raise;end if;end;
end $$;
select set_config('test.uid','00000000-0000-4000-8000-000000000002',true);
do $$ declare a jsonb;begin
 a:=public.start_contest(current_setting('test.contest_id'));
 a:=public.save_contest_answer((a->>'id')::uuid,current_setting('test.snapshot_id'),case when current_setting('test.key')='A' then 'B' else 'A' end,false);
 perform public.finalize_contest((a->>'id')::uuid);
end $$;
reset role;
do $$ begin if public.process_due_contest_ratings()<>0 then raise exception 'Ratings updated before review';end if;end $$;
update public.contests set starts_at=now()-interval '2 hours',ends_at=now()-interval '16 minutes',review_at=now()-interval '1 minute' where id=current_setting('test.contest_id');
do $$ begin
 if public.process_due_contest_ratings()<>1 or public.process_due_contest_ratings()<>0 then raise exception 'Rating batch not exactly once';end if;
 if (select rating from public.profiles where id='00000000-0000-4000-8000-000000000001')<>897 or (select rating from public.profiles where id='00000000-0000-4000-8000-000000000002')<>702 then raise exception 'SQL rating differs from TS fixture';end if;
 if (select count(*) from public.rating_history where contest_id=current_setting('test.contest_id'))<>2 then raise exception 'Incomplete rating history';end if;
end $$;
-- An abandoned attempt must finalize without an open browser; one participant
-- records participation without moving their rating.
set role authenticated;
select set_config('test.uid','00000000-0000-4000-8000-000000000001',true);
do $$ declare ids jsonb;c jsonb;begin
 select jsonb_agg(value) into ids from jsonb_array_elements(current_setting('test.contest_sources')::jsonb) with ordinality p(value,i) where i<=5;
 c:=public.admin_create_contest(jsonb_build_object('name','Expiry test','description','','question_count',5,'starts_at',now()+interval '1 hour','ends_at',now()+interval '2 hours','published',true,'problem_ids',ids));
 perform set_config('test.expiry_contest',c->>'id',true);
end $$;
reset role;
update public.contests set starts_at=now()-interval '30 minutes',ends_at=now()-interval '15 minutes',review_at=now() where id=current_setting('test.expiry_contest');
insert into public.contest_attempts(user_id,contest_id,started_at,deadline) values('00000000-0000-4000-8000-000000000001',current_setting('test.expiry_contest'),now()-interval '30 minutes',now()-interval '15 minutes');
do $$ begin
 if public.process_due_contest_ratings()<>1 then raise exception 'Abandoned event unprocessed';end if;
 if exists(select 1 from public.contest_attempts where contest_id=current_setting('test.expiry_contest') and status<>'finalized') then raise exception 'Abandoned attempt not finalized';end if;
 if (select rating from public.profiles where id='00000000-0000-4000-8000-000000000001')<>897 then raise exception 'Single participant rating changed';end if;
end $$;
rollback;
select 'PASS: admin creation, presets, snapshots, monitoring, no answer leakage, single attempts and exactly-once delayed ratings';
