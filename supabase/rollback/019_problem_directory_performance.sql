begin;
create or replace function public.problem_json(pid text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',p.id,'contest_name',p.source_exam,'question_number',p.question_number,'title',p.title,'category',t.name,'topic_tags',coalesce((select jsonb_agg(t2.name) from public.problem_topics pt join public.topics t2 on t2.id=pt.topic_id where pt.problem_id=p.id),'[]'::jsonb),'difficulty',p.difficulty,'difficulty_rating',p.difficulty_rating,'question_latex',p.question_latex,'options',coalesce((select jsonb_agg(jsonb_build_object('label',o.label,'text',o.text) order by o.label) from public.problem_options o where o.problem_id=p.id),'[]'::jsonb),'figure_required',p.figure_required,'figure_image_path',p.figure_image_path,'verification_status',p.verification_status,'source_image_path',p.source_image_path,'answer_format',p.answer_format,'difficulty_rationale',p.difficulty_rationale,'accepted_count',(select count(*) from public.practice_attempts a where a.problem_id=p.id and a.is_correct),'attempt_count',(select count(*) from public.practice_attempts a where a.problem_id=p.id),'acceptance_rate',(select round(100.0*count(*) filter(where a.is_correct)/nullif(count(*),0),1) from public.practice_attempts a where a.problem_id=p.id)) from public.problems p join public.topics t on t.id=p.category_id where p.id=pid;
$$;
revoke all on function public.problem_json(text) from public,anon,authenticated;



create or replace function public.list_public_problems(problem_id text default null) returns jsonb language sql stable security definer set search_path='' as $$
 select case when problem_id is null then coalesce(jsonb_agg(public.problem_json(p.id) order by p.question_number),'[]'::jsonb) else (jsonb_agg(public.problem_json(p.id)))->0 end from public.problems p where public.problem_available(p.id) and (problem_id is null or p.id=problem_id);
$$;
revoke all on function public.list_public_problems(text) from public;
grant execute on function public.list_public_problems(text) to anon,authenticated;
drop function public.list_public_problem_directory();
drop function public.problem_payloads(text[],boolean);
drop function public.available_problem_ids(text);
-- Keep supporting indexes: removing them is unnecessary and may affect other queries.
notify pgrst,'reload schema';
commit;
