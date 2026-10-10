begin;
alter table public.problems add column source_image_path text, add column answer_format text not null default 'multiple_choice' check(answer_format in ('multiple_choice','short_answer')), add column difficulty_rationale text;
alter table public.problem_solutions add column accepted_answers jsonb, add column grading_policy text not null default 'standard' check(grading_policy in ('standard','credit_all','no_penalty'));
alter table public.problem_solutions drop constraint problem_solutions_correct_answer_check;
alter table public.contest_answers drop constraint contest_answers_selected_answer_check;
alter table public.practice_attempts drop constraint practice_attempts_selected_answer_check;
alter table public.problem_solutions add check(length(correct_answer) between 1 and 80);
alter table public.contest_answers add check(length(selected_answer) between 1 and 80);
alter table public.practice_attempts add check(length(selected_answer) between 1 and 80);
create function public.answer_matches(pid text,selected text) returns boolean language sql stable security definer set search_path='' as $$
select coalesce(s.grading_policy='credit_all' or (selected is not null and exists(select 1 from jsonb_array_elements_text(coalesce(s.accepted_answers,jsonb_build_array(s.correct_answer))) a where upper(regexp_replace(a,'[[:space:],]','','g'))=upper(regexp_replace(selected,'[[:space:],]','','g')))),false) from public.problem_solutions s where s.problem_id=pid;
$$;
create function public.answer_valid(pid text,selected text) returns boolean language sql stable security definer set search_path='' as $$
select selected is null or (length(selected) between 1 and 80 and case when p.answer_format='short_answer' then selected ~ '^[A-Za-z0-9[:space:].,:+/\-]+$' else exists(select 1 from public.problem_options o where o.problem_id=pid and o.label=selected) end) from public.problems p where p.id=pid;
$$;
revoke all on function public.answer_matches(text,text),public.answer_valid(text,text) from public,anon,authenticated;
create or replace function public.problem_json(pid text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',p.id,'contest_name',p.source_exam,'question_number',p.question_number,'title',p.title,'category',t.name,'topic_tags',coalesce((select jsonb_agg(t2.name) from public.problem_topics pt join public.topics t2 on t2.id=pt.topic_id where pt.problem_id=p.id),'[]'::jsonb),'difficulty',p.difficulty,'difficulty_rating',p.difficulty_rating,'question_latex',p.question_latex,'options',coalesce((select jsonb_agg(jsonb_build_object('label',o.label,'text',o.text) order by o.label) from public.problem_options o where o.problem_id=p.id),'[]'::jsonb),'figure_required',p.figure_required,'figure_image_path',p.figure_image_path,'verification_status',p.verification_status,'source_image_path',p.source_image_path,'answer_format',p.answer_format,'difficulty_rationale',p.difficulty_rationale,'acceptance_rate',(select round(100.0*count(*) filter(where a.is_correct)/nullif(count(*),0),1) from public.practice_attempts a where a.problem_id=p.id)) from public.problems p join public.topics t on t.id=p.category_id where p.id=pid;
$$;

create or replace function public.explanation_json(pid text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('correct_answer',s.correct_answer,'written_solution',s.written_solution,'calculator_trick',s.calculator_trick,'accepted_answers',s.accepted_answers,'grading_policy',s.grading_policy) from public.problem_solutions s where s.problem_id=pid;
$$;

create or replace function public.problem_available(pid text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.problems p where p.id=pid and p.publication_status='published' and p.verification_status in ('fully_verified','answer_verified')
 and not exists(select 1 from public.contest_problems cp join public.contests c on c.id=cp.contest_id where cp.problem_id=p.id and c.kind='rated' and c.published and now()<c.review_at));
$$;

create or replace function public.submit_practice(problem_id text,selected text,request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare session public.practice_sessions;result public.practice_attempts;correct text;begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select * into session from public.practice_sessions s where s.id=request_id and s.user_id=auth.uid() and s.problem_id=submit_practice.problem_id for update;
 if not found or not public.problem_available(problem_id) then raise exception 'Unauthorized practice session';end if;
 if not public.answer_valid(problem_id,selected) then raise exception 'Invalid answer';end if;
 select correct_answer into correct from public.problem_solutions where problem_solutions.problem_id=submit_practice.problem_id;
 insert into public.practice_attempts(id,user_id,problem_id,selected_answer,is_correct,score,time_spent_seconds)
 values(request_id,auth.uid(),problem_id,selected,public.answer_matches(problem_id,selected),case when public.answer_matches(problem_id,selected) then 2 when selected is null or (select grading_policy from public.problem_solutions where problem_solutions.problem_id=submit_practice.problem_id)='no_penalty' then 0 else -0.5 end,greatest(0,extract(epoch from now()-session.started_at)::integer)) on conflict(id) do nothing;
 select * into result from public.practice_attempts where id=request_id;
 return to_jsonb(result)||public.explanation_json(problem_id);
end $$;

create or replace function public.finalize_internal(aid uuid) returns void language plpgsql security definer set search_path='' as $$
declare a public.contest_attempts;c public.contests;total numeric;begin
 select * into a from public.contest_attempts where id=aid for update;
 if a.status='finalized' then return;end if;
 select * into c from public.contests where id=a.contest_id;
 select coalesce(sum(case when public.answer_matches(cp.problem_id,ca.selected_answer) then c.correct_points when ca.selected_answer is null or ps.grading_policy='no_penalty' then c.blank_points else c.incorrect_points end),0) into total
 from public.contest_problems cp join public.problem_solutions ps on ps.problem_id=cp.problem_id left join public.contest_answers ca on ca.attempt_id=aid and ca.problem_id=cp.problem_id where cp.contest_id=a.contest_id;
 update public.contest_attempts set status='finalized',finalized_at=least(now(),deadline),score=total,time_spent_seconds=greatest(0,extract(epoch from least(now(),deadline)-started_at)::integer) where id=aid;
end $$;

create or replace function public.attempt_json(aid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a public.contest_attempts;c public.contests;review boolean;begin
 select * into a from public.contest_attempts where id=aid;select * into c from public.contests where id=a.contest_id;
 review:=a.status='finalized' and (c.kind='historical_mock' or now()>=c.review_at);
 return to_jsonb(a)||jsonb_build_object('server_now',now(),'answers',coalesce((select jsonb_object_agg(ca.problem_id,ca.selected_answer) from public.contest_answers ca where ca.attempt_id=aid),'{}'::jsonb),'flags',coalesce((select jsonb_agg(ca.problem_id) from public.contest_answers ca where ca.attempt_id=aid and ca.flagged),'[]'::jsonb),'questions',(select jsonb_agg(public.problem_json(cp.problem_id) order by cp.position) from public.contest_problems cp where cp.contest_id=a.contest_id),'breakdown',case when review then (select jsonb_agg(public.problem_json(cp.problem_id)||jsonb_build_object('selected_answer',ca.selected_answer,'is_correct',public.answer_matches(cp.problem_id,ca.selected_answer),'points',case when public.answer_matches(cp.problem_id,ca.selected_answer) then c.correct_points when ca.selected_answer is null or ps.grading_policy='no_penalty' then c.blank_points else c.incorrect_points end,'explanation',public.explanation_json(cp.problem_id)) order by cp.position) from public.contest_problems cp join public.problem_solutions ps on ps.problem_id=cp.problem_id left join public.contest_answers ca on ca.attempt_id=aid and ca.problem_id=cp.problem_id where cp.contest_id=a.contest_id) else null end);
end $$;

create or replace function public.start_contest(contest_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.contests;a public.contest_attempts;begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select * into c from public.contests where id=contest_id and published;
 if not found then raise exception 'Contest unavailable';end if;
 if c.kind='rated' and (now()<c.starts_at or now()>=c.ends_at) then raise exception 'Outside event window';end if;
 if (select count(*) from public.contest_problems where contest_problems.contest_id=start_contest.contest_id)<>c.question_count then raise exception 'Contest question count mismatch';end if;
 if exists(select 1 from public.contest_problems cp join public.problems p on p.id=cp.problem_id left join public.problem_solutions ps on ps.problem_id=p.id where cp.contest_id=c.id and (p.verification_status not in ('fully_verified','answer_verified') or ps.correct_answer is null or (p.answer_format='multiple_choice' and (select count(*) from public.problem_options o where o.problem_id=p.id) not between 2 and 5))) then raise exception 'Contest content not verified';end if;
 perform id from public.profiles where id=auth.uid() for update;
 select * into a from public.contest_attempts where user_id=auth.uid() and contest_attempts.contest_id=start_contest.contest_id and status='active';
 if found then return public.get_contest_attempt(a.id);end if;
 if c.kind='rated' and exists(select 1 from public.contest_attempts where user_id=auth.uid() and contest_attempts.contest_id=start_contest.contest_id) then raise exception 'Rated event permits one attempt';end if;
 insert into public.contest_attempts(user_id,contest_id,deadline) values(auth.uid(),c.id,case when c.kind='rated' then least(now()+make_interval(secs=>c.duration_seconds),c.ends_at) else now()+make_interval(secs=>c.duration_seconds) end) returning * into a;
 return public.attempt_json(a.id);
end $$;

create or replace function public.save_contest_answer(attempt_id uuid,problem_id text,selected text,is_flagged boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.contest_attempts;begin
 select * into a from public.contest_attempts where id=attempt_id and user_id=auth.uid() for update;
 if not found then raise exception 'Attempt unauthorized';end if;
 if a.status<>'active' or now()>=a.deadline then raise exception 'Answer deadline passed';end if;
 if not exists(select 1 from public.contest_problems where contest_id=a.contest_id and contest_problems.problem_id=save_contest_answer.problem_id) then raise exception 'Question not in contest';end if;
 if not public.answer_valid(problem_id,selected) then raise exception 'Invalid answer';end if;
 insert into public.contest_answers(attempt_id,problem_id,selected_answer,flagged) values(attempt_id,problem_id,selected,is_flagged)
 on conflict on constraint contest_answers_pkey do update set selected_answer=excluded.selected_answer,flagged=excluded.flagged,saved_at=now();
 return public.attempt_json(attempt_id);
end $$;

create or replace function public.import_problem_records(records jsonb,publish boolean default false) returns integer language plpgsql security definer set search_path='' as $$
declare p jsonb;o jsonb;tag text;tid text;count_imported integer:=0;begin
 if jsonb_typeof(records)<>'array' then raise exception 'Records must be an array';end if;
 for p in select value from jsonb_array_elements(records) loop
 if publish and not ((p->>'verification_status'='fully_verified' and nullif(p->>'written_solution','') is not null) or (p->>'verification_status'='answer_verified' and nullif(p->>'source_image_path','') is not null and nullif(p->>'source_answer_key_file','') is not null)) then raise exception 'Publication requires reviewed answer and solution';end if;
 if (coalesce(p->>'answer_format','multiple_choice')='multiple_choice' and jsonb_array_length(p->'options') not between 2 and 5) or (coalesce(p->>'answer_format','multiple_choice')='short_answer' and jsonb_array_length(p->'options')<>0) or (select count(distinct x->>'label') from jsonb_array_elements(p->'options') x)<>jsonb_array_length(p->'options') then raise exception 'Choices must match the original response format';end if;
 -- Published records are immutable through this importer. Use a new ID for revisions.
 if exists(select 1 from public.problems where id=p->>'id' and publication_status='published') then continue;end if;
 tid:=lower(regexp_replace(p->>'category','[^A-Za-z0-9]+','-','g'));
 insert into public.topics(id,name) values(tid,p->>'category') on conflict(id) do nothing;
 insert into public.problems(id,source_exam,question_number,title,question_latex,category_id,difficulty,difficulty_rating,figure_required,figure_image_path,publication_status,verification_status,source_question_file,source_answer_key_file,source_image_path,answer_format,difficulty_rationale)
 values(p->>'id',p->>'contest_name',(p->>'question_number')::integer,p->>'title',p->>'question_latex',tid,p->>'difficulty',(p->>'difficulty_rating')::integer,(p->>'figure_required')::boolean,p->>'figure_image_path',case when publish then 'published' else 'draft' end,p->>'verification_status',p->>'source_question_file',p->>'source_answer_key_file',p->>'source_image_path',coalesce(p->>'answer_format','multiple_choice'),p->>'difficulty_rationale')
 on conflict(id) do update set title=excluded.title,question_latex=excluded.question_latex,category_id=excluded.category_id,difficulty=excluded.difficulty,difficulty_rating=excluded.difficulty_rating,figure_required=excluded.figure_required,figure_image_path=excluded.figure_image_path,publication_status=excluded.publication_status,verification_status=excluded.verification_status,source_question_file=excluded.source_question_file,source_answer_key_file=excluded.source_answer_key_file,source_image_path=excluded.source_image_path,answer_format=excluded.answer_format,difficulty_rationale=excluded.difficulty_rationale;
 delete from public.problem_options where problem_id=p->>'id';
 for o in select value from jsonb_array_elements(p->'options') loop insert into public.problem_options values(p->>'id',o->>'label',o->>'text');end loop;
 insert into public.problem_solutions values(p->>'id',p->>'correct_answer',p->>'written_solution',p->'calculator_trick',p->>'verification_status',p->'accepted_answers',coalesce(p->>'grading_policy','standard')) on conflict(problem_id) do update set correct_answer=excluded.correct_answer,written_solution=excluded.written_solution,calculator_trick=excluded.calculator_trick,verification_status=excluded.verification_status,accepted_answers=excluded.accepted_answers,grading_policy=excluded.grading_policy;
 delete from public.problem_topics where problem_id=p->>'id';
 if not exists(select 1 from public.problem_solutions s where s.problem_id=p->>'id' and (s.grading_policy='credit_all' or (coalesce(p->>'answer_format','multiple_choice')='short_answer') or not exists(select 1 from jsonb_array_elements_text(coalesce(s.accepted_answers,jsonb_build_array(s.correct_answer))) a where not exists(select 1 from public.problem_options o where o.problem_id=s.problem_id and o.label=a)))) then raise exception 'Key does not match choices';end if;
 for tag in select jsonb_array_elements_text(p->'topic_tags') loop
 tid:=lower(regexp_replace(tag,'[^A-Za-z0-9]+','-','g'));insert into public.topics(id,name) values(tid,tag) on conflict(id) do nothing;
 insert into public.problem_topics values(p->>'id',tid) on conflict do nothing;end loop;
 count_imported:=count_imported+1;
 end loop;return count_imported;
end $$;
commit;
