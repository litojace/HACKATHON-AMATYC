# Google sign-in setup

The app uses the existing browser Supabase client and implicit OAuth flow. The callback page restores the session and returns to the selected problem or contest. Google users are ordinary Supabase Auth users; the existing new-user trigger creates their profile.

Ask the owner of the shared Supabase project to complete these steps once:

1. In Google Cloud / Google Auth Platform, configure the consent screen and create an OAuth client of type **Web application**. Use only the standard openid, email and profile scopes. If the app is in testing, add the intended users as test users.
2. Add `http://localhost:3000` and the deployed website origin to **Authorized JavaScript origins**. Add the exact callback URL shown in Supabase's Google provider settings to **Authorized redirect URIs** (normally `https://PROJECT.supabase.co/auth/v1/callback`). This callback belongs to the shared cloud Supabase project, even when the website runs locally.
3. In Supabase **Authentication → Providers → Google**, enable Google and enter the client ID and client secret. Keep the secret in Supabase; it does not belong in the website or repository.
4. In Supabase **Authentication → URL Configuration**, set the deployed Site URL and allow `http://localhost:3000/auth/callback**` and `https://YOUR-DOMAIN/auth/callback**` so the callback's `next` query is accepted. Add other local ports only when needed. Keep existing email confirmation and password recovery redirects.
5. Each developer uses the shared project's URL and public anon key in their own `.env.local`, then restarts the development server.
6. Test **Continue with Google** on `/login`: choose a Google account, return to the original page, submit a practice answer, and confirm a profile and private practice attempt were stored. Sign out and verify practice and contests require login again.

No new database migration is required. Browsing the library remains public, but starting practice, grading, viewing solutions, and starting/resuming/submitting contests require a real authenticated account. Without Supabase configuration these actions are disabled; there is no guest demo submission path.

Official setup guide: https://supabase.com/docs/guides/auth/social-login/auth-google
