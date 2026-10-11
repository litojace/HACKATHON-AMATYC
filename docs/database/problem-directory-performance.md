# Problem directory performance — migration 019

Migration: [`019_problem_directory_performance.sql`](../../supabase/migrations/019_problem_directory_performance.sql).
Rollback: [`019_problem_directory_performance.sql`](../../supabase/rollback/019_problem_directory_performance.sql).

## Findings and implementation

Migration 006's `problem_json` used three separate correlated aggregations over `practice_attempts`. Migration 001's directory called that function and `problem_available` per problem. Repository migrations 001–018 contain only the primary-key and `(user_id, created_at)` indexes on attempts; neither supports lookup by `problem_id`. The disposable PostgreSQL database confirmed those index definitions. **Production indexes and production timings were not accessible: no Supabase database credentials are available in this environment.**

Migration 019 checks `pg_index` before creating supporting indexes. A valid, ready, nonpartial btree with `problem_id` as its leading column, under any name, is reused. It performs the same check for `contest_problems`, whose existing primary key starts with `contest_id`.

The private `problem_payloads(ids, include_detail)` builder groups attempts once per requested set. It obtains both counts in that aggregation and derives the rate from those counts. Topics and options are also grouped per set. Full directory retrieval no longer invokes the complete builder once per row. Individual retrieval uses the same builder with one ID and can use the new index. No statistics table, trigger maintenance, timeout increase, or RLS change is introduced.

The full `list_public_problems(problem_id text default null)` contract remains intact:

- All existing full JSON keys and JSON value types remain unchanged. Count fields are numbers; a zero-attempt acceptance rate remains JSON `null`; rates still round to one decimal place.
- Option ordering remains by label. Topic-tag ordering was unspecified in the original function; compatibility tests compare tags as a set.
- Full directory returns `[]` when empty; missing/unavailable individual lookup returns SQL `NULL`, serialized as JSON `null` by the existing API.
- `problem_json` stays private and usable by authorized admin/contest callers, including during rated contests.

A new `list_public_problem_directory()` RPC and `/api/problem-directory` endpoint omit option text, figure metadata, answer format, and difficulty rationale. They include `option_count` for the training selector. Question text remains in summaries to preserve existing keyword search. Directory, dashboard, and training setup use summaries; the detail page independently fetches `/api/problems/{id}`. Training intentionally retrieves fresh full questions once when a session starts. Existing `/api/problems` and `/api/problems/{id}` clients keep their full responses.

`Providers.refreshAccount()` now refreshes account/profile and private activity only. Submissions, settings saves, and rating-processing polls no longer refetch the entire library. The provider persists its directory across client navigation, and admin mutations still call its explicit reload. Public counts refresh on a directory reload rather than on every account refresh. A session-scoped in-flight deduplicator shares overlapping GET requests (including development Strict Mode effects), immediately removes settled reads/failures, and excludes writes and abortable requests. Completed responses are not cached across authentication contexts or on the API server.

## Confidentiality and hardening

Both public RPCs use the same availability selector: published problems with `fully_verified` or `answer_verified` status, excluding membership in **any published rated contest before its `review_at`**. This includes the time before that contest starts; adding a `starts_at <= now()` condition would leak future contest questions and is deliberately avoided.

All new/replaced functions use `SECURITY DEFINER`, explicit application schema qualification, and `search_path=''`. Only the two public retrieval RPCs are granted to `anon` and `authenticated`. Internal builders are revoked from those roles and `PUBLIC`. Public payloads never join `problem_solutions` or include correctness/grading/solution fields. Existing practice and contest authorization stays in place. Migration and rollback notify PostgREST to reload its schema cache.

## Safe application in Supabase

1. Apply to a staging clone first. Confirm migrations 001–018 are applied and your production function definitions match the repository versions. Back up exact existing definitions, ownership/execute grants, and a database snapshot according to your normal deployment process. Save these query results before changing anything:

   ```sql
   select p.oid::regprocedure, pg_get_functiondef(p.oid), p.proacl
   from pg_catalog.pg_proc p
   where p.oid in ('public.problem_json(text)'::regprocedure,
                  'public.list_public_problems(text)'::regprocedure,
                  'public.problem_available(text)'::regprocedure);

   select indexname, indexdef from pg_catalog.pg_indexes
   where schemaname='public'
     and tablename in ('practice_attempts','contest_problems');

   select c.relname, i.indisvalid, i.indisready, pg_get_indexdef(i.indexrelid)
   from pg_catalog.pg_index i join pg_catalog.pg_class c on c.oid=i.indexrelid
   where i.indrelid in ('public.practice_attempts'::regclass,
                       'public.contest_problems'::regclass);
   ```

2. On large/busy production tables, precreate missing supporting indexes **concurrently**, using a direct database session and one statement per command outside a transaction. Do this only after confirming that an equivalent valid index does not already exist. For example:

   ```sql
   create index concurrently practice_attempts_problem_id_pre019
     on public.practice_attempts(problem_id);
   create index concurrently contest_problems_problem_id_pre019
     on public.contest_problems(problem_id);
   ```

   Check `indisvalid` and `indisready` afterward. A failed concurrent build can leave an invalid index; inspect it and remove/retry that specific failed index before proceeding. Migration 019 reuses valid precreated indexes. Without this step, its ordinary index builds run transactionally and can block writes while building; schedule a quiet maintenance window for that path. Do not raise `statement_timeout` or disable RLS.

