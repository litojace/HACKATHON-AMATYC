# AMATYC Code v2 implementation report

Validated on October 10, 2026. The previous application is preserved separately as `AMATYC-Code-v1.zip`.

## Completed features

The hackathon journey works end to end: landing page, searchable problem directory, practice submission, mathematical explanation and calculator walkthrough, timed mock exam, results, progress dashboard, and sample leaderboard. Twenty original demonstration questions are explicitly labeled; no historical examination content is fabricated.

The interface includes combined shareable filters, bookmarks, keyboard navigation, diagram zoom, focus-managed dialogs, mobile navigation, dark/light themes, accessible chart data, public profiles, account pages and settings. Demo activity persists in this browser. Configured mode uses authenticated Supabase persistence instead.

Public responses exclude answer keys and explanations before authorized review. Server grading, signed demo sessions, database-owned deadlines, saved answers/flags, transactional finalization, duplicate prevention, private history, and restricted profile updates are implemented. Normal web requests never use a service-role credential. Ratings remain a clearly documented, disabled Beta.

## Main files created or updated

- `app/`: page routes, loading/error states, validated API dispatcher and health endpoint.
- `components/`: providers, navigation, practice arena, contest interface, dashboard, charts, dialogs, authentication and settings.
- `lib/server/`: private demonstration content, signed sessions and authenticated database access.
- `lib/domain.ts`, `lib/validation.ts`, `lib/rating.ts`, `types/problem.ts`: filters, validation, scoring/rating policy and data contracts.
- `data/demo/questions.json`, `public/images/semicircle.svg`: original demonstration content and diagram.
- `supabase/migrations/001_platform.sql` through `003_practice_review.sql`: normalized tables, RLS, grading/attempt RPCs and reviewed imports.
- `scripts/import/`, `scripts/seed.ts`, `docs/import-review.md`: inventory, validation and trusted import workflow.
- `tests/`: unit, real PostgreSQL fixture integration and Chromium browser journey checks.
- `README.md`, `.env.example`, `Dockerfile`, `render.yaml`, portable standalone launch scripts: local and deployment instructions.

The complete source tree and lockfile are included in the download; installed dependencies and generated build outputs are excluded.

## Executed checks

- Dependency installation succeeded. The final dependency audit reported zero vulnerabilities.
- ESLint and strict TypeScript checks passed.
- All eight unit tests passed, covering scoring, complete content validation, rating fixtures/ties, filters and deadline arithmetic.
- The production Next.js build passed.
- PostgreSQL 17 integration checks passed with all three migrations, controlled Auth/Storage fixtures and seeded problems. Checks include authorization, confidential keys, profile/rating protection, server grading, saved flags, deadlines, immutable finalization, cross-account privacy and expiry sweeping.
- Chromium passed the complete journey against the production server, including blanks/retry, calculator steps, refresh recovery, result consistency, theme persistence and mobile overflow. No browser runtime errors were recorded.
- The reviewed JSON importer validated all twenty demonstration records without writes.
- The PDF inventory tool processed a controlled two-PDF ZIP, detected question/key candidate matches, and retained unreviewed status. It never published the fixture.
- The production health endpoint responded successfully.
- The Node 22 Docker image built successfully, ran as uid 1000, and passed the same complete Chromium journey on its container server.

## Run and deploy

Locally install Node 22.13+ or Node 24, extract the archive and open a terminal inside `HACKATHON-AMATYC-`. Run `npm ci`, then `npm run dev`. For a production build, run `npm run build`, then `npm start`. Demonstration mode needs no credentials.

README has Vercel, Render and Docker instructions. For real accounts use a fresh Supabase project, apply the three numbered migrations in order, configure both public Supabase variables before building, enable email auth and redirects, and configure the expiry scheduler. Use service-role credentials only for trusted organizer scripts. Legacy v1 SQL files must not be applied to v2.

No GitHub push or external deployment was performed. Cloud setup instructions were saved as a draft; review/save them in environment settings and publish the environment to activate that configuration.

## Remaining limitations

Live Supabase signup, email confirmation, login/recovery and Storage HTTP workflows could not be verified without a configured project. SQL fixtures verify database behavior, not those external services. Google OAuth, account deletion, an admin review UI, private signed rated-event diagrams and multiple figure records are not implemented.

The rating calculation is provisional and automatic publication is disabled. Production rated events need verified rating policy and additional organizer eligibility/publication tooling. Demo signed cookies are not a durable competitive database: cookie replay and concurrent-tab integrity are outside their guarantees. Configure a shared deployment rate limiter before public launch.

## Historical dataset next steps

No historical question/key archives are present. When available, inventory them with `npm run import:pdf`, review extracted notation and diagrams, match official keys manually, and create records using the documented schema. Validate with `npm run import:json -- reviewed.json --validate-only`, import as drafts, then explicitly publish only fully reviewed content. The tool does not automatically interpret or verify mathematical PDFs. See `docs/import-review.md` for the complete workflow.
