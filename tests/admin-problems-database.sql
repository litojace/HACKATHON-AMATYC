reset role;
set role authenticated;
select set_config('test.uid','00000000-0000-4000-8000-000000000002',false);
do $$ begin
 begin
  perform public.admin_problem_records();
  raise exception 'Non-admin read private problem records';
 exception when insufficient_privilege then null;end;
 begin
  perform public.admin_save_problem('{}',true);
  raise exception 'Non-admin created a problem';
 exception when insufficient_privilege then null;end;
 begin
  insert into storage.objects(bucket_id,name) values('problem-admin-images','unauthorized.png');
  raise exception 'Non-admin uploaded problem image';
 exception when insufficient_privilege then null;end;
end $$;
select set_config('test.uid','00000000-0000-4000-8000-000000000001',false);
do $$ declare p jsonb; r jsonb;begin
 p := '{"id":"custom-admin-test","title":"Admin test","contest_name":"Community problems","question_number":1,"category":"Algebra","topic_tags":["Addition"],"difficulty":"Easy","difficulty_rating":800,"question_latex":"Find 1+1","options":[{"label":"A","text":"2"},{"label":"B","text":"3"}],"correct_answer":"A","accepted_answers":["A"],"grading_policy":"standard","answer_format":"multiple_choice","figure_required":false,"figure_image_path":null,"source_image_path":null,"written_solution":null,"calculator_trick":null,"verification_status":"unreviewed","source_question_file":null,"source_answer_key_file":null,"publication_status":"draft","difficulty_rationale":""}';
 r:=public.admin_save_problem(p,true);
 if r->>'publication_status'<>'draft' or public.list_public_problems(r->>'id') is not null then raise exception 'Draft became publicly available';end if;
 begin
  perform public.admin_save_problem(p,true);
  raise exception 'Duplicate ID allowed';
 exception when raise_exception then if sqlerrm<>'Problem ID already exists' then raise;end if;end;
 begin
  perform public.admin_save_problem(p || '{"publication_status":"published"}',false);
  raise exception 'Unreviewed publication allowed';
 exception when raise_exception then if sqlerrm<>'Publication requires reviewed answer and solution' then raise;end if;end;
 p:=p || '{"publication_status":"published","verification_status":"fully_verified","written_solution":"1+1=2"}';
 r:=public.admin_save_problem(p,false);
 if public.list_public_problems(r->>'id') is null then raise exception 'Reviewed publication unavailable';end if;
 perform public.start_practice(r->>'id');
 begin
  perform public.admin_save_problem(p || '{"correct_answer":"B","accepted_answers":["B"]}',false);
  raise exception 'Historical answer changed';
 exception when raise_exception then if sqlerrm not like 'This problem has attempts%' then raise;end if;end;
 r:=public.admin_save_problem(p || '{"title":"Renamed"}',false);
 if r->>'title'<>'Renamed' or r->>'correct_answer'<>'A' then raise exception 'Safe edit failed';end if;
 perform public.admin_save_problem(p || '{"id":"custom-admin-copy","publication_status":"draft"}',true);
end $$;
insert into storage.objects(bucket_id,name) values('problem-admin-images','admin-question.png');
reset role;
do $$ begin
 if (select count(*) from public.problem_admin_audit where problem_id='custom-admin-test')<>3 then raise exception 'Audit history incomplete';end if;
end $$;
set role anon;
do $$ begin
 begin
  perform public.admin_problem_records();
  raise exception 'Guest read admin records';
 exception when insufficient_privilege then null;end;
 begin
  perform * from public.problem_admin_audit;
  raise exception 'Guest read private audit answers';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: admin CRUD, publication checks, private keys, upload authorization and historical grading protection';
