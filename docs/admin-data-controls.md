# Admin reset and account deletion

Apply `supabase/migrations/020_admin_data_controls.sql` after migrations 001–019 using the Supabase SQL Editor or your normal migration deployment. Take a database backup first, and test in a staging project. The migration adds controls and safe deletion relationships; it does not reset data or delete accounts when applied.

Visit **Manage users** from the admin problem-library controls (`/admin/users`). Only site administrators can load the user records or execute the actions. Both API authorization and the database functions check administrator membership. The functions use an empty search path, explicit schema names, and restricted grants; RLS remains enabled.

Three independent actions are available:

- **Reset progress:** requires `RESET PROGRESS` and a reason. Clears practice sessions/attempts, contest attempts/answers and rating history. All profiles return to rating 800 and zero rated events. Acceptance counts become zero and acceptance rate becomes null until new attempts exist. Accounts, content, bookmarks, reports and administrative audit logs remain. Active rated contests block a reset; closed rated contests are marked processed so old events cannot subsequently restore ratings.
- **Clear bookmarks and reports:** requires `CLEAR BOOKMARKS AND REPORTS` and a reason. Clears only those two collections.
- **Delete account:** select a user, then type `DELETE <displayed name>` and supply a reason. Removes the Auth user and associated login identities/sessions through Supabase's database cascades, the profile, attempts, rating history, bookmarks, presence and reports. Audit records remain, with deleted actor references set to null. Shared Storage assets, including previously uploaded images used by problems, remain. The currently signed-in administrator cannot delete their own account; the last administrator is also protected. Other users' historical rating values are not recalculated by account deletion.

Each operation executes in a database transaction and records its actor, reason and affected counts. Cancellation or an incorrect phrase executes nothing. Clearing data is irreversible from the UI. Other open browser sessions should reload to discard cached progress. An already-open training/exam session whose attempts were reset must be started again.

## Validation

`npm run test:db` applies the migration in an isolated PostgreSQL container and verifies administrator/guest permissions, confirmations, retained audit records, deletion of the Auth account, independent cleanup, active-contest protection and acceptance statistics. The test transaction rolls back. UI/API checks should use mocked fixtures or staging accounts; never run destructive tests against production.

## Rollback

To disable the new operations without removing audit records or changing data, run:

```sql
revoke all on function public.admin_reset_data(text,text,text),
  public.admin_delete_user(uuid,text,text) from authenticated;
```

Revert the application commit if desired. Retain the nullable audit references and deletion cascades; they are needed to preserve referential integrity after account deletion. Undoing an executed reset/deletion requires restoring the pre-operation database backup, including Auth records. A code or schema rollback cannot restore removed data. Check Storage assets and authentication/session behavior in staging with your actual Supabase schema before using account deletion in production; the local SQL fixture does not model Supabase's full Auth schema.

Apply `supabase/migrations/024_delete_confirmation_names.sql` after migration 020 to enable displayed-name confirmations (for example, `DELETE messi`). The confirmation dialog provides a selectable read-only phrase and a Copy button; administrators must still paste or type it into the separate confirmation field and submit explicitly. The server checks the current displayed name while the selected UUID determines exactly which account is deleted. If the name changes while the dialog is open, reopen the dialog with refreshed user records. Blank names fall back to the account username. This migration performs no deletions.
