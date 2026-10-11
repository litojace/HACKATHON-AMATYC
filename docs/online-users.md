# Admin online users

Apply migration `016_admin_online_users.sql` to the configured Supabase project. Open Leaderboard as an administrator to see a green Online badge beside each online competitor's name in the table. No Realtime or Cron configuration is needed.

Signed-in users send a heartbeat every 30 seconds while a website tab is visible. Admins refresh the list every 15 seconds. Users are considered online if their latest heartbeat is within two minutes; closed or inactive tabs therefore expire automatically. Multiple tabs share the latest heartbeat, so closing one tab does not incorrectly mark another active tab offline. This indicates recent website activity rather than an exact connection status.

The database derives each heartbeat's user and timestamp from the authenticated session and server clock. Ordinary users and guests cannot read presence records or spoof another user's timestamp. Only admins can retrieve the list, including signed-in competitors whose profiles are private. Public profile links for those competitors may be unavailable because profile privacy is unchanged.
