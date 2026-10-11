-- Removes the redundant demonstration set and its associated activity permanently.
do $$
declare demo_ids text[];
begin
select coalesce(array_agg(id), array[]::text[]) into demo_ids from public.problems where source_exam='Original Demonstration Set' and id ~ '^demo-[0-9]+$';
delete from public.rating_history where contest_id='demo-challenge';
delete from public.contest_attempts where contest_id='demo-challenge';
delete from public.contest_answers where problem_id = any(demo_ids);
delete from public.contest_problems where problem_id = any(demo_ids);
delete from public.contests where id='demo-challenge';
delete from public.practice_attempts where problem_id = any(demo_ids);
delete from public.practice_sessions where problem_id = any(demo_ids);
delete from public.problems where id = any(demo_ids);
end $$;
