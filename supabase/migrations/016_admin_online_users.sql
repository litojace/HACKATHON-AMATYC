begin;
create table public.user_presence (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 last_seen_at timestamptz not null default now()
);
alter table public.user_presence enable row level security;
revoke all on public.user_presence from public,anon,authenticated;
create function public.record_presence() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 insert into public.user_presence(user_id,last_seen_at) values(auth.uid(),now())
 on conflict(user_id) do update set last_seen_at=excluded.last_seen_at;
end $$;
create function public.admin_online_users() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 if not public.is_site_admin() then raise exception 'Administrator access required' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'username',p.username,'full_name',p.full_name,'last_seen_at',u.last_seen_at) order by p.full_name,p.username),'[]')
 into result from public.user_presence u join public.profiles p on p.id=u.user_id where u.last_seen_at>now()-interval '2 minutes';
 return result;
end $$;
revoke all on function public.record_presence(),public.admin_online_users() from public,anon,authenticated;
grant execute on function public.record_presence(),public.admin_online_users() to authenticated;
commit;
