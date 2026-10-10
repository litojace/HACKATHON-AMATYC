begin;
alter table public.profiles alter column rating set default 800;
-- Correct the previous initial value only for accounts without competitive history.
update public.profiles p set rating=800
where p.rating=1500 and p.contests_attended=0
and not exists(select 1 from public.rating_history h where h.user_id=p.id);
commit;