3. Apply **only the new migration** to an existing installation. Paste the **contents** of the migration into Supabase SQL Editor, select the entire script, and run it. Pasting its filename is not SQL. Alternatively, with a securely configured direct connection:

   ```sh
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/019_problem_directory_performance.sql
   ```

   The migration is atomic. Do not execute selected fragments separately. If using the Supabase migration CLI, retain the project's existing migration-history workflow rather than mixing manual execution and unrecorded CLI pushes. No previously applied migration is edited.

4. Analyze the relevant tables after index creation using the normal owner/admin connection:

   ```sql
   analyze public.practice_attempts;
   analyze public.contest_problems;
   ```

5. Before deploying the frontend, verify full, summary, and individual retrieval, both as anonymous and authenticated callers. Compare full payloads by ID against your pre-migration snapshot. Include zero-attempt, incorrect-only, mixed-attempt, draft, unverified, future-rated, active-rated, and reviewed-rated cases. Run the timings below on the same staging dataset before and after, with equivalent roles, settings, warmup, and no competing build/load. `EXPLAIN` of a `SECURITY DEFINER` call alone reports an opaque function node; the checked-in benchmark also explains its SQL body to expose scan counts.

   ```sql
   explain (analyze, buffers) select public.list_public_problems();
   explain (analyze, buffers) select public.list_public_problems('YOUR_VISIBLE_PROBLEM_ID');
   explain (analyze, buffers) select public.list_public_problem_directory();
   ```

   `EXPLAIN ANALYZE` executes the query; use staging or a controlled production session. Do not run synthetic fixture/benchmark seed scripts on production.

6. Deploy/rebuild the application **after** the migration. Restart the application when applying the carousel image configuration as well. Smoke-test `/api/problems`, `/api/problems/{id}`, `/api/problem-directory`, browsing/back navigation, practice, and authorized contest review. Confirm publication/verification restrictions using actual anon/auth sessions. Monitor 503s, PostgreSQL timeouts, RPC latency, and request volume on production. The local measurements below verify the optimized queries; they do **not** prove the production incident is resolved.

## Rollback

Restore the previous application build first so it no longer calls the new directory RPC. Then run the complete rollback SQL in the same owner/admin context. It restores the original `problem_json` and `list_public_problems` definitions and grants, removes the new summary RPC/private helpers, and reloads PostgREST's schema cache. Supporting indexes remain because they are safe and useful for other queries. Only drop an index afterward if you confirm this rollout created it and no other workload needs it; never drop a preexisting index.

The provided rollback targets the repository's original definitions. If production has custom definitions/grants, restore the saved production versions instead. No problem or attempt data is altered by either migration or rollback. Recheck full/individual responses and authorized contest access after rollback. Expect the old aggregation costs to return.

## Automated checks and measurements

```sh
npm run test:db
bash tests/problem-performance-benchmark.sh
npm test
npm run typecheck
npm run build
# Against an unconfigured browsing-mode production server:
PORT=3016 npm start
node tests/problem-directory-browser.mjs
```

Validation completed: 32/32 unit tests, TypeScript, the production build, the full database regression runner, the benchmark/rollback runner, and the browser/API checks passed. ESLint has no errors and one preexisting training-hook dependency warning.

The database runner applies the real migration chain, snapshots old JSON payloads, applies 019, and verifies both directory paths, individual retrieval, zero/incorrect/mixed statistics, missing/empty results, private grants, safe search paths, retained RLS, future/reviewed rated confidentiality, and authorized active-contest question access. The benchmark separately executes a real rollback and reapply with an existing index under a different name. Browser checks verify all 820 bundled full/summary responses, a matching individual response, one directory request across navigation, no full-directory browser read, and carousel scrolling interaction. Production Supabase HTTP/RPC measurements remain a deployment verification step.

The benchmark uses a disposable PostgreSQL 17 container, 820 published problems, 4,100 options, and 120,000 practice attempts on exactly the same dataset for both implementations. It performs one warmup and three timed calls per path; the benchmark output includes min/max and median, full `EXPLAIN (ANALYZE, BUFFERS)` plans, and exact full-payload comparisons. This is a synthetic stress dataset, not a copy of production; its old latencies should not be compared directly with the reported production average of 907 ms.

Final run (no concurrent build):

```text
 phase  |  path   | median_ms |  min_ms   |  max_ms   
--------+---------+-----------+-----------+-----------
 after  | detail  |     2.413 |     2.301 |     2.689
 before | detail  |    48.977 |    46.418 |    52.844
 after  | full    |    90.468 |    89.254 |    97.966
 before | full    | 42303.294 | 40908.718 | 42308.077
 after  | summary |    63.232 |    61.400 |    64.618
(5 rows)
```

Detailed measured plans: [019-query-plans.txt](019-query-plans.txt).

The old body plan contains three separate sequential scans of 120,000 attempts for one problem. The new body plan contains one grouped attempt aggregation and one underlying scan for the requested set. Supporting index use is confirmed by the actual plan. Original migrations remain unchanged.

## Additional UI feedback

Carousel autoplay and automatic thumbnail scrolling pause while the user drags the native thumbnail strip. Scroll updates use refs rather than per-frame React state. Sliding layers use compositor-friendly transforms; bundled photos and this project's public carousel bucket use Next image optimization with small thumbnail sizes and a restricted remote allowlist. Other administrator-entered external HTTPS images retain their original behavior. Reduced-motion preferences remain respected. These interaction checks pass locally; smoothness on the user's specific device still needs confirmation.

The search icon now sits inside the input, keeping its border aligned with the other filter fields. The header sigma and wordmark are slightly larger. A geometric sigma badge is a suggested future logo direction; the recognizable existing mark is retained.
