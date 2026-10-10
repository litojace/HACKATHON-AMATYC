#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export DOCKER_CONFIG="${DOCKER_CONFIG:-/tmp/amatyc-docker}"
container="amatyc-db-test-${RANDOM}"
docker run -d --name "$container" --network none -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine >/dev/null
trap 'docker rm -f "$container" >/dev/null' EXIT
ready=false
for attempt in {1..30}; do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
if [ "$ready" != true ]; then echo 'Postgres did not become ready' >&2; exit 1; fi
{ cat tests/database-fixture.sql supabase/migrations/001_platform.sql supabase/migrations/002_import.sql supabase/migrations/003_practice_review.sql supabase/migrations/004_initial_rating.sql supabase/migrations/005_historical_formats.sql supabase/migrations/006_problem_submission_stats.sql tests/database-seed.sql tests/database.sql
  node scripts/test-library-seed.mjs
  cat tests/historical-database.sql
} |
  docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1
