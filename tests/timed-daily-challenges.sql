begin;
insert into auth.users(id,email,raw_user_meta_data)
select ('00000000-0000-4000-8000-'||lpad((420+i)::text,12,'0'))::uuid,'timed-daily-'||i||'@example.test','{}'::jsonb from generate_series(0,15) i;

do $$ declare uid uuid; wanted integer; data jsonb; again jsonb; d public.daily_challenges; item jsonb; answer text; position integer; expected integer; previous integer; legacy legacy_daily_snapshot; begin
 -- A pre-migration set keeps its exact IDs, keys, progress, duration and rewards.
 perform set_config('test.uid','00000000-0000-4000-8000-000000000410',true);
 select * into legacy from legacy_daily_snapshot;
 data:=public.start_timed_daily_challenge();select * into d from public.daily_challenges where id=(data->'challenge'->>'id')::uuid;
 if d.question_ids<>legacy.question_ids or d.items<>legacy.items or d.answers<>legacy.answers or d.started_at<>legacy.started_at or d.expires_at is not null then raise exception 'Migration changed a legacy set';end if;
 for item in select q from jsonb_array_elements(d.items) q loop
  perform public.save_daily_answer(d.id,item->'problem'->>'id',item->'solution'->>'correct_answer');
 end loop;
 data:=public.finish_daily_challenge(d.id);
 if (data->'challenge'->>'rating_delta')::int<>20 then raise exception 'Legacy reward changed';end if;
 for wanted in 0..10 loop
  uid:=('00000000-0000-4000-8000-'||lpad((420+wanted)::text,12,'0'))::uuid;
  perform set_config('test.uid',uid::text,true);
  data:=public.start_timed_daily_challenge();select * into d from public.daily_challenges where id=(data->'challenge'->>'id')::uuid;
  again:=public.start_daily_challenge();
  if again->'challenge'->>'id'<>d.id::text or (again->'challenge'->>'expires_at')::timestamptz<>d.expires_at then raise exception 'Resume rerolled or extended deadline';end if;
  if cardinality(d.question_ids)<>10 or (select count(distinct p) from unnest(d.question_ids) p)<>10 then raise exception 'Expected ten unique questions';end if;
  if d.expires_at<>least(d.started_at+interval '40 minutes',(data->>'resets_at')::timestamptz) then raise exception 'Deadline must be 40 minutes or reset';end if;
  if data::text ~ '"(correct_answer|written_solution|accepted_answers|items)"[[:space:]]*:' then raise exception 'Active set leaked solutions';end if;
  begin perform public.finish_daily_challenge(d.id);raise exception 'Early incomplete set accepted';exception when invalid_parameter_value then null;end;
  begin perform public.start_practice(d.question_ids[1]);raise exception 'Active solution guard missing';exception when object_not_in_prerequisite_state then null;end;
  position:=0;
  for item in select q from jsonb_array_elements(d.items) q loop
   position:=position+1;
   if position<=wanted then answer:=coalesce(nullif(item->'solution'->'accepted_answers','null'::jsonb)->>0,item->'solution'->>'correct_answer');
   else select o->>'label' into answer from jsonb_array_elements(item->'problem'->'options') o where not exists(select 1 from jsonb_array_elements_text(coalesce(nullif(item->'solution'->'accepted_answers','null'::jsonb),jsonb_build_array(item->'solution'->>'correct_answer'))) a where a=o->>'label') limit 1;end if;
   perform public.save_daily_answer(d.id,item->'problem'->>'id',answer);
  end loop;
  if wanted=6 then update public.profiles set rating=1500 where id=uid;end if;
  select rating into previous from public.profiles where id=uid;
  -- Frozen keys must survive a later source edit.
  if wanted=10 then update public.problem_solutions set correct_answer='Z',accepted_answers=null where problem_id=d.question_ids[1];end if;
  data:=public.finish_daily_challenge(d.id);again:=public.finish_daily_challenge(d.id);
  expected:=(array[-8,-6,-5,-3,-2,0,6,15,24,32,40])[wanted+1];
  if (data->'challenge'->>'correct_count')::int<>wanted or (data->'challenge'->>'new_rating')::int<>previous+expected then raise exception 'Wrong timed reward for %',wanted;end if;
  if (data->'challenge'->>'timed_out')::boolean or jsonb_array_length(data->'challenge'->'breakdown')<>10 then raise exception 'Early finish response incorrect';end if;
  if data->'challenge'->>'new_rating'<>again->'challenge'->>'new_rating' or (select count(*) from public.rating_history where daily_challenge_id=d.id)<>1 then raise exception 'Duplicate timed award';end if;
  if wanted=10 then update public.problem_solutions set correct_answer=d.items->0->'solution'->>'correct_answer',accepted_answers=nullif(d.items->0->'solution'->'accepted_answers','null'::jsonb) where problem_id=d.question_ids[1];end if;
 end loop;
