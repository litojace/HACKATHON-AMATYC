-- Snapshot the old contract before applying 019, including every statistics edge case.
insert into auth.users(id,email,raw_user_meta_data) values('00000000-0000-4000-8000-000000000099','performance@example.test','{}');
insert into public.problems(id,source_exam,question_number,title,question_latex,category_id,difficulty,difficulty_rating,publication_status,verification_status)
select 'perf-'||v.name,'Performance fixtures',v.n,v.name,'Test',t.id,'Easy',800,v.publication,v.verification
from (values ('zero',1,'published','fully_verified'),('wrong',2,'published','answer_verified'),('mixed',3,'published','fully_verified'),('hidden',4,'published','fully_verified'),('draft',5,'draft','fully_verified'),('unverified',6,'published','unreviewed')) v(name,n,publication,verification)
cross join lateral (select id from public.topics order by id limit 1) t;
insert into public.problem_options values('perf-mixed','A','First'),('perf-mixed','B','Second');
insert into public.problem_topics select 'perf-mixed',id from public.topics order by id limit 2;
insert into public.contests(id,name,kind,starts_at,ends_at,review_at,published) values
('perf-rated','Future rated confidentiality','rated',now()+interval '1 day',now()+interval '2 days',now()+interval '3 days',true);
insert into public.contest_problems values('perf-rated','perf-hidden',1);
insert into public.practice_sessions(id,user_id,problem_id)
select gen_random_uuid(),'00000000-0000-4000-8000-000000000099','perf-'||name from (values('wrong'),('wrong'),('mixed'),('mixed'),('mixed')) v(name);
insert into public.practice_attempts(id,user_id,problem_id,selected_answer,is_correct,score,time_spent_seconds)
select id,user_id,problem_id,'A',problem_id='perf-mixed' and n<=2,0,1 from
(select *,row_number() over(partition by problem_id order by id) n from public.practice_sessions where user_id='00000000-0000-4000-8000-000000000099') s;
create table public.test_old_problem_payloads as select p.id,public.problem_json(p.id) payload,public.problem_available(p.id) available from public.problems p;
select indexname,indexdef from pg_catalog.pg_indexes where schemaname='public' and tablename in ('practice_attempts','contest_problems');
