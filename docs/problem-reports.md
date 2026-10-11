# Problem reports and explanation updates

## Apply the database change

1. Apply any missing migrations through 017 first.
2. Open `supabase/migrations/018_problem_reports.sql` in your editor. Copy **the SQL contents**, paste them into a new Supabase SQL Editor query, and run the whole query. A filename or path is not SQL.
3. Restart or deploy the updated application.

Signed-in students can open **Report a problem** beneath a question and report an incorrect answer or solution, unclear wording, a missing figure, or another issue. Reports include their account identity and timestamp. Students cannot read other reports or change their review status.

Site admins can open **Review problem reports** from their own public profile, or visit `/admin/reports`. They can filter open/resolved/dismissed reports, edit the affected question, and save a review note and outcome. Admin access uses the existing membership from migration 010. Reports are preserved when a question is removed, and the queue identifies removed questions rather than linking to an unavailable page.

## Publish the explanations

The bundled historical library has 820 entries with sequential explanations. To update an already seeded database without importing questions or modifying difficulty ratings, run this from the repository directory in a trusted terminal:

```sh
export NEXT_PUBLIC_SUPABASE_URL='https://lekkhttavyzceejpzyml.supabase.co'
read -r -s -p 'Paste your service_role key, then press Enter: ' SUPABASE_SERVICE_ROLE_KEY
export SUPABASE_SERVICE_ROLE_KEY
npm run solutions:publish
unset SUPABASE_SERVICE_ROLE_KEY
```

This prompt syntax is for Bash. On macOS Zsh, use `read -s 'SUPABASE_SERVICE_ROLE_KEY?Paste your service_role key, then press Enter: '` instead. Paste the key **after running the read command**, at the terminal prompt; the input stays hidden. The service-role key is under your project's API keys and must stay in your trusted terminal, never a browser environment variable or a chat message.

The publisher updates only `problem_solutions.written_solution`, and only where the question ID and stored official answer key match. It stops on an unavailable or changed record and reports its ID. Earlier successful updates remain saved; rerunning is safe after resolving the mismatch. It does not load `.env.local` automatically, insert missing questions, or modify answer keys, student ratings, calculator guides, or contests. For a fresh database, use `npm run seed` first.

Source statements, source images, official keys, and grading corrections are unchanged. Apply editorial changes to `data/editorials/detailed-solutions.json`, then run `python3 scripts/import/apply_editorials.py` to regenerate the bundled explanations. `npm test` checks complete coverage, ordered steps, and math rendering.
