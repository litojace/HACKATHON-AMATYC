#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export DOCKER_CONFIG="${DOCKER_CONFIG:-/tmp/amatyc-docker}"
container="amatyc-perf-${RANDOM}"
docker run -d --name "$container" --network none -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine >/dev/null
trap 'docker rm -f "$container" >/dev/null' EXIT
for attempt in {1..30}; do
 if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
 sleep 1
done
{ cat tests/database-fixture.sql
 for migration in supabase/migrations/0*.sql; do
  if [[ "$migration" == *019_* ]]; then continue; fi
  cat "$migration"
 done
 cat tests/problem-performance-benchmark-seed.sql supabase/migrations/019_problem_directory_performance.sql tests/problem-performance-benchmark-after.sql supabase/rollback/019_problem_directory_performance.sql
 cat <<'SQL'
do $$ begin
 if exists(select 1 from public.benchmark_contract b where b.payload is distinct from public.list_public_problems(b.id)) then raise exception 'Rollback contract changed';end if;
end $$;
SQL
 cat <<'SQL'
alter index public.practice_attempts_problem_id rename to benchmark_existing_problem_index;
SQL
 cat supabase/migrations/019_problem_directory_performance.sql
 cat <<'SQL'
do $$ begin
 if (select count(*) from pg_catalog.pg_indexes where schemaname='public' and tablename='practice_attempts' and indexname in ('practice_attempts_problem_id','benchmark_existing_problem_index'))<>1 then raise exception 'Index not reused';end if;
end $$;
select 'PASS: optimized SQL, rollback, and existing index reuse';
SQL
} | docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1