end $$;

do $$ declare data jsonb; d public.daily_challenges; before_answers jsonb; next_data jsonb; begin
 -- Late saves cannot add an answer, even when the client timer was paused.
 perform set_config('test.uid','00000000-0000-4000-8000-000000000431',true);
 data:=public.start_timed_daily_challenge();select * into d from public.daily_challenges where id=(data->'challenge'->>'id')::uuid;
 perform public.save_daily_answer(d.id,d.question_ids[1],d.items->0->'solution'->>'correct_answer');
 select answers into before_answers from public.daily_challenges where id=d.id;
 update public.daily_challenges set started_at=clock_timestamp()-interval '41 minutes',expires_at=clock_timestamp()-interval '1 minute' where id=d.id;
 data:=public.save_daily_answer(d.id,d.question_ids[2],d.items->1->'solution'->>'correct_answer');
 if data->'challenge'->>'status'<>'completed' or not (data->'challenge'->>'timed_out')::boolean or (data->'challenge'->>'correct_count')::int<>1 or (data->'challenge'->>'rating_delta')::int<>-6 or data->'challenge'->'answers'<>before_answers then raise exception 'Late answer was saved or blank grading wrong';end if;
 if data->'challenge'->'breakdown'->1->>'selected_answer' is not null then raise exception 'Blank answer invented';end if;
 -- Status alone settles an expired set, and repeating it never awards twice.
 perform set_config('test.uid','00000000-0000-4000-8000-000000000432',true);
 data:=public.start_timed_daily_challenge();select * into d from public.daily_challenges where id=(data->'challenge'->>'id')::uuid;
 update public.profiles set rating=3 where id=auth.uid();
 update public.daily_challenges set started_at=clock_timestamp()-interval '41 minutes',expires_at=clock_timestamp()-interval '1 minute' where id=d.id;
 data:=public.daily_challenge_status();perform public.daily_challenge_status();
 if (data->'challenge'->>'rating_delta')::int<>-2 or (select rating from public.profiles where id=auth.uid())<>1 or (select count(*) from public.rating_history where daily_challenge_id=d.id)<>1 then raise exception 'Timeout floor/idempotence failed';end if;
 -- Closing the tab until tomorrow cannot escape the old grade. No assigned ID repeats.
 perform set_config('test.uid','00000000-0000-4000-8000-000000000433',true);
 data:=public.start_timed_daily_challenge();select * into d from public.daily_challenges where id=(data->'challenge'->>'id')::uuid;
 update public.daily_challenges set challenge_date=challenge_date-1,started_at=started_at-interval '1 day',expires_at=expires_at-interval '1 day' where id=d.id;
 data:=public.daily_challenge_status();
 if data->'challenge'<>'null'::jsonb or (select rating from public.profiles where id=auth.uid())<>792 then raise exception 'Yesterday timeout did not settle';end if;
 next_data:=public.start_timed_daily_challenge();
 if exists(select 1 from jsonb_array_elements(next_data->'challenge'->'questions') q where q->>'id'=any(d.question_ids)) then raise exception 'Prior daily question repeated';end if;
 -- Low-rated users can still start; lack of ten fresh questions consumes no day.
 perform set_config('test.uid','00000000-0000-4000-8000-000000000434',true);
 update public.profiles set rating=3 where id=auth.uid();data:=public.start_timed_daily_challenge();
 if (data->'challenge'->>'rating_at_start')::int<>3 then raise exception 'Low rating lost';end if;
 perform set_config('test.uid','00000000-0000-4000-8000-000000000435',true);
 update public.profiles set rating=10000 where id=auth.uid();
 begin perform public.start_timed_daily_challenge();raise exception 'Scarce band accepted';exception when object_not_in_prerequisite_state then null;end;
 if exists(select 1 from public.daily_challenges where user_id=auth.uid()) then raise exception 'Failed start consumed day';end if;
end $$;
set local role authenticated;
do $$ begin
 begin perform public.finalize_daily_challenge(gen_random_uuid());raise exception 'Internal grader exposed';exception when insufficient_privilege then null;end;
 begin perform * from public.daily_challenges;raise exception 'Snapshots exposed';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'PASS: ten questions, 40-minute deadlines, eleven reward tiers, legacy preservation, timeout, late saves, rollover, blanks, floor, frozen keys and private grading';
