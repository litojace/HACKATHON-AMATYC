begin;
alter table public.contests drop constraint contests_rating_enabled_check;
alter table public.contests add constraint rated_events_only check(not rating_enabled or kind='rated');
alter table public.contests add column ratings_processed_at timestamptz;
alter table public.problems add column contest_only boolean not null default false;

create or replace function public.admin_problem_records(pid text default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;begin
 if not public.is_site_admin() then raise exception 'Administrator access required' using errcode='42501';end if;
 if pid is null then
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'title',p.title,'difficulty',p.difficulty,'publication_status',p.publication_status,'category',t.name) order by p.created_at desc,p.id),'[]'::jsonb)
  into result from public.problems p join public.topics t on t.id=p.category_id where p.deleted_at is null and not p.contest_only;
 else
  select public.problem_json(p.id) || jsonb_build_object(
   'publication_status',p.publication_status,'source_question_file',p.source_question_file,'source_answer_key_file',p.source_answer_key_file,
   'correct_answer',s.correct_answer,'written_solution',s.written_solution,'calculator_trick',s.calculator_trick,
   'accepted_answers',coalesce(s.accepted_answers,jsonb_build_array(s.correct_answer)),
   'grading_policy',s.grading_policy,'difficulty_rationale',coalesce(p.difficulty_rationale,''))
  into result from public.problems p join public.problem_solutions s on s.problem_id=p.id where p.id=pid and p.deleted_at is null and not p.contest_only;
  if result is null then raise exception 'Problem not found';end if;
 end if;
 return result;
end $$;


create function public.admin_contest_records(cid text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 if not public.is_site_admin() then raise exception 'Administrator access required' using errcode='42501';end if;
 if cid is null then
  select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('participants',(select count(*) from public.contest_attempts a where a.contest_id=c.id)) order by c.starts_at desc nulls last,c.id),'[]') into result from public.contests c;
 else
  select jsonb_build_object('contest',to_jsonb(c),'server_now',now(),'participants',coalesce((
   select jsonb_agg(jsonb_build_object('id',a.id,'user_id',a.user_id,'username',p.username,'full_name',p.full_name,'status',a.status,'started_at',a.started_at,'deadline',a.deadline,'finalized_at',a.finalized_at,
    'answered',(select count(*) from public.contest_answers ca where ca.attempt_id=a.id and ca.selected_answer is not null),
    'flagged',(select count(*) from public.contest_answers ca where ca.attempt_id=a.id and ca.flagged),
    'elapsed_seconds',greatest(0,extract(epoch from coalesce(a.finalized_at,least(now(),a.deadline))-a.started_at)::integer),
    'score',case when a.status='finalized' then a.score else null end,'old_rating',rh.old_rating,'new_rating',rh.new_rating) order by a.started_at)
    from public.contest_attempts a join public.profiles p on p.id=a.user_id left join public.rating_history rh on rh.contest_id=a.contest_id and rh.user_id=a.user_id where a.contest_id=c.id),'[]'))
  into result from public.contests c where c.id=cid;
  if result is null then raise exception 'Contest not found';end if;
 end if;return result;
end $$;

