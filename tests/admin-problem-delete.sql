reset role;
set role authenticated;
select set_config('test.uid','00000000-0000-4000-8000-000000000002',false);
do $$ begin
 begin
  perform public.admin_delete_problem('custom-admin-copy');
  raise exception 'Non-admin deleted problem';
 exception when insufficient_privilege then null;end;
end $$;
select set_config('test.uid','00000000-0000-4000-8000-000000000001',false);
do $$ begin
 begin
  perform public.admin_delete_problem('custom-admin-test');
  raise exception 'Deleted problem with existing session';
 exception when raise_exception then if sqlerrm not like 'This problem has attempts%' then raise;end if;end;
 if not (public.admin_delete_problem('custom-admin-copy')->>'deleted')::boolean then raise exception 'Delete failed';end if;
 begin
  perform public.admin_delete_problem('custom-admin-copy');
  raise exception 'Missing problem deleted twice';
 exception when raise_exception then if sqlerrm<>'Problem not found' then raise;end if;end;
end $$;
reset role;
do $$ begin
 if exists(select 1 from public.problems where id='custom-admin-copy') or exists(select 1 from public.problem_solutions where problem_id='custom-admin-copy') then raise exception 'Problem data retained';end if;
 if not exists(select 1 from public.problem_admin_audit where problem_id='custom-admin-copy' and action='delete' and previous_record->>'correct_answer'='A') then raise exception 'Missing deletion audit';end if;
end $$;
set role anon;
do $$ begin
 begin
  perform public.admin_delete_problem('custom-admin-test');
  raise exception 'Guest deleted problem';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: admin-only deletion, history protection, cascading cleanup and private audit';
