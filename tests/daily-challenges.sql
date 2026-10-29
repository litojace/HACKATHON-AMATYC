begin;
insert into auth.users(id,email,raw_user_meta_data)
select ('00000000-0000-4000-8000-'||lpad((300+i)::text,12,'0'))::uuid,'daily-'||i||'@example.test',jsonb_build_object('full_name','Daily User '||i) from generate_series(0,8) i;
update public.profiles set rating=1588 where id='00000000-0000-4000-8000-000000000304';

do $$ declare uid uuid; wanted integer; data jsonb; again jsonb; cid uuid; d public.daily_challenges; item jsonb; answer text; position integer; actual integer; expected integer; before_rating integer;
begin
 for wanted in 0..5 loop
  uid:=('00000000-0000-4000-8000-'||lpad((300+wanted)::text,12,'0'))::uuid;
  perform set_config('test.uid',uid::text,true);
  data:=public.start_daily_challenge();cid:=(data->'challenge'->>'id')::uuid;
  again:=public.start_daily_challenge();
  if again->'challenge'->>'id'<>cid::text then raise exception 'Daily start rerolled';end if;
  if data::text ~ '"(correct_answer|written_solution|accepted_answers|items)"[[:space:]]*:' then raise exception 'Active challenge leaked secrets';end if;
  select * into d from public.daily_challenges where id=cid;
  if cardinality(d.question_ids)<>5 or (select count(distinct p) from unnest(d.question_ids) p)<>5 then raise exception 'Daily set must contain five unique questions';end if;
  if exists(select 1 from jsonb_array_elements(data->'challenge'->'questions') p where (p->>'difficulty_rating')::int>d.rating_at_start+300 or (p->>'difficulty_rating')::int<greatest(1,d.rating_at_start-400)) then raise exception 'Questions outside rating band';end if;
  begin perform public.finish_daily_challenge(cid);raise exception 'Incomplete daily submitted';exception when invalid_parameter_value then null;end;
  begin perform public.save_daily_answer(cid,'not-an-assigned-question','A');raise exception 'Foreign question accepted';exception when invalid_parameter_value then null;end;
  begin perform public.save_daily_answer(cid,d.question_ids[1],'Z');raise exception 'Invalid option accepted';exception when invalid_parameter_value then null;end;
  begin perform public.start_practice(d.question_ids[1]);raise exception 'Practice exposed active daily solution';exception when object_not_in_prerequisite_state then null;end;
  position:=0;
  for item in select q from jsonb_array_elements(d.items) q loop
   position:=position+1;
   if position<=wanted then answer:=coalesce(nullif(item->'solution'->'accepted_answers','null'::jsonb)->>0,item->'solution'->>'correct_answer');
   else select o->>'label' into answer from jsonb_array_elements(item->'problem'->'options') o where not exists(select 1 from jsonb_array_elements_text(coalesce(nullif(item->'solution'->'accepted_answers','null'::jsonb),jsonb_build_array(item->'solution'->>'correct_answer'))) a where a=o->>'label') limit 1;end if;
   perform public.save_daily_answer(cid,item->'problem'->>'id',answer);
  end loop;
  -- An admin adjustment during the challenge must not be overwritten by an old baseline.
  if wanted=1 then update public.profiles set rating=1000 where id=uid;end if;
  select rating into before_rating from public.profiles where id=uid;
  -- Answer-key edits after start must not change the frozen grading snapshot.
  if wanted=4 then update public.problem_solutions set correct_answer='Z',accepted_answers=null where problem_id=d.question_ids[1];end if;
  data:=public.finish_daily_challenge(cid);again:=public.finish_daily_challenge(cid);
  expected:=case wanted when 5 then 20 when 4 then 12 when 3 then 3 when 2 then -2 when 1 then -5 else -8 end;
  if (data->'challenge'->>'correct_count')::int<>wanted or (data->'challenge'->>'new_rating')::int<>before_rating+expected then raise exception 'Wrong daily grading or rating for %',wanted;end if;
  if data->'challenge'->>'new_rating'<>again->'challenge'->>'new_rating' or (select count(*) from public.rating_history where daily_challenge_id=cid)<>1 then raise exception 'Duplicate rating applied';end if;
  if jsonb_array_length(data->'challenge'->'breakdown')<>5 or data->'challenge'->'breakdown'->0->'explanation'->>'correct_answer' is null then raise exception 'Completed solutions unavailable';end if;
  begin perform public.save_daily_answer(cid,d.question_ids[1],'A');raise exception 'Completed answer changed';exception when object_not_in_prerequisite_state then null;end;
  if wanted=4 then update public.problem_solutions set correct_answer=d.items->0->'solution'->>'correct_answer',accepted_answers=nullif(d.items->0->'solution'->'accepted_answers','null'::jsonb) where problem_id=d.question_ids[1];end if;
 end loop;
 if (select rating from public.profiles where id='00000000-0000-4000-8000-000000000304')<>1600 then raise exception 'Expert milestone wrong';end if;
 -- Expiry consumes the old set, while the new Pacific date gets five fresh IDs.
 perform set_config('test.uid','00000000-0000-4000-8000-000000000306',true);
 data:=public.start_daily_challenge();cid:=(data->'challenge'->>'id')::uuid;select * into d from public.daily_challenges where id=cid;
 update public.daily_challenges set challenge_date=challenge_date-1 where id=cid;
 begin perform public.finish_daily_challenge(cid);raise exception 'Expired daily changed rating';exception when object_not_in_prerequisite_state then null;end;
 data:=public.start_daily_challenge();
 if data->'challenge'->>'id'=cid::text then raise exception 'New day did not reset';end if;
 if exists(select 1 from jsonb_array_elements(data->'challenge'->'questions') q where q->>'id'=any(d.question_ids)) then raise exception 'A previous daily question repeated';end if;
 -- No easy-question farming after the library no longer covers a user's level.
 perform set_config('test.uid','00000000-0000-4000-8000-000000000307',true);
 update public.profiles set rating=10000 where id=auth.uid();
 begin perform public.start_daily_challenge();raise exception 'Very high rating farmed easy questions';exception when object_not_in_prerequisite_state then null;end;
 if exists(select 1 from public.daily_challenges where user_id=auth.uid()) then raise exception 'Failed start consumed day';end if;
 -- Falling below the library's starter rating must not lock users out of recovery.
 perform set_config('test.uid','00000000-0000-4000-8000-000000000308',true);
 update public.profiles set rating=3 where id=auth.uid();
 data:=public.start_daily_challenge();
 if jsonb_array_length(data->'challenge'->'questions')<>5 or (data->'challenge'->>'rating_at_start')::int<>3 then raise exception 'Low rating cannot start or lost actual rating';end if;
