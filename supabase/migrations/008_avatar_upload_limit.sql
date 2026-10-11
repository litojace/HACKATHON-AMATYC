-- Apply after 007. Keep existing avatars and ownership policies.
begin;
update storage.buckets set file_size_limit=10485760 where id='avatars';
commit;
