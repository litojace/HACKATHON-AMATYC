analyze;
select public.benchmark_queries('after');
explain(analyze,buffers) select public.list_public_problems();
-- Expose the grouped implementation plan, including scan counts and buffer usage.
select 'explain(analyze,buffers) '||replace(replace(prosrc,'any(ids)','any(array(select id from public.problems))'),'include_detail','true') from pg_catalog.pg_proc where oid='public.problem_payloads(text[],boolean)'::regprocedure \gexec
select phase,path,round(percentile_cont(0.5) within group(order by milliseconds)::numeric,3) median_ms,round(min(milliseconds),3) min_ms,round(max(milliseconds),3) max_ms from public.benchmark_timings group by phase,path order by path,phase;
do $$ begin
 if exists(select 1 from public.benchmark_contract b where b.payload is distinct from public.list_public_problems(b.id)) then raise exception 'Benchmark contract changed';end if;
end $$;
select indexname,indexdef from pg_catalog.pg_indexes where schemaname='public' and tablename='practice_attempts';
-- A real rollback, followed by another apply, also verifies preexisting index reuse.
