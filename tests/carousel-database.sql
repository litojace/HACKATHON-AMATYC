reset role;
insert into public.site_admins(user_id) values('00000000-0000-4000-8000-000000000001');
set role anon;
do $$ begin
 if (select jsonb_array_length(photos) from public.site_carousel)<>5 then raise exception 'Public carousel unreadable';end if;
end $$;
reset role;
set role authenticated;
select set_config('test.uid','00000000-0000-4000-8000-000000000002',false);
do $$ begin
 if public.is_site_admin() then raise exception 'Ordinary user is an admin';end if;
 update public.site_carousel set photos='[{"src":"/images/community/team.png"}]';
 if found then raise exception 'Ordinary user updated carousel';end if;
 begin
  insert into public.site_admins(user_id) values(auth.uid());
  raise exception 'Self promotion allowed';
 exception when insufficient_privilege then null;end;
 begin
  insert into storage.objects(bucket_id,name) values('carousel-images','unauthorized.png');
  raise exception 'Ordinary user uploaded carousel image';
 exception when insufficient_privilege then null;end;
end $$;
select set_config('test.uid','00000000-0000-4000-8000-000000000001',false);
do $$ begin
 if not public.is_site_admin() then raise exception 'Admin not recognized';end if;
 update public.site_carousel set photos=photos || '[{"src":"/images/community/team.png","label":"Extra","alt":"Extra photo","fit":"contain"}]'::jsonb;
 if not found then raise exception 'Admin update rejected';end if;
end $$;
insert into storage.objects(bucket_id,name) values('carousel-images','admin.png');
reset role;
select 'PASS: public carousel reads, admin-only editing and uploads, and no self promotion';
