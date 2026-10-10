begin;
-- Run after migrations 001–006. Existing accounts and profile links are preserved.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
declare chosen text; display_name text; school_name text;
begin
 chosen:=left(regexp_replace(coalesce(new.raw_user_meta_data->>'username',''),'[^A-Za-z0-9_]','','g'),30);
 if length(chosen)<3 then chosen:='user_'||replace(new.id::text,'-','');end if;
 display_name:=left(coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''),'Student'),80);
 school_name:=left(nullif(trim(new.raw_user_meta_data->>'school'),''),100);
 insert into public.profiles(id,username,full_name,school)
 values(new.id,chosen,display_name,school_name) on conflict(username) do nothing;
 if not found then
  insert into public.profiles(id,username,full_name,school)
  values(new.id,chosen||'_'||replace(new.id::text,'-',''),display_name,school_name);
 end if;
 return new;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',true,2097152,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects for select using(bucket_id='avatars');
drop policy if exists avatars_upload_own on storage.objects;
create policy avatars_upload_own on storage.objects for insert to authenticated
with check(bucket_id='avatars' and split_part(name,'/',1)=(select auth.uid())::text);
drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects for delete to authenticated
using(bucket_id='avatars' and split_part(name,'/',1)=(select auth.uid())::text);

commit;
