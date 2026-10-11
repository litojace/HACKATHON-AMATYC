begin;
set role authenticated;
select set_config('test.uid','00000000-0000-4000-8000-000000000002',true);
select public.report_problem('amatyc-2025-spring-q01','unclear_wording','Please clarify the wording.');
do $$ begin
 begin perform public.admin_problem_reports();raise exception 'Student read reports';exception when insufficient_privilege then null;end;
 begin perform public.admin_review_problem_report(gen_random_uuid(),'resolved','');raise exception 'Student reviewed report';exception when insufficient_privilege then null;end;
 begin perform 1 from public.problem_reports;raise exception 'Student read report table';exception when insufficient_privilege then null;end;
 begin perform public.report_problem('amatyc-2025-spring-q01','invalid','Details');raise exception 'Invalid category accepted';exception when check_violation then null;end;
 begin perform public.report_problem('amatyc-2025-spring-q01','other','   ');raise exception 'Empty report accepted';exception when check_violation then null;end;
 begin perform public.report_problem('amatyc-2025-spring-q01','other',repeat('x',2001));raise exception 'Oversized report accepted';exception when check_violation then null;end;
end $$;
select set_config('test.uid','00000000-0000-4000-8000-000000000001',true);
do $$ declare report jsonb;begin
 report:=public.admin_problem_reports()->0;
 if report->>'reporter_id'<>'00000000-0000-4000-8000-000000000002' or report->>'status'<>'open' then raise exception 'Report attribution incorrect';end if;
 perform public.admin_review_problem_report((report->>'id')::uuid,'resolved','Wording clarified.');
 report:=public.admin_problem_reports()->0;
 if report->>'status'<>'resolved' or report->>'admin_note'<>'Wording clarified.' or report->>'reviewed_by'<>'00000000-0000-4000-8000-000000000001' then raise exception 'Review not saved';end if;
end $$;
do $$ declare record jsonb; result jsonb;begin
 record:=public.admin_problem_records('amatyc-2025-spring-q01') || jsonb_build_object('id','reported-unused-question','contest_name','Community problems');
 perform public.admin_save_problem(record,true);
 perform public.report_problem('reported-unused-question','other','Please check this question.');
 result:=public.admin_delete_problem('reported-unused-question');
 if result->>'history_preserved'<>'true' then raise exception 'Reported question history lost';end if;
 if not exists(select 1 from jsonb_array_elements(public.admin_problem_reports()) r where r->>'problem_id'='reported-unused-question' and r->>'problem_deleted'='true') then raise exception 'Deleted question report lost';end if;
 begin
  perform public.report_problem('reported-unused-question','other','Another report');
  raise exception 'Deleted question accepted report';
 exception when raise_exception then if sqlerrm<>'Problem not available' then raise;end if;end;
end $$;
set role anon;
do $$ begin
 begin perform public.report_problem('amatyc-2025-spring-q01','other','Details');raise exception 'Guest report allowed';exception when insufficient_privilege then null;end;
 begin perform public.admin_problem_reports();raise exception 'Guest read reports';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'PASS: reporting, validation, private queue, admin review and guest restrictions';
