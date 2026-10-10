begin;
-- This migration targets a fresh project, not the insecure legacy v1 schema.
do $$ begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='problems' and column_name='correct_answer') then
   raise exception 'Legacy v1 schema detected. Use a fresh project or migrate reviewed data manually; never drop existing user data automatically.';
 end if;
end $$;
create table public.schools(id uuid primary key default gen_random_uuid(),name text unique not null);
create table public.profiles(
 id uuid primary key references auth.users on delete cascade, username text unique not null,
 full_name text not null default 'Student',school text,avatar_url text,
 rating integer not null default 1500 check(rating>=1),contests_attended integer not null default 0,
 is_public boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.topics(id text primary key,name text not null unique,parent_id text references public.topics);
create table public.problems(
 id text primary key,source_exam text not null,question_number integer not null check(question_number>0),title text not null,
 question_latex text not null,category_id text not null references public.topics,
 difficulty text not null check(difficulty in ('Easy','Medium','Hard')),difficulty_rating integer check(difficulty_rating>=0),
 figure_required boolean not null default false,figure_image_path text,
 publication_status text not null default 'draft' check(publication_status in ('draft','published')),
 verification_status text not null default 'unreviewed' check(verification_status in ('unreviewed','answer_verified','fully_verified')),
 source_question_file text,source_answer_key_file text,created_at timestamptz not null default now(),
 check(not figure_required or figure_image_path is not null));
create table public.problem_options(problem_id text references public.problems on delete cascade,label text check(label in ('A','B','C','D','E')),text text not null,primary key(problem_id,label));
create table public.problem_solutions(problem_id text primary key references public.problems on delete cascade,correct_answer text not null check(correct_answer in ('A','B','C','D','E')),written_solution text,calculator_trick jsonb,verification_status text not null default 'unreviewed');
create table public.problem_topics(problem_id text references public.problems on delete cascade,topic_id text references public.topics,primary key(problem_id,topic_id));
create table public.contests(
 id text primary key,name text not null,description text not null default '',year integer,semester text,
 kind text not null default 'historical_mock' check(kind in ('historical_mock','rated')),
 duration_seconds integer not null default 3600 check(duration_seconds between 60 and 86400),question_count integer not null default 20 check(question_count between 1 and 100),
 correct_points numeric not null default 2,incorrect_points numeric not null default -0.5,blank_points numeric not null default 0,
 starts_at timestamptz,ends_at timestamptz,review_at timestamptz,published boolean not null default false,
 rating_enabled boolean not null default false check(rating_enabled=false),
 ranking_policy text not null default 'score_desc_time_asc',tie_policy text not null default 'shared_rank',
 participation_rules text not null default 'Authenticated participants; one rated attempt per event.',
 check(kind<>'rated' or (starts_at is not null and ends_at>starts_at and review_at>=ends_at)));
create table public.contest_problems(contest_id text references public.contests on delete cascade,problem_id text references public.problems,position integer not null check(position>0),primary key(contest_id,problem_id),unique(contest_id,position));
create table public.contest_attempts(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles on delete cascade,contest_id text not null references public.contests,
 started_at timestamptz not null default now(),deadline timestamptz not null,status text not null default 'active' check(status in ('active','finalized')),
 finalized_at timestamptz,score numeric,time_spent_seconds integer,
 check(deadline>started_at),check((status='active' and finalized_at is null and score is null) or (status='finalized' and finalized_at is not null and score is not null)));
create unique index one_active_attempt on public.contest_attempts(user_id,contest_id) where status='active';
create table public.contest_answers(attempt_id uuid references public.contest_attempts on delete cascade,problem_id text references public.problems,selected_answer text check(selected_answer in ('A','B','C','D','E')),flagged boolean not null default false,saved_at timestamptz not null default now(),primary key(attempt_id,problem_id));
create table public.practice_sessions(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles on delete cascade,problem_id text not null references public.problems,started_at timestamptz not null default now());
create table public.practice_attempts(id uuid primary key references public.practice_sessions,user_id uuid not null references public.profiles on delete cascade,problem_id text not null references public.problems,selected_answer text check(selected_answer in ('A','B','C','D','E')),is_correct boolean not null,score numeric not null,time_spent_seconds integer not null,created_at timestamptz not null default now());
create table public.bookmarks(user_id uuid references public.profiles on delete cascade,problem_id text references public.problems on delete cascade,created_at timestamptz not null default now(),primary key(user_id,problem_id));
create table public.rating_history(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles,contest_id text not null references public.contests,old_rating integer not null,new_rating integer not null,policy_version text not null,created_at timestamptz not null default now(),unique(user_id,contest_id));
create index practice_user_time on public.practice_attempts(user_id,created_at desc);
create index attempts_user_time on public.contest_attempts(user_id,started_at desc);
create index profile_rating on public.profiles(rating desc,username);
create index published_problems on public.problems(publication_status,category_id,difficulty_rating);
-- Explicit grants: correctness data and result writes never receive client privileges.
do $$ declare t text;begin
 foreach t in array array['schools','profiles','topics','problems','problem_options','problem_solutions','problem_topics','contests','contest_problems','contest_attempts','contest_answers','practice_sessions','practice_attempts','bookmarks','rating_history'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 end loop;
end $$;
grant select on public.profiles,public.contests,public.bookmarks,public.practice_attempts,public.contest_attempts,public.contest_answers,public.rating_history to authenticated;
grant select on public.profiles,public.contests to anon;
grant update(full_name,school,avatar_url,is_public) on public.profiles to authenticated;
grant insert,delete on public.bookmarks to authenticated;
create policy public_profiles on public.profiles for select using(is_public or id=auth.uid());
create policy own_profile on public.profiles for update using(id=auth.uid()) with check(id=auth.uid());
create policy published_contests on public.contests for select using(published);
create policy own_practice on public.practice_attempts for select using(user_id=auth.uid());
create policy own_attempts on public.contest_attempts for select using(user_id=auth.uid());
create policy own_answers on public.contest_answers for select using(exists(select 1 from public.contest_attempts a where a.id=attempt_id and a.user_id=auth.uid()));
create policy own_bookmarks_read on public.bookmarks for select using(user_id=auth.uid());
create policy own_bookmarks_add on public.bookmarks for insert with check(user_id=auth.uid() and exists(select 1 from public.problems p where p.id=problem_id and p.publication_status='published'));
-- Use an RPC-readable statement check instead of granting direct problem access to clients.
drop policy own_bookmarks_add on public.bookmarks;
create policy own_bookmarks_add on public.bookmarks for insert with check(user_id=auth.uid());
create policy own_bookmarks_delete on public.bookmarks for delete using(user_id=auth.uid());
create policy visible_ratings on public.rating_history for select using(user_id=auth.uid() or exists(select 1 from public.profiles p where p.id=user_id and p.is_public));
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
declare chosen text;
begin
 chosen:=left(regexp_replace(coalesce(new.raw_user_meta_data->>'username','student'),'[^A-Za-z0-9_]','','g'),30);
 if length(chosen)<3 then chosen:='student';end if;
 insert into public.profiles(id,username,full_name,school)
 values(new.id,chosen,left(coalesce(nullif(new.raw_user_meta_data->>'full_name',''),'Student'),80),left(nullif(new.raw_user_meta_data->>'school',''),100)) on conflict(username) do nothing;
 if not found then insert into public.profiles(id,username,full_name,school) values(new.id,chosen||'_'||replace(new.id::text,'-',''),'Student',null);end if;
 return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create function public.problem_json(pid text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',p.id,'contest_name',p.source_exam,'question_number',p.question_number,'title',p.title,'category',t.name,'topic_tags',coalesce((select jsonb_agg(t2.name) from public.problem_topics pt join public.topics t2 on t2.id=pt.topic_id where pt.problem_id=p.id),'[]'::jsonb),'difficulty',p.difficulty,'difficulty_rating',p.difficulty_rating,'question_latex',p.question_latex,'options',(select jsonb_agg(jsonb_build_object('label',o.label,'text',o.text) order by o.label) from public.problem_options o where o.problem_id=p.id),'figure_required',p.figure_required,'figure_image_path',p.figure_image_path,'verification_status',p.verification_status,'acceptance_rate',(select round(100.0*count(*) filter(where a.is_correct)/nullif(count(*),0),1) from public.practice_attempts a where a.problem_id=p.id)) from public.problems p join public.topics t on t.id=p.category_id where p.id=pid;
$$;
create function public.explanation_json(pid text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('correct_answer',s.correct_answer,'written_solution',s.written_solution,'calculator_trick',s.calculator_trick) from public.problem_solutions s where s.problem_id=pid;
$$;
create function public.problem_available(pid text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.problems p where p.id=pid and p.publication_status='published' and p.verification_status='fully_verified'
 and not exists(select 1 from public.contest_problems cp join public.contests c on c.id=cp.contest_id where cp.problem_id=p.id and c.kind='rated' and c.published and now()<c.review_at));
$$;
create function public.list_public_problems(problem_id text default null) returns jsonb language sql stable security definer set search_path='' as $$
 select case when problem_id is null then coalesce(jsonb_agg(public.problem_json(p.id) order by p.question_number),'[]'::jsonb) else (jsonb_agg(public.problem_json(p.id)))->0 end from public.problems p where public.problem_available(p.id) and (problem_id is null or p.id=problem_id);
$$;
create function public.start_practice(problem_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare session public.practice_sessions;begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if not public.problem_available(problem_id) then raise exception 'Problem not available';end if;
 perform id from public.profiles where id=auth.uid() for update;
 if (select count(*) from public.practice_sessions where user_id=auth.uid() and started_at>now()-interval '1 minute')>=30 then raise exception 'Practice rate limit';end if;
 insert into public.practice_sessions(user_id,problem_id) values(auth.uid(),problem_id) returning * into session;
 return jsonb_build_object('request_id',session.id,'started_at',session.started_at);
end $$;
create function public.submit_practice(problem_id text,selected text,request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare session public.practice_sessions;result public.practice_attempts;correct text;begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select * into session from public.practice_sessions s where s.id=request_id and s.user_id=auth.uid() and s.problem_id=submit_practice.problem_id for update;
 if not found or not public.problem_available(problem_id) then raise exception 'Unauthorized practice session';end if;
 if selected is not null and selected not in ('A','B','C','D','E') then raise exception 'Invalid answer';end if;
 select correct_answer into correct from public.problem_solutions where problem_solutions.problem_id=submit_practice.problem_id;
 insert into public.practice_attempts(id,user_id,problem_id,selected_answer,is_correct,score,time_spent_seconds)
 values(request_id,auth.uid(),problem_id,selected,coalesce(selected=correct,false),case when selected is null then 0 when selected=correct then 2 else -0.5 end,greatest(0,extract(epoch from now()-session.started_at)::integer)) on conflict(id) do nothing;
 select * into result from public.practice_attempts where id=request_id;
 return to_jsonb(result)||public.explanation_json(problem_id);
end $$;
create function public.finalize_internal(aid uuid) returns void language plpgsql security definer set search_path='' as $$
declare a public.contest_attempts;c public.contests;total numeric;begin
 select * into a from public.contest_attempts where id=aid for update;
 if a.status='finalized' then return;end if;
 select * into c from public.contests where id=a.contest_id;
 select coalesce(sum(case when ca.selected_answer is null then c.blank_points when ca.selected_answer=ps.correct_answer then c.correct_points else c.incorrect_points end),0) into total
 from public.contest_problems cp join public.problem_solutions ps on ps.problem_id=cp.problem_id left join public.contest_answers ca on ca.attempt_id=aid and ca.problem_id=cp.problem_id where cp.contest_id=a.contest_id;
 update public.contest_attempts set status='finalized',finalized_at=least(now(),deadline),score=total,time_spent_seconds=greatest(0,extract(epoch from least(now(),deadline)-started_at)::integer) where id=aid;
end $$;
create function public.attempt_json(aid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a public.contest_attempts;c public.contests;review boolean;begin
 select * into a from public.contest_attempts where id=aid;select * into c from public.contests where id=a.contest_id;
 review:=a.status='finalized' and (c.kind='historical_mock' or now()>=c.review_at);
 return to_jsonb(a)||jsonb_build_object('server_now',now(),'answers',coalesce((select jsonb_object_agg(ca.problem_id,ca.selected_answer) from public.contest_answers ca where ca.attempt_id=aid),'{}'::jsonb),'flags',coalesce((select jsonb_agg(ca.problem_id) from public.contest_answers ca where ca.attempt_id=aid and ca.flagged),'[]'::jsonb),'questions',(select jsonb_agg(public.problem_json(cp.problem_id) order by cp.position) from public.contest_problems cp where cp.contest_id=a.contest_id),'breakdown',case when review then (select jsonb_agg(public.problem_json(cp.problem_id)||jsonb_build_object('selected_answer',ca.selected_answer,'is_correct',coalesce(ca.selected_answer=ps.correct_answer,false),'points',case when ca.selected_answer is null then c.blank_points when ca.selected_answer=ps.correct_answer then c.correct_points else c.incorrect_points end,'explanation',public.explanation_json(cp.problem_id)) order by cp.position) from public.contest_problems cp join public.problem_solutions ps on ps.problem_id=cp.problem_id left join public.contest_answers ca on ca.attempt_id=aid and ca.problem_id=cp.problem_id where cp.contest_id=a.contest_id) else null end);
end $$;
create function public.start_contest(contest_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.contests;a public.contest_attempts;begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select * into c from public.contests where id=contest_id and published;
 if not found then raise exception 'Contest unavailable';end if;
 if c.kind='rated' and (now()<c.starts_at or now()>=c.ends_at) then raise exception 'Outside event window';end if;
 if (select count(*) from public.contest_problems where contest_problems.contest_id=start_contest.contest_id)<>c.question_count then raise exception 'Contest question count mismatch';end if;
 if exists(select 1 from public.contest_problems cp join public.problems p on p.id=cp.problem_id left join public.problem_solutions ps on ps.problem_id=p.id where cp.contest_id=c.id and (p.verification_status<>'fully_verified' or ps.correct_answer is null or (select count(*) from public.problem_options o where o.problem_id=p.id)<>5)) then raise exception 'Contest content not verified';end if;
 perform id from public.profiles where id=auth.uid() for update;
 select * into a from public.contest_attempts where user_id=auth.uid() and contest_attempts.contest_id=start_contest.contest_id and status='active';
 if found then return public.get_contest_attempt(a.id);end if;
 if c.kind='rated' and exists(select 1 from public.contest_attempts where user_id=auth.uid() and contest_attempts.contest_id=start_contest.contest_id) then raise exception 'Rated event permits one attempt';end if;
 insert into public.contest_attempts(user_id,contest_id,deadline) values(auth.uid(),c.id,case when c.kind='rated' then least(now()+make_interval(secs=>c.duration_seconds),c.ends_at) else now()+make_interval(secs=>c.duration_seconds) end) returning * into a;
 return public.attempt_json(a.id);
end $$;
create function public.get_contest_attempt(attempt_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.contest_attempts;begin
 select * into a from public.contest_attempts where id=attempt_id and user_id=auth.uid() for update;
 if not found then raise exception 'Attempt not found or unauthorized';end if;
 if a.status='active' and now()>=a.deadline then perform public.finalize_internal(attempt_id);end if;
 return public.attempt_json(attempt_id);
end $$;
create function public.save_contest_answer(attempt_id uuid,problem_id text,selected text,is_flagged boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.contest_attempts;begin
 select * into a from public.contest_attempts where id=attempt_id and user_id=auth.uid() for update;
 if not found then raise exception 'Attempt unauthorized';end if;
 if a.status<>'active' or now()>=a.deadline then raise exception 'Answer deadline passed';end if;
 if not exists(select 1 from public.contest_problems where contest_id=a.contest_id and contest_problems.problem_id=save_contest_answer.problem_id) then raise exception 'Question not in contest';end if;
 insert into public.contest_answers(attempt_id,problem_id,selected_answer,flagged) values(attempt_id,problem_id,selected,is_flagged)
 on conflict on constraint contest_answers_pkey do update set selected_answer=excluded.selected_answer,flagged=excluded.flagged,saved_at=now();
 return public.attempt_json(attempt_id);
end $$;
create function public.finalize_contest(attempt_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.contest_attempts where id=attempt_id and user_id=auth.uid()) then raise exception 'Attempt unauthorized';end if;
 perform public.finalize_internal(attempt_id);return public.attempt_json(attempt_id);
end $$;
create function public.finalize_expired_attempts() returns integer language plpgsql security definer set search_path='' as $$
declare a record;n integer:=0;begin
 for a in select id from public.contest_attempts where status='active' and deadline<=now() order by id for update skip locked loop
 perform public.finalize_internal(a.id);n:=n+1;end loop;return n;
end $$;
create function public.my_activity() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 return jsonb_build_object('practice',coalesce((select jsonb_agg(to_jsonb(p) order by created_at desc) from public.practice_attempts p where user_id=auth.uid()),'[]'::jsonb),'contests',coalesce((select jsonb_agg(to_jsonb(a) order by started_at desc) from public.contest_attempts a where user_id=auth.uid()),'[]'::jsonb),'ratings',coalesce((select jsonb_agg(to_jsonb(r) order by created_at) from public.rating_history r where user_id=auth.uid()),'[]'::jsonb),'bookmarks',coalesce((select jsonb_agg(problem_id) from public.bookmarks where user_id=auth.uid()),'[]'::jsonb));
end $$;
create function public.public_profiles(requested_username text default null) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'username',p.username,'full_name',p.full_name,'school',p.school,'avatar_url',p.avatar_url,'rating',p.rating,'contests_attended',p.contests_attended,'created_at',p.created_at,'is_public',p.is_public,'last_delta',coalesce((select new_rating-old_rating from public.rating_history r where r.user_id=p.id order by created_at desc limit 1),0),'rating_history',coalesce((select jsonb_agg(jsonb_build_object('new_rating',new_rating,'old_rating',old_rating,'created_at',created_at) order by created_at) from public.rating_history r where r.user_id=p.id),'[]'::jsonb)) order by p.rating desc,p.username collate "C"),'[]'::jsonb) from public.profiles p where p.is_public and (requested_username is null or p.username=requested_username);
$$;
create function public.public_statistics() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('problems',(select count(*) from public.problems p where public.problem_available(p.id)),'contests',(select count(*) from public.contests where published),'competitors',(select count(*) from public.profiles where is_public),'attempts',(select count(*) from public.practice_attempts),'demo',false);
$$;
-- Lock down every function; only intended RPCs become client-callable.
do $$ declare f record;begin for f in select oid::regprocedure signature from pg_proc where pronamespace='public'::regnamespace and proname in ('handle_new_user','problem_json','explanation_json','problem_available','list_public_problems','start_practice','submit_practice','finalize_internal','attempt_json','start_contest','get_contest_attempt','save_contest_answer','finalize_contest','finalize_expired_attempts','my_activity','public_profiles','public_statistics') loop execute format('revoke all on function %s from public,anon,authenticated',f.signature);end loop;end $$;
grant execute on function public.list_public_problems(text),public.public_profiles(text),public.public_statistics() to anon,authenticated;
grant execute on function public.start_practice(text),public.submit_practice(text,text,uuid),public.start_contest(text),public.get_contest_attempt(uuid),public.save_contest_answer(uuid,text,text,boolean),public.finalize_contest(uuid),public.my_activity() to authenticated;
grant execute on function public.finalize_expired_attempts() to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('problem-images','problem-images',true,5242880,array['image/png','image/jpeg','image/webp']) on conflict(id) do nothing;
create policy published_problem_images on storage.objects for select using(bucket_id='problem-images');
commit;
