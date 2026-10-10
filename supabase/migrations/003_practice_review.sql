begin;
create function public.get_practice_solution(problem_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.problem_available(problem_id) or not exists(select 1 from public.practice_attempts p where p.user_id=auth.uid() and p.problem_id=get_practice_solution.problem_id) then raise exception 'A prior authorized submission is required';end if;
 return public.explanation_json(problem_id);
end $$;
revoke all on function public.get_practice_solution(text) from public,anon;
grant execute on function public.get_practice_solution(text) to authenticated;
commit;
