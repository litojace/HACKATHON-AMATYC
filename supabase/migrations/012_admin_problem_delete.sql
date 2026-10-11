begin;
create function public.admin_delete_problem(pid text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare previous jsonb;begin
 if not public.is_site_admin() then raise exception 'Administrator access required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext('admin-problem-'||pid));
 lock table public.practice_sessions,public.contest_attempts,public.contest_problems in share row exclusive mode;
 perform id from public.problems where id=pid for update;
 if not found then raise exception 'Problem not found';end if;
 if exists(select 1 from public.practice_sessions where problem_id=pid)
 or exists(select 1 from public.practice_attempts where problem_id=pid)
 or exists(select 1 from public.contest_problems where problem_id=pid)
 or exists(select 1 from public.contest_answers where problem_id=pid) then
  raise exception 'This problem has attempts or belongs to a contest and cannot be deleted. Save it as a private draft to remove it from the problem library.';
 end if;
 previous:=public.admin_problem_records(pid);
 delete from public.problems where id=pid;
 insert into public.problem_admin_audit(user_id,problem_id,action,previous_record)
 values(auth.uid(),pid,'delete',previous);
 return jsonb_build_object('id',pid,'deleted',true);
end $$;
revoke all on function public.admin_delete_problem(text) from public,anon,authenticated;
grant execute on function public.admin_delete_problem(text) to authenticated;
commit;
