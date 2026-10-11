begin;
create function public.public_dashboard(requested_username text) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'practice', coalesce((select jsonb_agg(jsonb_build_object(
   'id',a.id,'problem_id',a.problem_id,'is_correct',a.is_correct,'score',a.score,
   'created_at',a.created_at,'answered',a.selected_answer is not null
  ) order by a.created_at desc) from public.practice_attempts a where a.user_id=p.id),'[]'::jsonb),
  'contests', coalesce((select jsonb_agg(jsonb_build_object(
   'id',a.id,'contest_id',a.contest_id,'status',a.status,'score',a.score,
   'started_at',a.started_at,'finalized_at',a.finalized_at
  ) order by a.started_at desc) from public.contest_attempts a
   join public.contests c on c.id=a.contest_id
   where a.user_id=p.id and a.status='finalized'
    and (c.kind='historical_mock' or c.review_at<=now())),'[]'::jsonb)
 ) from public.profiles p where p.username=requested_username and (p.is_public or p.id=auth.uid());
$$;
revoke all on function public.public_dashboard(text) from public,anon,authenticated;
grant execute on function public.public_dashboard(text) to anon,authenticated;
commit;
