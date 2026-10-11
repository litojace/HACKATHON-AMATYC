begin;
create table public.site_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.site_admins enable row level security;
revoke all on public.site_admins from anon,authenticated;
grant select on public.site_admins to authenticated;
create policy read_own_admin on public.site_admins for select to authenticated using(user_id=(select auth.uid()));

create function public.is_site_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.site_admins where user_id=auth.uid());
$$;
revoke all on function public.is_site_admin() from public,anon,authenticated;
grant execute on function public.is_site_admin() to authenticated;

create table public.site_carousel (
 id boolean primary key default true check(id),
 photos jsonb not null check(jsonb_typeof(photos)='array' and jsonb_array_length(photos) between 1 and 10),
 updated_at timestamptz not null default now()
);
alter table public.site_carousel enable row level security;
revoke all on public.site_carousel from anon,authenticated;
grant select on public.site_carousel to anon,authenticated;
grant update(photos,updated_at) on public.site_carousel to authenticated;
create policy carousel_public_read on public.site_carousel for select using(true);
create policy carousel_admin_update on public.site_carousel for update to authenticated
 using((select public.is_site_admin())) with check((select public.is_site_admin()));
insert into public.site_carousel(photos) values('[
 {"src":"/images/community/student-math-league.png","alt":"AMATYC Student Math League competition flyer","label":"Math League","fit":"contain"},
 {"src":"/images/community/practice-session.png","alt":"Students working together during a math practice session","label":"Practice","fit":"cover"},
 {"src":"/images/community/pizza.png","alt":"Two pizzas","label":"Pizza","fit":"cover"},
 {"src":"/images/community/whiteboard.png","alt":"A student solving math problems on a whiteboard","label":"Problem solving","fit":"cover"},
 {"src":"/images/community/team.png","alt":"Students gathered after a math practice session","label":"Our team","fit":"cover"}
]'::jsonb);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('carousel-images','carousel-images',true,10485760,array['image/png','image/jpeg','image/webp']);
create policy carousel_images_read on storage.objects for select using(bucket_id='carousel-images');
create policy carousel_images_admin_upload on storage.objects for insert to authenticated
 with check(bucket_id='carousel-images' and (select public.is_site_admin()));
-- Photos can be removed from the carousel without deleting shared image files.
commit;
