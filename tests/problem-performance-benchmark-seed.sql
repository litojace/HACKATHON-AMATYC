-- Synthetic representative dataset, isolated in a disposable PostgreSQL 17 database.
insert into public.topics(id,name) values('benchmark','Benchmark');
insert into auth.users(id,email,raw_user_meta_data) values('00000000-0000-4000-8000-000000000099','benchmark@example.test','{}');
insert into public.problems(id,source_exam,question_number,title,question_latex,category_id,difficulty,difficulty_rating,publication_status,verification_status)
select 'bench-'||n,'Benchmark',n,'Problem '||n,repeat('Representative question text ',10),'benchmark','Easy',800,'published','fully_verified' from generate_series(1,820) n;
insert into public.problem_topics select id,'benchmark' from public.problems;
insert into public.problem_options select id,l,repeat('Option text ',10) from public.problems cross join unnest(array['A','B','C','D','E']) l;
insert into public.practice_sessions(id,user_id,problem_id)
select gen_random_uuid(),'00000000-0000-4000-8000-000000000099','bench-'||(1+(n%820)) from generate_series(1,120000) n;
insert into public.practice_attempts(id,user_id,problem_id,selected_answer,is_correct,score,time_spent_seconds)
select id,user_id,problem_id,'A',(row_number() over(order by id))%3=0,0,1 from public.practice_sessions;
analyze;
create table public.benchmark_timings(phase text,path text,milliseconds numeric);
create table public.benchmark_contract as select id,public.problem_json(id) payload from public.problems;
create function public.benchmark_queries(phase text) returns void language plpgsql as $$
declare started timestamptz; i integer; path text; result jsonb; begin
 foreach path in array case when phase='before' then array['detail','full'] else array['detail','full','summary'] end loop
  for i in 0..3 loop
   started:=clock_timestamp();
   if path='detail' then result:=public.list_public_problems('bench-1');
   elsif path='full' then result:=public.list_public_problems();
   else result:=public.list_public_problem_directory();end if;
   if i>0 then insert into public.benchmark_timings values(phase,path,extract(epoch from clock_timestamp()-started)*1000);end if;
  end loop;
 end loop;
end $$;
select indexname,indexdef from pg_catalog.pg_indexes where schemaname='public' and tablename='practice_attempts';
select public.benchmark_queries('before');
explain(analyze,buffers) select public.list_public_problems();
-- Expose the internal detail plan instead of only the SECURITY DEFINER wrapper.
select 'explain(analyze,buffers) '||replace(prosrc,'=pid', '=''bench-1''') from pg_catalog.pg_proc where oid='public.problem_json(text)'::regprocedure \gexec
