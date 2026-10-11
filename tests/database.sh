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
{ cat tests/database-fixture.sql supabase/migrations/001_platform.sql supabase/migrations/002_import.sql supabase/migrations/003_practice_review.sql supabase/migrations/004_initial_rating.sql supabase/migrations/005_historical_formats.sql supabase/migrations/006_problem_submission_stats.sql supabase/migrations/007_profile_avatars.sql supabase/migrations/008_avatar_upload_limit.sql supabase/migrations/010_home_carousel.sql tests/database-seed.sql tests/database.sql
  node scripts/test-library-seed.mjs
  cat tests/historical-database.sql tests/profile-avatars.sql supabase/migrations/009_remove_demonstration_set.sql supabase/migrations/009_remove_demonstration_set.sql tests/demo-removal.sql tests/carousel-database.sql supabase/migrations/011_admin_problems.sql tests/admin-problems-database.sql supabase/migrations/012_admin_problem_delete.sql tests/admin-problem-delete.sql supabase/migrations/013_delete_problems_preserve_history.sql tests/admin-problem-history-delete.sql supabase/migrations/014_admin_contests.sql tests/admin-contests-database.sql supabase/migrations/015_admin_user_ratings.sql tests/admin-user-ratings.sql supabase/migrations/016_admin_online_users.sql tests/online-users-database.sql supabase/migrations/017_online_announcements.sql tests/announcements-database.sql supabase/migrations/018_problem_reports.sql tests/problem-reports-database.sql tests/problem-performance-before.sql supabase/migrations/019_problem_directory_performance.sql tests/problem-performance.sql supabase/migrations/020_admin_data_controls.sql tests/admin-data-controls.sql
  cat supabase/migrations/021_announcement_expiry.sql tests/announcement-expiry.sql
} |
  docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1