end $$;

select set_config('test.daily_other',(select id::text from public.daily_challenges where user_id='00000000-0000-4000-8000-000000000304'),true);
set local role authenticated;
select set_config('test.uid','00000000-0000-4000-8000-000000000307',true);
do $$ begin
 begin perform * from public.daily_challenges;raise exception 'Private snapshots readable';exception when insufficient_privilege then null;end;
 begin update public.daily_challenges set correct_count=5;raise exception 'Client changed grade';exception when insufficient_privilege then null;end;
 begin update public.profiles set rating=10000 where id=auth.uid();raise exception 'Client changed rating';exception when insufficient_privilege then null;end;
 begin perform public.save_daily_answer(current_setting('test.daily_other')::uuid,'irrelevant','A');raise exception 'Other user saved answers';exception when no_data_found then null;end;
 begin perform public.finish_daily_challenge(current_setting('test.daily_other')::uuid);raise exception 'Other user finalized challenge';exception when no_data_found then null;end;
end $$;
set local role anon;
do $$ begin
 begin perform public.start_daily_challenge();raise exception 'Guest started daily';exception when insufficient_privilege then null;end;
 begin perform public.daily_challenge_status();raise exception 'Guest read daily';exception when insufficient_privilege then null;end;
end $$;
reset role;
do $$ declare data jsonb; d public.daily_challenges; item jsonb; answer text; seen text; other_contest text; name text;
begin
 perform set_config('test.uid','00000000-0000-4000-8000-000000000307',true);
 update public.profiles set rating=800 where id=auth.uid();
 select p.id into seen from public.problems p where public.problem_available(p.id) and p.difficulty_rating<=1100 limit 1;
 perform public.start_practice(seen);
 data:=public.start_daily_challenge();select * into d from public.daily_challenges where id=(data->'challenge'->>'id')::uuid;
 if seen=any(d.question_ids) then raise exception 'Previously seen practice question selected';end if;
 for item in select q from jsonb_array_elements(d.items) q loop
  select o->>'label' into answer from jsonb_array_elements(item->'problem'->'options') o where not exists(select 1 from jsonb_array_elements_text(coalesce(nullif(item->'solution'->'accepted_answers','null'::jsonb),jsonb_build_array(item->'solution'->>'correct_answer'))) a where a=o->>'label') limit 1;
  perform public.save_daily_answer(d.id,item->'problem'->>'id',answer);
 end loop;
 update public.profiles set rating=3 where id=auth.uid();data:=public.finish_daily_challenge(d.id);
 if (data->'challenge'->>'new_rating')::int<>1 or (data->'challenge'->>'rating_delta')::int<>-2 then raise exception 'Rating floor not respected';end if;
 perform public.start_practice(d.question_ids[1]);
 perform set_config('test.uid','00000000-0000-4000-8000-000000000306',true);
 select * into d from public.daily_challenges where user_id=auth.uid() and challenge_date=public.daily_challenge_day();
 select cp.contest_id into other_contest from public.contest_problems cp where cp.problem_id=d.question_ids[1] limit 1;
 if other_contest is null then
  other_contest:='daily-overlap-fixture';
  insert into public.contests(id,name,question_count,duration_seconds,published) values(other_contest,'Daily overlap fixture',5,900,true);
  insert into public.contest_problems(contest_id,problem_id,position) select other_contest,p,position from unnest(d.question_ids) with ordinality as q(p,position);
 end if;
 begin perform public.start_contest(other_contest);raise exception 'Overlapping mock exposed answers';exception when object_not_in_prerequisite_state then null;end;
 update public.profiles set is_public=true where id='00000000-0000-4000-8000-000000000304';
 select username into name from public.profiles where id='00000000-0000-4000-8000-000000000304';
 data:=public.public_dashboard(name);
 if jsonb_array_length(data->'daily')<>1 or data::text ~ '"(answers|items|correct_answer|written_solution|question_ids)"[[:space:]]*:' then raise exception 'Public daily progress missing or leaking answers';end if;
 delete from auth.users where id='00000000-0000-4000-8000-000000000304';
 if exists(select 1 from public.daily_challenges where user_id='00000000-0000-4000-8000-000000000304') or exists(select 1 from public.rating_history where user_id='00000000-0000-4000-8000-000000000304') then raise exception 'Daily account deletion did not cascade';end if;
end $$;
insert into auth.users(id,email,raw_user_meta_data) values('00000000-0000-4000-8000-000000000398','daily-admin@example.test','{}');
insert into public.site_admins(user_id) values('00000000-0000-4000-8000-000000000398');
select set_config('test.uid','00000000-0000-4000-8000-000000000398',true);
select public.admin_reset_data('progress','RESET PROGRESS','Daily reset fixture');
do $$ begin
 if exists(select 1 from public.daily_challenges) or exists(select 1 from public.rating_history) then raise exception 'Progress reset retained daily records';end if;
end $$;
rollback;
select 'PASS: daily sets, resume, six reward tiers, frozen keys, floor, rating idempotency, privacy, expiry, fresh questions, practice/mock guards, deletion and admin reset';
