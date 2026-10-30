begin;

-- Keep already-started five-question sets, answer keys and rewards intact.
alter table public.daily_challenges add column expires_at timestamptz;
alter table public.daily_challenges add column timed_out boolean not null default false;
alter table public.daily_challenges drop constraint daily_challenges_question_ids_check;
alter table public.daily_challenges drop constraint daily_challenges_items_check;
alter table public.daily_challenges drop constraint daily_challenges_correct_count_check;
alter table public.daily_challenges add constraint daily_challenges_question_ids_check check(cardinality(question_ids) in (5,10));
alter table public.daily_challenges add constraint daily_challenges_items_check check(jsonb_typeof(items)='array' and jsonb_array_length(items)=cardinality(question_ids));
alter table public.daily_challenges add constraint daily_challenges_correct_count_check check(correct_count between 0 and cardinality(question_ids));
alter table public.daily_challenges add constraint daily_challenges_deadline_check check(
 (cardinality(question_ids)=5 and expires_at is null) or
 (cardinality(question_ids)=10 and expires_at is not null and expires_at>started_at and expires_at<=started_at+interval '40 minutes'));

-- Internal grading only. Profile-first locks serialize start, save, timeout and finish.
create function public.finalize_daily_challenge(challenge_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare d public.daily_challenges; previous integer; next_rating integer; correct integer; change integer; expired boolean; finished timestamptz;
begin
 if auth.uid() is null then raise exception 'Please sign in to continue.' using errcode='42501';end if;
 select rating into previous from public.profiles where id=auth.uid() for update;
 select * into d from public.daily_challenges where id=challenge_id and user_id=auth.uid() for update;
 if not found then raise exception 'Challenge not found' using errcode='P0002';end if;
 if d.completed_at is not null then return;end if;
 finished:=clock_timestamp();expired:=coalesce(d.expires_at<=finished,false);
 if d.expires_at is null and d.challenge_date<>(finished at time zone 'America/Los_Angeles')::date then raise exception 'This daily challenge has closed. Open today’s challenge to continue.' using errcode='55000';end if;
 if not expired and exists(select 1 from unnest(d.question_ids) p where coalesce(d.answers->>p,'')='') then raise exception 'Answer every question before submitting.' using errcode='22023';end if;
 select count(*) into correct from jsonb_array_elements(d.items) item
 where exists(select 1 from jsonb_array_elements_text(coalesce(nullif(item->'solution'->'accepted_answers','null'::jsonb),jsonb_build_array(item->'solution'->>'correct_answer'))) a
  where upper(regexp_replace(a,'[[:space:],]','','g'))=upper(regexp_replace(d.answers->>(item->'problem'->>'id'),'[[:space:],]','','g')));
 change:=case when cardinality(d.question_ids)=5 then (array[-8,-5,-2,3,12,20])[correct+1]
  else (array[-8,-6,-5,-3,-2,0,6,15,24,32,40])[correct+1] end;
 next_rating:=greatest(1,previous+change);
 update public.daily_challenges set completed_at=case when expired then d.expires_at else finished end,timed_out=expired,correct_count=correct,old_rating=previous,new_rating=next_rating,rating_delta=next_rating-previous where id=d.id;
 update public.profiles set rating=next_rating,updated_at=now() where id=auth.uid();
 insert into public.rating_history(user_id,daily_challenge_id,old_rating,new_rating,policy_version) values(auth.uid(),d.id,previous,next_rating,case when cardinality(d.question_ids)=5 then 'daily-v1' else 'daily-v2' end);

end $$;

create or replace function public.daily_challenge_status() returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare d public.daily_challenges; today date; payload jsonb; overdue uuid; server_time timestamptz;
begin
 if auth.uid() is null then raise exception 'Please sign in to continue.' using errcode='42501';end if;
 perform id from public.profiles where id=auth.uid() for update;
 for overdue in select id from public.daily_challenges where user_id=auth.uid() and completed_at is null and expires_at<=clock_timestamp() order by expires_at loop
  perform public.finalize_daily_challenge(overdue);
 end loop;
 server_time:=clock_timestamp();today:=(server_time at time zone 'America/Los_Angeles')::date;
 select * into d from public.daily_challenges where user_id=auth.uid() and challenge_date=today;
 if found then
  payload:=jsonb_build_object('id',d.id,'challenge_date',d.challenge_date,'started_at',d.started_at,'expires_at',d.expires_at,'timed_out',d.timed_out,
   'status',case when d.completed_at is null then 'active' else 'completed' end,'rating_at_start',d.rating_at_start,
   'answers',d.answers,'questions',(select jsonb_agg(item->'problem' order by position) from jsonb_array_elements(d.items) with ordinality as q(item,position)),
   'completed_at',d.completed_at,'correct_count',d.correct_count,'old_rating',d.old_rating,'new_rating',d.new_rating,'rating_delta',d.rating_delta);
  if d.completed_at is not null then
   payload:=payload||jsonb_build_object('breakdown',(select jsonb_agg(jsonb_build_object(
    'problem_id',item->'problem'->>'id','selected_answer',d.answers->>(item->'problem'->>'id'),
    'is_correct',exists(select 1 from jsonb_array_elements_text(coalesce(nullif(item->'solution'->'accepted_answers','null'::jsonb),jsonb_build_array(item->'solution'->>'correct_answer'))) a
      where upper(regexp_replace(a,'[[:space:],]','','g'))=upper(regexp_replace(d.answers->>(item->'problem'->>'id'),'[[:space:],]','','g'))),
    'explanation',item->'solution') order by position) from jsonb_array_elements(d.items) with ordinality as q(item,position)));
  end if;
 end if;
 return jsonb_build_object('challenge_date',today,'resets_at',((today+1)::timestamp at time zone 'America/Los_Angeles'),'server_now',server_time,'challenge',payload);
end $$;

create function public.start_timed_daily_challenge() returns jsonb language plpgsql security definer set search_path='' as $$
declare baseline integer; level integer; aim integer; picked text; chosen text[]:='{}'; snapshots jsonb:='[]'; today date; started timestamptz;
begin
 if auth.uid() is null then raise exception 'Please sign in to continue.' using errcode='42501';end if;
 select rating into baseline from public.profiles where id=auth.uid() for update;
 if not found then raise exception 'Profile not found' using errcode='P0002';end if;
 perform public.daily_challenge_status();
 select rating into baseline from public.profiles where id=auth.uid();
 today:=(clock_timestamp() at time zone 'America/Los_Angeles')::date;
 if exists(select 1 from public.daily_challenges where user_id=auth.uid() and challenge_date=today) then return public.daily_challenge_status();end if;
 -- The library starts at 800; a lower rating must still be able to recover.
 level:=greatest(800,baseline);
 foreach aim in array array[level-200,level-200,level,level,level,level,level,level,level+200,level+200] loop
  select p.id into picked from public.problems p join public.problem_solutions s on s.problem_id=p.id
  cross join lateral (select coalesce(p.difficulty_rating,case p.difficulty when 'Easy' then 800 when 'Medium' then 1400 else 1800 end) as rating) r
  where public.problem_available(p.id) and p.answer_format='multiple_choice' and s.grading_policy='standard'
   and (select count(*) from public.problem_options o where o.problem_id=p.id)>=2
   and r.rating between greatest(1,level-400) and level+300
   and not(p.id=any(chosen))
   and not exists(select 1 from public.daily_challenges d where d.user_id=auth.uid() and p.id=any(d.question_ids))
   and not exists(select 1 from public.practice_sessions ps where ps.user_id=auth.uid() and ps.problem_id=p.id)
   and not exists(select 1 from public.contest_attempts a join public.contest_problems cp on cp.contest_id=a.contest_id where a.user_id=auth.uid() and cp.problem_id=p.id)
  order by case when aim<level and r.rating<level-100 or aim=level and r.rating between level-100 and level+100 or aim>level and r.rating>level+100 then 0 else 1 end,
   abs(r.rating-aim)+random()*60,p.id limit 1;
  if picked is null then raise exception 'There are not enough fresh questions near your rating. Try regular practice while we add more.' using errcode='55000';end if;
  chosen:=array_append(chosen,picked);
  snapshots:=snapshots||jsonb_build_array(jsonb_build_object('problem',public.problem_json(picked),'solution',public.explanation_json(picked)));
 end loop;
 -- Selection and its answer keys are frozen together; reloads cannot reroll it.
 started:=clock_timestamp();today:=(started at time zone 'America/Los_Angeles')::date;
 insert into public.daily_challenges(user_id,challenge_date,started_at,expires_at,rating_at_start,question_ids,items)
 values(auth.uid(),today,started,least(started+interval '40 minutes',((today+1)::timestamp at time zone 'America/Los_Angeles')),baseline,chosen,snapshots);
 return public.daily_challenge_status();
end $$;

create or replace function public.save_daily_answer(challenge_id uuid, problem_id text, selected text) returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.daily_challenges; item jsonb;
begin
 if auth.uid() is null then raise exception 'Please sign in to continue.' using errcode='42501';end if;
 perform id from public.profiles where id=auth.uid() for update;
 select * into d from public.daily_challenges where id=challenge_id and user_id=auth.uid() for update;
 if not found then raise exception 'Challenge not found' using errcode='P0002';end if;
 if d.completed_at is not null then raise exception 'This challenge has already been submitted.' using errcode='55000';end if;
 if d.expires_at<=clock_timestamp() then
  perform public.finalize_daily_challenge(d.id);return public.daily_challenge_status();
 end if;
 if d.challenge_date<>(clock_timestamp() at time zone 'America/Los_Angeles')::date then raise exception 'This daily challenge has closed. Open today’s challenge to continue.' using errcode='55000';end if;
 select q into item from jsonb_array_elements(d.items) q where q->'problem'->>'id'=problem_id;
 if item is null or (selected is not null and not exists(select 1 from jsonb_array_elements(item->'problem'->'options') o where o->>'label'=selected)) then
  raise exception 'Choose an answer from this challenge.' using errcode='22023';end if;
 update public.daily_challenges set answers=answers||jsonb_build_object(problem_id,selected) where id=d.id;
 return public.daily_challenge_status();
end $$;


-- Existing callers also use the timed policy; the app calls the new name so a
-- missing migration fails safely instead of silently creating an old five-question set.
create or replace function public.start_daily_challenge() returns jsonb language sql security definer set search_path='' as $$
 select public.start_timed_daily_challenge();
$$;
create or replace function public.finish_daily_challenge(challenge_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform public.finalize_daily_challenge(challenge_id);
 return public.daily_challenge_status();
end $$;
create or replace function public.guard_daily_question_access() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform id from public.profiles where id=new.user_id for update;
 if tg_table_name='practice_sessions' then
  if exists(select 1 from public.daily_challenges d where d.user_id=new.user_id and d.challenge_date=public.daily_challenge_day() and d.completed_at is null and (d.expires_at is null or d.expires_at>clock_timestamp()) and new.problem_id=any(d.question_ids)) then
   raise exception 'Finish your daily challenge before practicing this question.' using errcode='55000';end if;
 else
  if exists(select 1 from public.daily_challenges d join public.contest_problems cp on cp.problem_id=any(d.question_ids) where d.user_id=new.user_id and d.challenge_date=public.daily_challenge_day() and d.completed_at is null and (d.expires_at is null or d.expires_at>clock_timestamp()) and cp.contest_id=new.contest_id) then
   raise exception 'Finish your daily challenge before starting a mock that includes its questions.' using errcode='55000';end if;
 end if;
 return new;
end $$;

revoke all on function public.finalize_daily_challenge(uuid),public.start_timed_daily_challenge() from public,anon,authenticated;
grant execute on function public.start_timed_daily_challenge() to authenticated;
notify pgrst,'reload schema';
commit;
