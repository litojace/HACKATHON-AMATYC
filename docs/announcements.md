# Online announcements

Apply `supabase/migrations/017_online_announcements.sql` after migration 016 in the configured Supabase project. No Realtime or Cron setup is required.

An administrator can publish plain text from their own Profile. The server trims surrounding whitespace and accepts 1–2000 characters. Publishing snapshots signed-in users with a presence heartbeat within the last two minutes, including private profiles, and includes the publishing administrator. Users who arrive later do not receive earlier announcements.

Recipients see unread announcements across the website. Visible tabs check every five seconds; returning to a tab checks immediately. Dismissing an announcement records it as read for that account across tabs and devices. Undismissed messages remain available after navigation, refresh, or returning later. The database returns up to 50 unread messages, oldest first, so dismissal makes room for any further queued messages.

Only authenticated administrators can call `admin_post_announcement(p_message text)`. Its response contains `id`, `message`, `created_at`, and `recipient_count`. Authenticated users can call `user_announcements()` for their own unread messages and `dismiss_announcement(p_id uuid)` for their own receipt. Repeated dismissal or an unknown ID is harmless. There are no client table grants or direct data access policies; all ownership checks use the server-authenticated user ID.

Deleting a recipient's account removes that account's receipts. Deleting a publishing administrator keeps the announcement and delivery to other users, with its former author reference set to null. Announcement text is plain text and must be rendered without interpreting HTML.
