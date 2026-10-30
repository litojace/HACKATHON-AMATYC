-- Create a real migration-025 set before applying migration 026.
insert into auth.users(id,email,raw_user_meta_data) values('00000000-0000-4000-8000-000000000410','daily-legacy@example.test','{}');
select set_config('test.uid','00000000-0000-4000-8000-000000000410',false);
select public.start_daily_challenge() is not null as legacy_started;
do $$ declare item jsonb; d public.daily_challenges; begin
 select * into d from public.daily_challenges where user_id=auth.uid();
 item:=d.items->0;
 perform public.save_daily_answer(d.id,item->'problem'->>'id',item->'solution'->>'correct_answer');
end $$;
create temporary table legacy_daily_snapshot as select * from public.daily_challenges where user_id=auth.uid();
