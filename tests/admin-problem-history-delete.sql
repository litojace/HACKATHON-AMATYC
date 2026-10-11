set role authenticated;
select set_config('test.uid','00000000-0000-4000-8000-000000000001',false);
do $$ declare result jsonb;begin
 result:=public.admin_delete_problem('custom-admin-test');
 if result->>'history_preserved'<>'true' then raise exception 'History not preserved';end if;
 if public.list_public_problems('custom-admin-test') is not null then raise exception 'Deleted problem public';end if;
 if exists(select 1 from jsonb_array_elements(public.admin_problem_records()) p where p->>'id'='custom-admin-test') then raise exception 'Deleted problem in admin list';end if;
 begin
  perform public.admin_problem_records('custom-admin-test');
  raise exception 'Deleted problem editable';
 exception when raise_exception then if sqlerrm<>'Problem not found' then raise;end if;end;
end $$;
reset role;
do $$ begin
 if not exists(select 1 from public.practice_sessions where problem_id='custom-admin-test') or not exists(select 1 from public.problem_solutions where problem_id='custom-admin-test') then raise exception 'Historical grading data lost';end if;
end $$;
select 'PASS: deletion hides used problems while preserving history';
