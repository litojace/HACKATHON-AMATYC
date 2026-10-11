# Admin problem editor

Apply `supabase/migrations/011_admin_problems.sql` in the Supabase SQL Editor after migrations 001–010. This adds private admin RPCs, an audit log, and the `problem-admin-images` storage bucket. Use the same Supabase project configured by the application.

Admins use the existing `site_admins` membership from migration 010. The project owner can grant membership in the SQL Editor:

```sql
insert into public.site_admins (user_id)
values ('USER_UUID_FROM_SUPABASE_AUTH_USERS')
on conflict (user_id) do nothing;
```

Sign in as that user, open `/problems`, and choose **Manage problems** or **Create problem**. A problem also has an **Edit problem** link. Direct management URL: `/admin/problems`.

The editor supports question text and math previews, original images and diagrams (PNG/JPG/WebP up to 10 MB), multiple choice or short answers, alternative accepted answers, grading policy, worked solutions, categories, tags, difficulty and rating. Save as a private draft, then mark reviewed and publish. Publication requires a fully reviewed worked solution, or a question image and verified source answer key reference. Editing the difficulty rating does not change users' contest ratings.

After a practice session starts or a problem belongs to a contest, its question, images and grading fields cannot be changed. Titles, classifications and solutions can still be edited. Use **Create a revised copy** for structural changes; this creates a draft with a new ID and preserves past grading. Copies do not automatically replace contest questions.

Image URLs are public: do not upload confidential unreleased contest material. Correct answers and audit records remain private. Authorization is checked by both the API and the database RPCs; ordinary users cannot promote themselves or upload problem images.

Apply migration `012_admin_problem_delete.sql` to enable **Delete** beside **Edit** on each row in Manage problems. Deletion requires confirmation and permanently removes an unused problem, its options, solution, topic links and bookmarks; a private audit record is retained. Problems with practice sessions, attempts or contest membership cannot be deleted. Save those as private drafts to hide them from the library. Uploaded image files are retained because other problems may share them.

Migration 013 supersedes the deletion restriction: Delete removes used problems from both the library and Manage problems while preserving their historical grading data and contest membership. Unused problems are permanently deleted.
