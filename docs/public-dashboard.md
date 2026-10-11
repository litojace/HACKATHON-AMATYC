# Public profile dashboard

Apply `supabase/migrations/023_public_dashboard.sql` to Supabase before deploying the profile dashboard. The `/dashboard` page and public profiles share `DashboardContent`, so their layout stays consistent.

`GET /api/profile/:username/dashboard` returns the requested competitor's practice outcomes and completed contest summaries. Public profiles are readable by visitors; private dashboard data is returned only to the owner. Actual selected answers, answer keys, written solutions and bookmarks are excluded. Rated contest summaries appear after the review period begins. Other competitors' recent contest links lead to the contest overview, not private attempts. The owner sees their existing personal activity data.

Verification: `node tests/public-dashboard-browser.mjs` uses mocked data for two competitors. Database checks are included in `tests/database.sh`.
