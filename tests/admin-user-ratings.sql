reset role;
set role authenticated;
select set_config('test.uid','00000000-0000-4000-8000-000000000002',false);
do $$ begin
 begin perform public.admin_set_user_rating('00000000-0000-4000-8000-000000000002',1700,'Not authorized');raise exception 'Non-admin changed own rating';exception when insufficient_privilege then null;end;
 begin perform public.admin_user_records();raise exception 'Non-admin read users';exception when insufficient_privilege then null;end;
end $$;
select set_config('test.uid','00000000-0000-4000-8000-000000000001',false);
do $$ begin
 perform public.admin_set_user_rating('00000000-0000-4000-8000-000000000001',1700,'Self correction');
 perform public.admin_set_user_rating('00000000-0000-4000-8000-000000000002',1900,'Other correction');
 perform public.admin_set_user_rating('00000000-0000-4000-8000-000000000002',1900,'No change');
 begin perform public.admin_set_user_rating('00000000-0000-4000-8000-000000000002',-1,'Invalid');raise exception 'Invalid rating accepted';exception when raise_exception then if sqlerrm<>'Rating must be an integer between 1 and 10000' then raise;end if;end;
 begin perform public.admin_set_user_rating('00000000-0000-4000-8000-000000000002',2000,'');raise exception 'Empty reason accepted';exception when raise_exception then if sqlerrm<>'Enter a reason of 1–500 characters' then raise;end if;end;
end $$;
reset role;
do $$ begin
 if (select rating from public.profiles where id='00000000-0000-4000-8000-000000000001')<>1700 or (select rating from public.profiles where id='00000000-0000-4000-8000-000000000002')<>1900 then raise exception 'Rating save failed';end if;
 if (select count(*) from public.user_rating_admin_audit)<>2 then raise exception 'Missing audit or duplicate audit';end if;
 if exists(select 1 from public.user_rating_admin_audit where admin_id<>'00000000-0000-4000-8000-000000000001') then raise exception 'Wrong audit actor';end if;
end $$;
set role anon;
do $$ begin
 begin perform public.admin_set_user_rating('00000000-0000-4000-8000-000000000002',1700,'Guest');raise exception 'Guest changed rating';exception when insufficient_privilege then null;end;
end $$;
reset role;