create function public.admin_create_contest(record jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare cid text:='custom-contest-'||gen_random_uuid()::text;n integer;start_time timestamptz;end_time timestamptz;source_id text;copy_id text;source jsonb;position integer:=0;begin
 if not public.is_site_admin() then raise exception 'Administrator access required' using errcode='42501';end if;
 n:=(record->>'question_count')::integer;start_time:=(record->>'starts_at')::timestamptz;end_time:=(record->>'ends_at')::timestamptz;
 if n is null or n not in (5,10,20) or start_time is null or end_time is null or end_time-start_time<make_interval(secs=>n*180) or start_time<=now() then raise exception 'Choose a future start and a window long enough for the contest';end if;
 if nullif(trim(record->>'name'),'') is null or length(record->>'name')>160 then raise exception 'Invalid contest name';end if;
 if jsonb_typeof(record->'problem_ids') is distinct from 'array' or jsonb_array_length(record->'problem_ids')<>n or (select count(distinct p) from jsonb_array_elements_text(record->'problem_ids') p)<>n then raise exception 'Choose the required number of different problems';end if;
 lock table public.practice_sessions,public.contest_attempts,public.contest_problems in share row exclusive mode;
 insert into public.contests(id,name,description,year,semester,kind,duration_seconds,question_count,starts_at,ends_at,review_at,published,rating_enabled)
 values(cid,trim(record->>'name'),coalesce(record->>'description',''),extract(year from start_time)::integer,'Custom','rated',n*180,n,start_time,end_time,end_time+interval '15 minutes',coalesce((record->>'published')::boolean,false),true);
 for source_id in select jsonb_array_elements_text(record->'problem_ids') loop
  perform id from public.problems where id=source_id and deleted_at is null and not contest_only for update;
  if not found then raise exception 'Selected problem is unavailable';end if;
  source:=public.admin_problem_records(source_id);
  if not ((source->>'verification_status'='fully_verified' and nullif(trim(source->>'written_solution'),'') is not null) or (source->>'verification_status'='answer_verified' and nullif(source->>'source_image_path','') is not null and nullif(source->>'source_answer_key_file','') is not null)) then raise exception 'Every contest problem needs a reviewed answer and solution or verified source key';end if;
  position:=position+1;copy_id:='contest-question-'||gen_random_uuid()::text;
  source:=source||jsonb_build_object('id',copy_id,'contest_name',record->>'name','question_number',position);
  perform public.import_problem_records(jsonb_build_array(source),false);
  update public.problems set contest_only=true where id=copy_id;
  insert into public.contest_problems values(cid,copy_id,position);
 end loop;
 return (select to_jsonb(c) from public.contests c where c.id=cid);
end $$;

create function public.admin_publish_contest(cid text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.contests;begin
 if not public.is_site_admin() then raise exception 'Administrator access required' using errcode='42501';end if;
 select * into c from public.contests where id=cid for update;
 if not found then raise exception 'Contest not found';end if;
 if c.published then return to_jsonb(c);end if;
 if c.starts_at is null or c.starts_at<=now() then raise exception 'The start time has passed. Create a new contest with a future start';end if;
 if (select count(*) from public.contest_problems where contest_id=cid)<>c.question_count then raise exception 'Contest question count mismatch';end if;
 update public.contests set published=true where id=cid returning * into c;return to_jsonb(c);
end $$;

-- One serialized, atomic rating batch per event, using the existing TS policy.
create function public.process_due_contest_ratings() returns integer
language plpgsql security definer set search_path='' as $$
declare c public.contests;participants jsonb;p jsonb;q jsonb;total integer;rank integer;seed double precision;target double precision;low double precision;high double precision;mid double precision;deltas integer[];shift integer;i integer;j integer;old_value integer;new_value integer;processed integer:=0;begin
 if not pg_try_advisory_xact_lock(hashtext('contest-rating-batches')) then return 0;end if;
 perform public.finalize_expired_attempts();
 for c in select * from public.contests where published and rating_enabled and ratings_processed_at is null and now()>=review_at order by review_at,id for update loop
  perform p.id from public.profiles p where exists(select 1 from public.contest_attempts a where a.contest_id=c.id and a.user_id=p.id) order by p.id for update;
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'rating',p.rating,'score',a.score) order by p.id),'[]') into participants
  from public.contest_attempts a join public.profiles p on p.id=a.user_id where a.contest_id=c.id and a.status='finalized';
  total:=jsonb_array_length(participants);deltas:=array[]::integer[];
  for p in select value from jsonb_array_elements(participants) loop
   if total<2 then deltas:=array_append(deltas,0);continue;end if;
   select count(*) into rank from jsonb_array_elements(participants) x where (x->>'score')::numeric>=(p->>'score')::numeric;
   seed:=1;
   for q in select value from jsonb_array_elements(participants) where value->>'id'<>p->>'id' loop seed:=seed+1/(1+power(10::double precision,((p->>'rating')::double precision-(q->>'rating')::double precision)/400));end loop;
   target:=sqrt(rank*seed);low:=-10000;high:=10000;
   for j in 1..80 loop
    mid:=(low+high)/2;seed:=1;
    for q in select value from jsonb_array_elements(participants) where value->>'id'<>p->>'id' loop seed:=seed+1/(1+power(10::double precision,(mid-(q->>'rating')::double precision)/400));end loop;
    if seed>target then low:=mid;else high:=mid;end if;
   end loop;
   deltas:=array_append(deltas,floor(((low+high)/2-(p->>'rating')::integer)/2)::integer);
  end loop;
  if total>1 then select -floor(avg(d))::integer-1 into shift from unnest(deltas) d;else shift:=0;end if;
  i:=0;
  for p in select value from jsonb_array_elements(participants) loop
   i:=i+1;old_value:=(p->>'rating')::integer;new_value:=greatest(1,old_value+deltas[i]+shift);
   insert into public.rating_history(user_id,contest_id,old_rating,new_rating,policy_version) values((p->>'id')::uuid,c.id,old_value,new_value,'arena-v1-score-ties');
   update public.profiles set rating=new_value,contests_attended=contests_attended+1 where id=(p->>'id')::uuid;
  end loop;
  update public.contests set ratings_processed_at=now() where id=c.id;processed:=processed+1;
 end loop;return processed;
end $$;
revoke all on function public.admin_contest_records(text),public.admin_create_contest(jsonb),public.admin_publish_contest(text),public.process_due_contest_ratings() from public,anon,authenticated;
grant execute on function public.admin_contest_records(text),public.admin_create_contest(jsonb),public.admin_publish_contest(text) to authenticated;
grant execute on function public.process_due_contest_ratings() to service_role;
do $$ begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  perform cron.schedule('amatyc-contest-ratings','* * * * *','select public.process_due_contest_ratings();');
 else raise notice 'Enable Supabase Cron, then run supabase/contest_scheduler.sql for automatic ratings';end if;
end $$;
commit;
