begin;

create table public.announcements (
 id uuid primary key default gen_random_uuid(),
 author_id uuid references public.profiles(id) on delete set null,
 message text not null check(char_length(message) between 1 and 2000),
 created_at timestamptz not null default now()
);
create table public.announcement_recipients (
 announcement_id uuid not null references public.announcements(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 read_at timestamptz,
 primary key(announcement_id,user_id)
);
create index announcement_recipients_unread on public.announcement_recipients(user_id,announcement_id) where read_at is null;
alter table public.announcements enable row level security;
alter table public.announcement_recipients enable row level security;
revoke all on public.announcements,public.announcement_recipients from public,anon,authenticated;

create function public.admin_post_announcement(p_message text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 normalized_message text;
 posted public.announcements%rowtype;
 recipient_count integer;
begin
 if auth.uid() is null or not public.is_site_admin() then
  raise exception 'Administrator access required' using errcode='42501';
 end if;
 normalized_message:=btrim(p_message,E' \t\n\r\f');
 if normalized_message is null or char_length(normalized_message) not between 1 and 2000 then
  raise exception 'Enter a message of 1–2000 characters' using errcode='22023';
 end if;
 insert into public.announcements(author_id,message) values(auth.uid(),normalized_message) returning * into posted;
 insert into public.announcement_recipients(announcement_id,user_id)
 select posted.id,user_id from public.user_presence where last_seen_at>now()-interval '2 minutes'
 union select posted.id,auth.uid();
 get diagnostics recipient_count=row_count;
 return jsonb_build_object('id',posted.id,'message',posted.message,'created_at',posted.created_at,'recipient_count',recipient_count);
end $$;

create function public.user_announcements() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',unread.id,'message',unread.message,'created_at',unread.created_at) order by unread.created_at,unread.id),'[]'::jsonb)
 into result from (
  select a.id,a.message,a.created_at
  from public.announcement_recipients r join public.announcements a on a.id=r.announcement_id
  where r.user_id=auth.uid() and r.read_at is null
  order by a.created_at,a.id limit 50
 ) unread;
 return result;
end $$;

create function public.dismiss_announcement(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 update public.announcement_recipients set read_at=now()
 where announcement_id=p_id and user_id=auth.uid() and read_at is null;
end $$;

revoke all on function public.admin_post_announcement(text),public.user_announcements(),public.dismiss_announcement(uuid) from public,anon,authenticated;
grant execute on function public.admin_post_announcement(text),public.user_announcements(),public.dismiss_announcement(uuid) to authenticated;
commit;
