# Homepage carousel management

1. Apply `supabase/migrations/010_home_carousel.sql` to the shared Supabase project after migrations 001–009. It preserves the existing five images as the initial gallery.
2. The project owner grants an existing account access in Supabase SQL Editor:

```sql
insert into public.site_admins(user_id)
select id from auth.users where lower(email)=lower('ADMIN_EMAIL_HERE')
on conflict do nothing;
```

3. Sign in with that account and open `/admin/carousel`. Upload or replace PNG/JPG/WebP images up to 10 MB, edit captions and image descriptions, choose fill-frame or whole-image display, reorder or remove slides, then click **Save changes**. Keep between 1 and 10 images.
4. Reload the homepage to see the published gallery. Draft changes do not affect visitors. Removed images are removed from the carousel; existing Storage files are preserved. Unsaved uploaded files can be removed separately by the project owner if needed.

Only the project owner can grant/revoke admin access. Users cannot promote themselves. API checks and database/Storage policies enforce permissions, including direct requests. This admin role currently permits carousel management only.

To revoke access:

```sql
delete from public.site_admins where user_id=(select id from auth.users where lower(email)=lower('ADMIN_EMAIL_HERE'));
```

Without Supabase configured, the homepage continues to show the bundled gallery and the editor requires authentication. If loading the published gallery fails, the bundled gallery remains visible; the editor reports setup or permission errors.
