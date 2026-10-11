# Online announcements

Apply migrations 017 and 021 in the configured Supabase project, then run `supabase/announcement_scheduler.sql` as project owner in SQL Editor. This enables a database Cron job that removes announcements aged 30 seconds or more, even when nobody is browsing. It checks every second, so physical deletion normally occurs within about one second of expiry. The API excludes expired announcements immediately. Deletion cascades to all recipient receipts. This applies to existing announcements too.

An administrator can publish plain text from their own Profile. The server trims surrounding whitespace and accepts 1–2000 characters. Publishing snapshots signed-in users with a presence heartbeat within the last two minutes, including private profiles, and includes the publishing administrator. Users who arrive later do not receive earlier announcements.

Recipients see unread announcements across the website. Visible tabs check every five seconds; returning to a tab checks immediately. The popup fades out after 15 seconds on screen. Dismissing manually records it as read for that account. Announcements expire globally 30 seconds after publication and cannot be retrieved after expiry, including on reload. The database returns up to 50 unexpired unread messages, oldest first.

Only authenticated administrators can call `admin_post_announcement(p_message text)`. Its response contains `id`, `message`, `created_at`, and `recipient_count`. Authenticated users can call `user_announcements()` for their own unread messages and `dismiss_announcement(p_id uuid)` for their own receipt. Repeated dismissal or an unknown ID is harmless. There are no client table grants or direct data access policies; all ownership checks use the server-authenticated user ID.

Deleting a recipient's account removes that account's receipts. Deleting a publishing administrator keeps the announcement and delivery to other users, with its former author reference set to null. Announcement text is plain text and must be rendered without interpreting HTML.
