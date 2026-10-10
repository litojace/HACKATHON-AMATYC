begin;
create function public.import_problem_records(records jsonb,publish boolean default false) returns integer language plpgsql security definer set search_path='' as $$
declare p jsonb;o jsonb;tag text;tid text;count_imported integer:=0;begin
 if jsonb_typeof(records)<>'array' then raise exception 'Records must be an array';end if;
 for p in select value from jsonb_array_elements(records) loop
 if publish and (p->>'verification_status'<>'fully_verified' or nullif(p->>'written_solution','') is null) then raise exception 'Publication requires reviewed answer and solution';end if;
 if jsonb_array_length(p->'options')<>5 or (select count(distinct x->>'label') from jsonb_array_elements(p->'options') x)<>5 then raise exception 'Five unique choices required';end if;
 -- Published records are immutable through this importer. Use a new ID for revisions.
 if exists(select 1 from public.problems where id=p->>'id' and publication_status='published') then continue;end if;
 tid:=lower(regexp_replace(p->>'category','[^A-Za-z0-9]+','-','g'));
 insert into public.topics(id,name) values(tid,p->>'category') on conflict(id) do nothing;
 insert into public.problems(id,source_exam,question_number,title,question_latex,category_id,difficulty,difficulty_rating,figure_required,figure_image_path,publication_status,verification_status,source_question_file,source_answer_key_file)
 values(p->>'id',p->>'contest_name',(p->>'question_number')::integer,p->>'title',p->>'question_latex',tid,p->>'difficulty',(p->>'difficulty_rating')::integer,(p->>'figure_required')::boolean,p->>'figure_image_path',case when publish then 'published' else 'draft' end,p->>'verification_status',p->>'source_question_file',p->>'source_answer_key_file')
 on conflict(id) do update set title=excluded.title,question_latex=excluded.question_latex,category_id=excluded.category_id,difficulty=excluded.difficulty,difficulty_rating=excluded.difficulty_rating,figure_required=excluded.figure_required,figure_image_path=excluded.figure_image_path,publication_status=excluded.publication_status,verification_status=excluded.verification_status,source_question_file=excluded.source_question_file,source_answer_key_file=excluded.source_answer_key_file;
 delete from public.problem_options where problem_id=p->>'id';
 for o in select value from jsonb_array_elements(p->'options') loop insert into public.problem_options values(p->>'id',o->>'label',o->>'text');end loop;
 insert into public.problem_solutions values(p->>'id',p->>'correct_answer',p->>'written_solution',p->'calculator_trick',p->>'verification_status') on conflict(problem_id) do update set correct_answer=excluded.correct_answer,written_solution=excluded.written_solution,calculator_trick=excluded.calculator_trick,verification_status=excluded.verification_status;
 delete from public.problem_topics where problem_id=p->>'id';
 for tag in select jsonb_array_elements_text(p->'topic_tags') loop
 tid:=lower(regexp_replace(tag,'[^A-Za-z0-9]+','-','g'));insert into public.topics(id,name) values(tid,tag) on conflict(id) do nothing;
 insert into public.problem_topics values(p->>'id',tid) on conflict do nothing;end loop;
 count_imported:=count_imported+1;
 end loop;return count_imported;
end $$;
revoke all on function public.import_problem_records(jsonb,boolean) from public,anon,authenticated;
grant execute on function public.import_problem_records(jsonb,boolean) to service_role;
commit;
