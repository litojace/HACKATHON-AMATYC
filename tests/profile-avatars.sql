reset role;
insert into auth.users values('00000000-0000-4000-8000-000000000003','three@example.test','{"full_name":"Ada","school":"OCC"}'),('00000000-0000-4000-8000-000000000004','four@example.test','{"username":"solver","full_name":"Grace","school":"OCC"}');
do $$ begin
 if (select file_size_limit from storage.buckets where id='avatars')<>10485760 then raise exception 'Avatar limit must be 10 MB';end if;
 if not exists(select 1 from public.profiles where id='00000000-0000-4000-8000-000000000003' and full_name='Ada' and rating=800) then raise exception 'Username-free signup failed';end if;
 if not exists(select 1 from public.profiles where id='00000000-0000-4000-8000-000000000004' and full_name='Grace' and school='OCC') then raise exception 'Collision lost display name';end if;
end $$;
set role authenticated;
select set_config('test.uid','00000000-0000-4000-8000-000000000003',false);
insert into storage.objects(bucket_id,name) values('avatars','00000000-0000-4000-8000-000000000003/test.png');
do $$ begin
 begin
  insert into storage.objects(bucket_id,name) values('avatars','00000000-0000-4000-8000-000000000004/test.png');
  raise exception 'Cross-account avatar upload allowed';
 exception when insufficient_privilege then null;end;
end $$;
select set_config('test.uid','00000000-0000-4000-8000-000000000004',false);
do $$ declare affected integer;begin
 delete from storage.objects where bucket_id='avatars';
 get diagnostics affected=row_count;
 if affected<>0 then raise exception 'Cross-account avatar deletion allowed';end if;
end $$;
select set_config('test.uid','00000000-0000-4000-8000-000000000003',false);
delete from storage.objects where bucket_id='avatars';
reset role;
