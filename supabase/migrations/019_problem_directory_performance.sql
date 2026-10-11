-- Set-based public retrieval; all builders remain private to RPC owners.
begin;
-- Do not duplicate an existing usable, nonpartial btree with this leading column.
do $indexes$
declare target regclass; col smallint; index_name text;
begin
 for target,index_name in select 'public.practice_attempts'::regclass,'practice_attempts_problem_id' union all select 'public.contest_problems'::regclass,'contest_problems_problem_id' loop
  select attnum into col from pg_catalog.pg_attribute where attrelid=target and attname='problem_id';
  if not exists(select 1 from pg_catalog.pg_index i join pg_catalog.pg_class c on c.oid=i.indexrelid join pg_catalog.pg_am am on am.oid=c.relam
    where i.indrelid=target and i.indisvalid and i.indisready and i.indpred is null and i.indkey[0]=col and am.amname='btree') then
   execute format('create index %I on %s (problem_id)',index_name,target);
  end if;
 end loop;
end $indexes$;

-- Shared visibility policy, identical to problem_available in migration 005.
-- A published rated contest hides its problems even before starts_at, until review_at.
create function public.available_problem_ids(requested_id text default null) returns text[]
language sql stable security definer set search_path='' as $$
 select coalesce(array_agg(p.id),'{}'::text[]) from public.problems p
 where (requested_id is null or p.id=requested_id)
 and p.publication_status='published' and p.verification_status in ('fully_verified','answer_verified')
 and not exists(select 1 from public.contest_problems cp join public.contests c on c.id=cp.contest_id
   where cp.problem_id=p.id and c.kind='rated' and c.published and now()<c.review_at);
$$;

-- One grouped scan of attempts for the whole requested set, including detail calls.
-- Summary omits option text and figure/detail metadata; question_latex retains keyword search.
create function public.problem_payloads(ids text[], include_detail boolean)
returns table(problem_id text,question_number integer,payload jsonb)
language sql stable security definer set search_path='' as $$
 with stats as (
  select a.problem_id,count(*) as attempt_count,count(*) filter(where a.is_correct) as accepted_count
  from public.practice_attempts a where a.problem_id=any(ids) group by a.problem_id
 ), tags as (
  select pt.problem_id,jsonb_agg(t2.name) as names
  from public.problem_topics pt join public.topics t2 on t2.id=pt.topic_id
  where pt.problem_id=any(ids) group by pt.problem_id
 ), opts as (
  select o.problem_id,count(*) as option_count,
   case when include_detail then jsonb_agg(jsonb_build_object('label',o.label,'text',o.text) order by o.label) end as options
  from public.problem_options o where o.problem_id=any(ids) group by o.problem_id
 )
 select p.id,p.question_number,jsonb_build_object(
    'id',p.id,
    'contest_name',p.source_exam,
    'question_number',p.question_number,
    'title',p.title,
    'category',t.name,
    'topic_tags',coalesce(tags.names,'[]'::jsonb),
    'difficulty',p.difficulty,
    'difficulty_rating',p.difficulty_rating,
    'question_latex',p.question_latex,
    'verification_status',p.verification_status,
    'accepted_count',coalesce(stats.accepted_count,0::bigint),
    'attempt_count',coalesce(stats.attempt_count,0::bigint),
    'acceptance_rate',round(100.0*stats.accepted_count/nullif(stats.attempt_count,0),1)
 ) || case when include_detail then jsonb_build_object(
    'options',coalesce(opts.options,'[]'::jsonb),
    'figure_required',p.figure_required,
    'figure_image_path',p.figure_image_path,
    'source_image_path',p.source_image_path,
    'answer_format',p.answer_format,
    'difficulty_rationale',p.difficulty_rationale
 ) else jsonb_build_object('option_count',coalesce(opts.option_count,0::bigint)) end
 from public.problems p join public.topics t on t.id=p.category_id
 left join stats on stats.problem_id=p.id left join tags on tags.problem_id=p.id left join opts on opts.problem_id=p.id
 where p.id=any(ids);
$$;

-- Keep this internal builder usable for authorized contest/admin paths.
create or replace function public.problem_json(pid text) returns jsonb
language sql stable security definer set search_path='' as $$
 select x.payload from public.problem_payloads(array[pid],true) x;
$$;

-- Existing full JSON contract and null-on-unavailable detail contract remain unchanged.
create or replace function public.list_public_problems(problem_id text default null) returns jsonb
language sql stable security definer set search_path='' as $$
 select case when $1 is null then coalesce(jsonb_agg(x.payload order by x.question_number),'[]'::jsonb)
 else (jsonb_agg(x.payload))->0 end
 from public.problem_payloads(public.available_problem_ids($1),true) x;
$$;

create function public.list_public_problem_directory() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(x.payload order by x.question_number),'[]'::jsonb)
 from public.problem_payloads(public.available_problem_ids(null),false) x;
$$;
revoke all on function public.available_problem_ids(text),public.problem_payloads(text[],boolean),public.problem_json(text),public.list_public_problems(text),public.list_public_problem_directory() from public,anon,authenticated;
grant execute on function public.list_public_problems(text),public.list_public_problem_directory() to anon,authenticated;
notify pgrst,'reload schema';
commit;
