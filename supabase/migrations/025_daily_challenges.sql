begin;

-- Snapshots contain answer keys. Access is through the owner-checking RPCs only.
create table public.daily_challenges (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 challenge_date date not null,
 started_at timestamptz not null default now(),
 completed_at timestamptz,
 rating_at_start integer not null,
 question_ids text[] not null check(cardinality(question_ids)=5),
 items jsonb not null check(jsonb_typeof(items)='array' and jsonb_array_length(items)=5),
 answers jsonb not null default '{}'::jsonb check(jsonb_typeof(answers)='object'),
 correct_count integer check(correct_count between 0 and 5),
 old_rating integer, new_rating integer, rating_delta integer,
 unique(user_id,challenge_date),
 check((completed_at is null and correct_count is null and old_rating is null and new_rating is null and rating_delta is null)
    or (completed_at is not null and correct_count is not null and old_rating is not null and new_rating is not null and rating_delta is not null and rating_delta=new_rating-old_rating))
);
alter table public.daily_challenges enable row level security;
revoke all on public.daily_challenges from public,anon,authenticated;
create index if not exists practice_sessions_user_problem_daily_idx on public.practice_sessions(user_id,problem_id);
alter table public.rating_history alter column contest_id drop not null;
alter table public.rating_history add column daily_challenge_id uuid unique references public.daily_challenges(id) on delete cascade;
alter table public.rating_history add constraint rating_history_source check(num_nonnulls(contest_id,daily_challenge_id)=1);

create function public.daily_challenge_day() returns date language sql stable security definer set search_path='' as $$
 select (statement_timestamp() at time zone 'America/Los_Angeles')::date;
$$;

