begin;
insert into auth.users(id,email,raw_user_meta_data) values('00000000-0000-4000-8000-000000000077','name-confirm@example.test','{}');
update public.profiles set username='user_long_generated_code',full_name='messi' where id='00000000-0000-4000-8000-000000000077';
set role authenticated;
select set_config('test.uid','00000000-0000-4000-8000-000000000001',true);
do $$ begin
 begin perform public.admin_delete_user('00000000-0000-4000-8000-000000000077','DELETE user_long_generated_code','Test');raise exception 'Old code accepted';exception when invalid_parameter_value then null;end;
 begin perform public.admin_delete_user('00000000-0000-4000-8000-000000000077','DELETE someone else','Test');raise exception 'Wrong name accepted';exception when invalid_parameter_value then null;end;
 perform public.admin_delete_user('00000000-0000-4000-8000-000000000077','DELETE messi','Name confirmation');
end $$;
reset role;
do $$ begin
 if exists(select 1 from auth.users where id='00000000-0000-4000-8000-000000000077') then raise exception 'Name confirmation did not delete selected user';end if;
end $$;
rollback;
select 'PASS: deletion confirms displayed name, rejects generated code and wrong names';
