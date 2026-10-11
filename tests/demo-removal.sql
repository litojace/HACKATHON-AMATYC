do $$ begin
 if exists(select 1 from public.problems where id ~ '^demo-[0-9]+$') then raise exception 'Demo problems remain';end if;
 if (select count(*) from public.problems)<>820 then raise exception 'Historical questions were removed';end if;
 if exists(select 1 from public.contests where id='demo-challenge') then raise exception 'Demo contest remains';end if;
end $$;
