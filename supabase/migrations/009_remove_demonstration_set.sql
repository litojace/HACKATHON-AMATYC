-- Removes the redundant demonstration set and its associated activity permanently.
begin;
create temporary table removed_demo_problems on commit drop as
select id from public.problems where source_exam='Original Demonstration Set' and id ~ '^demo-[0-9]+$';
delete from public.rating_history where contest_id='demo-challenge';
delete from public.contest_attempts where contest_id='demo-challenge';
delete from public.contest_answers where problem_id in(select id from removed_demo_problems);
delete from public.contest_problems where problem_id in(select id from removed_demo_problems);
delete from public.contests where id='demo-challenge';
delete from public.practice_attempts where problem_id in(select id from removed_demo_problems);
delete from public.practice_sessions where problem_id in(select id from removed_demo_problems);
delete from public.problems where id in(select id from removed_demo_problems);
commit;
