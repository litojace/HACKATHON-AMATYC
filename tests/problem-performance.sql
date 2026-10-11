do $$ declare old record; full_payload jsonb; directory jsonb; entry jsonb; expected jsonb; begin
 full_payload:=public.list_public_problems();directory:=public.list_public_problem_directory();
 if jsonb_array_length(full_payload)<>(select count(*) from public.test_old_problem_payloads where available) then raise exception 'Directory membership changed';end if;
 if jsonb_array_length(directory)<>jsonb_array_length(full_payload) then raise exception 'Summary membership differs';end if;
 for old in select * from public.test_old_problem_payloads loop
  -- topic_tags has no specified ordering in the old function; compare it as a set.
  if (public.problem_json(old.id)-'topic_tags') is distinct from (old.payload-'topic_tags') or
   (select jsonb_agg(v order by v) from jsonb_array_elements(public.problem_json(old.id)->'topic_tags') v) is distinct from
   (select jsonb_agg(v order by v) from jsonb_array_elements(old.payload->'topic_tags') v) then raise exception 'Full JSON contract changed: %',old.id;end if;
  if old.available then
   if public.list_public_problems(old.id) is distinct from public.problem_json(old.id) then raise exception 'Individual payload differs';end if;
   select v into entry from jsonb_array_elements(full_payload) v where v->>'id'=old.id;
   if entry is distinct from public.problem_json(old.id) then raise exception 'Full directory payload differs';end if;
   select v into entry from jsonb_array_elements(directory) v where v->>'id'=old.id;
   expected:=public.problem_json(old.id)-array['options','figure_required','figure_image_path','source_image_path','answer_format','difficulty_rationale'];
   expected:=expected||jsonb_build_object('option_count',jsonb_array_length(old.payload->'options'));
   if entry is distinct from expected then raise exception 'Summary contract differs: %',old.id;end if;
  elsif public.list_public_problems(old.id) is not null then raise exception 'Hidden problem exposed: %',old.id;end if;
 end loop;
 if public.list_public_problems('does-not-exist') is not null then raise exception 'Missing detail must be SQL null';end if;
 if public.problem_json('perf-zero')->'acceptance_rate'<>'null'::jsonb or public.problem_json('perf-zero')->'attempt_count'<>'0'::jsonb then raise exception 'Zero attempts';end if;
 if public.problem_json('perf-wrong')->'acceptance_rate'<>'0.0'::jsonb or public.problem_json('perf-wrong')->'accepted_count'<>'0'::jsonb then raise exception 'Incorrect-only attempts';end if;
 if public.problem_json('perf-mixed')->'acceptance_rate'<>'66.7'::jsonb or public.problem_json('perf-mixed')->'accepted_count'<>'2'::jsonb or public.problem_json('perf-mixed')->'attempt_count'<>'3'::jsonb then raise exception 'Mixed attempts';end if;
 if full_payload::text ~ '(correct_answer|written_solution|calculator_trick|accepted_answers|grading_policy)' or directory::text ~ '(correct_answer|written_solution|calculator_trick|accepted_answers|grading_policy)' then raise exception 'Confidential fields exposed';end if;
end $$;
set role anon;
do $$ begin
 if public.list_public_problems('perf-hidden') is not null or public.list_public_problems('perf-draft') is not null or public.list_public_problems('perf-unverified') is not null then raise exception 'Anon visibility violation';end if;
 if jsonb_array_length(public.list_public_problem_directory())=0 then raise exception 'Anon directory inaccessible';end if;
 if has_function_privilege('anon','public.problem_json(text)','execute') or has_function_privilege('anon','public.problem_payloads(text[],boolean)','execute') or has_function_privilege('anon','public.available_problem_ids(text)','execute') then raise exception 'Private builder accessible';end if;
end $$;
reset role;
set role authenticated;
do $$ begin
 if public.list_public_problems('perf-hidden') is not null then raise exception 'Authenticated visibility violation';end if;
 perform public.list_public_problem_directory();
 if has_function_privilege('authenticated','public.problem_payloads(text[],boolean)','execute') then raise exception 'Builder accessible';end if;
end $$;
reset role;
begin;
-- No rows is [] for both directories, null for individual calls.
update public.problems set publication_status='draft';
do $$ begin
 if public.list_public_problems()<>'[]'::jsonb or public.list_public_problem_directory()<>'[]'::jsonb or public.list_public_problems('perf-zero') is not null then raise exception 'Empty directory contract';end if;
end $$;
rollback;
begin;
update public.contests set review_at=now()-interval '1 hour',ends_at=now()-interval '2 hours',starts_at=now()-interval '3 hours' where id='perf-rated';
do $$ begin
 if public.list_public_problems('perf-hidden') is null then raise exception 'Reviewed rated problem still hidden';end if;
end $$;
rollback;
do $$ begin
 if exists(select 1 from pg_catalog.pg_proc where oid in ('public.problem_json(text)'::regprocedure,'public.list_public_problems(text)'::regprocedure,'public.list_public_problem_directory()'::regprocedure,'public.problem_payloads(text[],boolean)'::regprocedure,'public.available_problem_ids(text)'::regprocedure) and (not prosecdef or proconfig is distinct from array['search_path=""'])) then raise exception 'Function hardening missing';end if;
 if not (select relrowsecurity from pg_catalog.pg_class where oid='public.practice_attempts'::regclass) then raise exception 'RLS disabled';end if;
end $$;
select 'PASS: old/full_payload/summary JSON contracts, statistics edge cases, empty/missing retrieval, role grants and rated confidentiality';
begin;
-- Authorized participants retain the full question path during a rated contest.
update public.contests set starts_at=now()-interval '1 hour',ends_at=now()+interval '1 hour' where id='perf-rated';
insert into public.contest_attempts(id,user_id,contest_id,deadline) values('00000000-0000-4000-8000-000000000088','00000000-0000-4000-8000-000000000099','perf-rated',now()+interval '10 minutes');
select set_config('test.uid','00000000-0000-4000-8000-000000000099',true);
set local role authenticated;
do $$ declare attempt jsonb; begin
 attempt:=public.get_contest_attempt('00000000-0000-4000-8000-000000000088');
 if attempt->'questions'->0->>'id'<>'perf-hidden' or not (attempt->'questions'->0 ? 'options') then raise exception 'Authorized full contest question lost';end if;
 if attempt::text ~ '(correct_answer|written_solution|accepted_answers|grading_policy)' then raise exception 'Active contest leaked solution';end if;
end $$;
rollback;
select 'PASS: authorized full contest retrieval remains separate from public availability';
