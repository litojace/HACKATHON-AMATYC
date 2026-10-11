begin;
alter table public.problems add column deleted_at timestamptz;
create or replace function public.admin_problem_records(pid text default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;begin
 if not public.is_site_admin() then raise exception 'Administrator access required' using errcode='42501';end if;
 if pid is null then
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'title',p.title,'difficulty',p.difficulty,'publication_status',p.publication_status,'category',t.name) order by p.created_at desc,p.id),'[]'::jsonb)
  into result from public.problems p join public.topics t on t.id=p.category_id where p.deleted_at is null;
 else
  select public.problem_json(p.id) || jsonb_build_object(
   'publication_status',p.publication_status,'source_question_file',p.source_question_file,'source_answer_key_file',p.source_answer_key_file,
   'correct_answer',s.correct_answer,'written_solution',s.written_solution,'calculator_trick',s.calculator_trick,
   'accepted_answers',coalesce(s.accepted_answers,jsonb_build_array(s.correct_answer)),
   'grading_policy',s.grading_policy,'difficulty_rationale',coalesce(p.difficulty_rationale,''))
  into result from public.problems p join public.problem_solutions s on s.problem_id=p.id where p.id=pid and p.deleted_at is null;
  if result is null then raise exception 'Problem not found';end if;
 end if;
 return result;
end $$;


create or replace function public.admin_delete_problem(pid text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare previous jsonb;preserve boolean;begin
 if not public.is_site_admin() then raise exception 'Administrator access required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext('admin-problem-'||pid));
 lock table public.practice_sessions,public.contest_attempts,public.contest_problems in share row exclusive mode;
 perform id from public.problems where id=pid and deleted_at is null for update;
 if not found then raise exception 'Problem not found';end if;
 select exists(select 1 from public.practice_sessions where problem_id=pid) or exists(select 1 from public.practice_attempts where problem_id=pid) or exists(select 1 from public.contest_problems where problem_id=pid) or exists(select 1 from public.contest_answers where problem_id=pid) into preserve;
 previous:=public.admin_problem_records(pid);
 if preserve then
  update public.problems set deleted_at=now(),publication_status='draft' where id=pid;
 else
  delete from public.problems where id=pid;
 end if;
 insert into public.problem_admin_audit(user_id,problem_id,action,previous_record)
 values(auth.uid(),pid,'delete',previous);
 return jsonb_build_object('id',pid,'deleted',true,'history_preserved',preserve);
end $$;
revoke all on function public.admin_delete_problem(text) from public,anon,authenticated;
grant execute on function public.admin_delete_problem(text) to authenticated;
commit;
