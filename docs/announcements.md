# Online announcements

Apply migrations 017 and 021 in the configured Supabase project, then run `supabase/announcement_scheduler.sql` as project owner in SQL Editor. This enables a database Cron job that removes announcements aged 30 seconds or more, even when nobody is browsing. It checks every second, so physical deletion normally occurs within about one second of expiry. The API excludes expired announcements immediately. Deletion cascades to all recipient receipts. This applies to existing announcements too.

An administrator can publish plain text from their own Profile. The server trims surrounding whitespace and accepts 1–2000 characters. Publishing snapshots signed-in users with a presence heartbeat within the last two minutes, including private profiles, and includes the publishing administrator. Users who arrive later do not receive earlier announcements.

Recipients see unread announcements across the website. Visible tabs check every five seconds; returning to a tab checks immediately. The popup fades out after 15 seconds on screen. Dismissing manually records it as read for that account. Announcements expire globally 30 seconds after publication and cannot be retrieved after expiry, including on reload. The database returns up to 50 unexpired unread messages, oldest first.

Only authenticated administrators can call `admin_post_announcement(p_message text)`. Its response contains `id`, `message`, `created_at`, and `recipient_count`. Authenticated users can call `user_announcements()` for their own unread messages and `dismiss_announcement(p_id uuid)` for their own receipt. Repeated dismissal or an unknown ID is harmless. There are no client table grants or direct data access policies; all ownership checks use the server-authenticated user ID.

Deleting a recipient's account removes that account's receipts. Deleting a publishing administrator keeps the announcement and delivery to other users, with its former author reference set to null. Announcement text is plain text and must be rendered without interpreting HTML.

### Announcement archive

The Dashboard includes an Announcement archive and a “Read past announcements” shortcut. Live notifications link to the same section. Users can read all announcements sent to them, including dismissed ones, in pages of 20 ordered newest first. The archive preserves the original online-recipient audience; it does not reveal messages sent to other users or retroactively send older announcements to users who were offline.

Apply `supabase/migrations/022_announcement_archive.sql` in Supabase SQL Editor after migrations 001–021. This adds a read-only, authenticated RPC with explicit recipient filtering, SECURITY DEFINER, an empty search_path, and qualified table references. Popups still expire after 30 seconds, but the cleanup function now retains records for the archive. Existing dismissal and posting behavior is unchanged. Messages already deleted by migration 021 cannot be recovered. No data is deleted or modified when applying the migration.

To roll back, remove the archive UI and revoke the new RPC:

```sql
revoke execute on function public.announcement_history(integer) from authenticated;
```

Database tests cover dismissed history, ordering, pagination, invalid pages, other-user isolation and anonymous denial. `tests/announcement-archive-browser.mjs` checks Dashboard navigation, paging and error recovery against mocked data.
