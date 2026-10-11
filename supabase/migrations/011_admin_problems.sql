begin;
create table public.problem_admin_audit (
 id uuid primary key default gen_random_uuid(),
 user_id uuid references auth.users(id),problem_id text not null,
 action text not null,previous_record jsonb,new_record jsonb,
 created_at timestamptz not null default now()
);
alter table public.problem_admin_audit enable row level security;
revoke all on public.problem_admin_audit from anon,authenticated;

create function public.admin_problem_records(pid text default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;begin
 if not public.is_site_admin() then raise exception 'Administrator access required' using errcode='42501';end if;
 if pid is null then
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'title',p.title,'difficulty',p.difficulty,'publication_status',p.publication_status,'category',t.name) order by p.created_at desc,p.id),'[]'::jsonb)
  into result from public.problems p join public.topics t on t.id=p.category_id;
 else
  select public.problem_json(p.id) || jsonb_build_object(
   'publication_status',p.publication_status,'source_question_file',p.source_question_file,'source_answer_key_file',p.source_answer_key_file,
   'correct_answer',s.correct_answer,'written_solution',s.written_solution,'calculator_trick',s.calculator_trick,
   'accepted_answers',coalesce(s.accepted_answers,jsonb_build_array(s.correct_answer)),
   'grading_policy',s.grading_policy,'difficulty_rationale',coalesce(p.difficulty_rationale,''))
  into result from public.problems p join public.problem_solutions s on s.problem_id=p.id where p.id=pid;
  if result is null then raise exception 'Problem not found';end if;
 end if;
 return result;
end $$;

create function public.admin_save_problem(problem_record jsonb,create_new boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare pid text:=problem_record->>'id';existing public.problems;previous jsonb;result jsonb;changed boolean;begin
 if not public.is_site_admin() then raise exception 'Administrator access required' using errcode='42501';end if;
 if pid is null or pid !~ '^[a-z0-9-]{1,100}$' or pid like 'demo-%' then raise exception 'Invalid problem ID';end if;
 if coalesce(problem_record->>'publication_status','') not in ('draft','published') or
  nullif(trim(problem_record->>'title'),'') is null or nullif(trim(problem_record->>'question_latex'),'') is null or
  nullif(trim(problem_record->>'contest_name'),'') is null or nullif(trim(problem_record->>'category'),'') is null then raise exception 'Invalid problem fields';end if;
 if coalesce(problem_record->>'answer_format','') not in ('multiple_choice','short_answer') or
  length(coalesce(problem_record->>'correct_answer','')) not between 1 and 80 then raise exception 'Invalid answer';end if;
 if problem_record->>'answer_format'='short_answer' and exists(select 1 from jsonb_array_elements_text(problem_record->'accepted_answers') a where a !~ '^[A-Za-z0-9[:space:].,:+/\-]+$') then raise exception 'Invalid answer format';end if;
 if problem_record->>'answer_format'='multiple_choice' and not exists(select 1 from jsonb_array_elements(problem_record->'options') o where o->>'label'=problem_record->>'correct_answer') then raise exception 'Correct answer must match an option';end if;
 if not exists(select 1 from jsonb_array_elements_text(problem_record->'accepted_answers') a where a=problem_record->>'correct_answer') then raise exception 'Accepted answers must include the correct answer';end if;
 perform pg_advisory_xact_lock(hashtext('admin-problem-'||pid));
 -- Serialize edits against session starts and contest membership changes.
 lock table public.practice_sessions,public.contest_attempts,public.contest_problems in share row exclusive mode;
 select * into existing from public.problems where id=pid for update;
 if found then
  if create_new then raise exception 'Problem ID already exists';end if;
  previous:=public.admin_problem_records(pid);
  select exists(select 1 from unnest(array['question_latex','options','correct_answer','accepted_answers','grading_policy','answer_format','figure_required','figure_image_path','source_image_path']) k where previous->k is distinct from problem_record->k) into changed;
  if changed and (exists(select 1 from public.practice_sessions where problem_id=pid) or exists(select 1 from public.practice_attempts where problem_id=pid) or exists(select 1 from public.contest_problems where problem_id=pid)) then
   raise exception 'This problem has attempts or belongs to a contest. Create a revised copy to change its question, images or answers.';
  end if;
  -- The existing importer skips published records. The status change is private
  -- to this transaction, and rolls back if validation or import fails.
  update public.problems set publication_status='draft' where id=pid;
 elsif not create_new then raise exception 'Problem not found';
 end if;
 perform public.import_problem_records(jsonb_build_array(problem_record),problem_record->>'publication_status'='published');
 update public.problems set source_exam=problem_record->>'contest_name',question_number=(problem_record->>'question_number')::integer where id=pid;
 result:=public.admin_problem_records(pid);
 insert into public.problem_admin_audit(user_id,problem_id,action,previous_record,new_record)
 values(auth.uid(),pid,case when create_new then 'create' else 'edit' end,previous,result);
 return result;
end $$;
revoke all on function public.admin_problem_records(text),public.admin_save_problem(jsonb,boolean) from public,anon,authenticated;
grant execute on function public.admin_problem_records(text),public.admin_save_problem(jsonb,boolean) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('problem-admin-images','problem-admin-images',true,10485760,array['image/png','image/jpeg','image/webp']);
create policy admin_problem_images_read on storage.objects for select using(bucket_id='problem-admin-images');
create policy admin_problem_images_upload on storage.objects for insert to authenticated
 with check(bucket_id='problem-admin-images' and (select public.is_site_admin()));
commit;