create function public.daily_challenge_status() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare d public.daily_challenges; today date:=public.daily_challenge_day(); payload jsonb;
begin
 if auth.uid() is null then raise exception 'Please sign in to continue.' using errcode='42501';end if;
 select * into d from public.daily_challenges where user_id=auth.uid() and challenge_date=today;
 if found then
  payload:=jsonb_build_object('id',d.id,'challenge_date',d.challenge_date,'started_at',d.started_at,
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
 return jsonb_build_object('challenge_date',today,'resets_at',((today+1)::timestamp at time zone 'America/Los_Angeles'),'server_now',statement_timestamp(),'challenge',payload);
end $$;

create function public.start_daily_challenge() returns jsonb language plpgsql security definer set search_path='' as $$
declare baseline integer; level integer; aim integer; picked text; chosen text[]:='{}'; snapshots jsonb:='[]'; today date:=public.daily_challenge_day();
begin
 if auth.uid() is null then raise exception 'Please sign in to continue.' using errcode='42501';end if;
 select rating into baseline from public.profiles where id=auth.uid() for update;
 if not found then raise exception 'Profile not found' using errcode='P0002';end if;
 if exists(select 1 from public.daily_challenges where user_id=auth.uid() and challenge_date=today) then return public.daily_challenge_status();end if;
 -- The library starts at 800; a lower rating must still be able to recover.
 level:=greatest(800,baseline);
 foreach aim in array array[level-200,level,level,level,level+200] loop
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
 insert into public.daily_challenges(user_id,challenge_date,rating_at_start,question_ids,items) values(auth.uid(),today,baseline,chosen,snapshots);
 return public.daily_challenge_status();
end $$;

create function public.save_daily_answer(challenge_id uuid, problem_id text, selected text) returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.daily_challenges; item jsonb;
begin
 if auth.uid() is null then raise exception 'Please sign in to continue.' using errcode='42501';end if;
 perform id from public.profiles where id=auth.uid() for update;
 select * into d from public.daily_challenges where id=challenge_id and user_id=auth.uid() for update;
 if not found then raise exception 'Challenge not found' using errcode='P0002';end if;
 if d.completed_at is not null then raise exception 'This challenge has already been submitted.' using errcode='55000';end if;
 if d.challenge_date<>public.daily_challenge_day() then raise exception 'This daily challenge has closed. Open today’s challenge to continue.' using errcode='55000';end if;
 select q into item from jsonb_array_elements(d.items) q where q->'problem'->>'id'=problem_id;
 if item is null or (selected is not null and not exists(select 1 from jsonb_array_elements(item->'problem'->'options') o where o->>'label'=selected)) then
  raise exception 'Choose an answer from this challenge.' using errcode='22023';end if;
 update public.daily_challenges set answers=answers||jsonb_build_object(problem_id,selected) where id=d.id;
 return public.daily_challenge_status();
end $$;

create function public.finish_daily_challenge(challenge_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.daily_challenges; previous integer; next_rating integer; correct integer; change integer;
begin
 if auth.uid() is null then raise exception 'Please sign in to continue.' using errcode='42501';end if;
 select rating into previous from public.profiles where id=auth.uid() for update;
 select * into d from public.daily_challenges where id=challenge_id and user_id=auth.uid() for update;
 if not found then raise exception 'Challenge not found' using errcode='P0002';end if;
 if d.challenge_date<>public.daily_challenge_day() then raise exception 'This daily challenge has closed. Open today’s challenge to continue.' using errcode='55000';end if;
 if d.completed_at is not null then return public.daily_challenge_status();end if;
 if exists(select 1 from unnest(d.question_ids) p where coalesce(d.answers->>p,'')='') then raise exception 'Answer all five questions before submitting.' using errcode='22023';end if;
 select count(*) into correct from jsonb_array_elements(d.items) item
 where exists(select 1 from jsonb_array_elements_text(coalesce(nullif(item->'solution'->'accepted_answers','null'::jsonb),jsonb_build_array(item->'solution'->>'correct_answer'))) a
  where upper(regexp_replace(a,'[[:space:],]','','g'))=upper(regexp_replace(d.answers->>(item->'problem'->>'id'),'[[:space:],]','','g')));
 change:=case correct when 5 then 20 when 4 then 12 when 3 then 3 when 2 then -2 when 1 then -5 else -8 end;
 next_rating:=greatest(1,previous+change);
 update public.daily_challenges set completed_at=now(),correct_count=correct,old_rating=previous,new_rating=next_rating,rating_delta=next_rating-previous where id=d.id;
 update public.profiles set rating=next_rating,updated_at=now() where id=auth.uid();
 insert into public.rating_history(user_id,daily_challenge_id,old_rating,new_rating,policy_version) values(auth.uid(),d.id,previous,next_rating,'daily-v1');
 return public.daily_challenge_status();
end $$;

-- Avoid exposing an assigned answer through a simultaneous practice/mock session.
-- Lock the same profile as start_daily_challenge to close cross-request races.
create function public.guard_daily_question_access() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform id from public.profiles where id=new.user_id for update;
 if tg_table_name='practice_sessions' then
  if exists(select 1 from public.daily_challenges d where d.user_id=new.user_id and d.challenge_date=public.daily_challenge_day() and d.completed_at is null and new.problem_id=any(d.question_ids)) then
   raise exception 'Finish your daily challenge before practicing this question.' using errcode='55000';end if;
 else
  if exists(select 1 from public.daily_challenges d join public.contest_problems cp on cp.problem_id=any(d.question_ids) where d.user_id=new.user_id and d.challenge_date=public.daily_challenge_day() and d.completed_at is null and cp.contest_id=new.contest_id) then
   raise exception 'Finish your daily challenge before starting a mock that includes its questions.' using errcode='55000';end if;
 end if;
 return new;
end $$;
create trigger daily_guard_practice before insert on public.practice_sessions for each row execute function public.guard_daily_question_access();
create trigger daily_guard_contest before insert on public.contest_attempts for each row execute function public.guard_daily_question_access();

revoke all on function public.daily_challenge_day(),public.daily_challenge_status(),public.start_daily_challenge(),public.save_daily_answer(uuid,text,text),public.finish_daily_challenge(uuid),public.guard_daily_question_access() from public,anon,authenticated;
grant execute on function public.daily_challenge_status(),public.start_daily_challenge(),public.save_daily_answer(uuid,text,text),public.finish_daily_challenge(uuid) to authenticated;
create or replace function public.admin_reset_data(reset_scope text, confirmation text, operation_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare affected jsonb; expected text;
begin
 if auth.uid() is null or not public.is_site_admin() then raise exception 'Administrator access required' using errcode='42501';end if;
 if reset_scope not in ('progress','community') or reset_scope is null then raise exception 'Invalid reset scope' using errcode='22023';end if;
 expected:=case when reset_scope='progress' then 'RESET PROGRESS' else 'CLEAR BOOKMARKS AND REPORTS' end;
 if confirmation is distinct from expected then raise exception 'Confirmation does not match' using errcode='22023';end if;
 if operation_reason is null or length(btrim(operation_reason)) not between 1 and 500 then raise exception 'Enter a reason of 1–500 characters' using errcode='22023';end if;
 if reset_scope='progress' then
  lock table public.contests,public.profiles,public.contest_attempts,public.contest_answers,public.practice_sessions,public.practice_attempts,public.rating_history,public.daily_challenges in share row exclusive mode;
  if exists(select 1 from public.contests where published and kind='rated' and starts_at<=now() and ends_at>now()) then
   raise exception 'Wait until active rated contests close before resetting progress' using errcode='55000';
  end if;
  affected:=jsonb_build_object('daily_challenges_deleted',(select count(*) from public.daily_challenges),'profiles_reset',(select count(*) from public.profiles),'practice_attempts_deleted',(select count(*) from public.practice_attempts),'contest_attempts_deleted',(select count(*) from public.contest_attempts));
  delete from public.rating_history;
  delete from public.daily_challenges;
  delete from public.contest_answers;
  delete from public.contest_attempts;
  delete from public.practice_attempts;
  delete from public.practice_sessions;
  update public.profiles set rating=800,contests_attended=0,updated_at=now();
  -- Closed events must not later re-apply ratings from before the reset.
  update public.contests set ratings_processed_at=coalesce(ratings_processed_at,now()) where kind='rated' and ends_at<=now();
 else
  lock table public.bookmarks,public.problem_reports in share row exclusive mode;
  affected:=jsonb_build_object('bookmarks_deleted',(select count(*) from public.bookmarks),'reports_deleted',(select count(*) from public.problem_reports));
  delete from public.bookmarks;
  delete from public.problem_reports;
 end if;
 insert into public.admin_data_audit(admin_id,action,reason,affected)
 values(auth.uid(),case when reset_scope='progress' then 'reset_progress' else 'clear_community' end,btrim(operation_reason),affected);
 return affected;
end $$;


-- Public dashboards expose completion dates and rating deltas, never answers.
create or replace function public.public_dashboard(requested_username text) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'practice',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'problem_id',a.problem_id,'is_correct',a.is_correct,'score',a.score,'created_at',a.created_at,'answered',a.selected_answer is not null) order by a.created_at desc) from public.practice_attempts a where a.user_id=p.id),'[]'::jsonb),
  'contests',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'contest_id',a.contest_id,'status',a.status,'score',a.score,'started_at',a.started_at,'finalized_at',a.finalized_at) order by a.started_at desc) from public.contest_attempts a join public.contests c on c.id=a.contest_id where a.user_id=p.id and a.status='finalized' and (c.kind='historical_mock' or c.review_at<=now())),'[]'::jsonb),
  'daily',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'completed_at',d.completed_at,'rating_delta',d.rating_delta) order by d.completed_at desc) from public.daily_challenges d where d.user_id=p.id and d.completed_at is not null),'[]'::jsonb)
 ) from public.profiles p where p.username=requested_username and (p.is_public or p.id=auth.uid());
$$;
notify pgrst,'reload schema';
commit;
