begin;
create table public.user_rating_admin_audit (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id),
 admin_id uuid not null references public.profiles(id),
 old_rating integer not null, new_rating integer not null,
 reason text not null, created_at timestamptz not null default now()
);
alter table public.user_rating_admin_audit enable row level security;
revoke all on public.user_rating_admin_audit from anon,authenticated;
create function public.admin_user_records() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.is_site_admin() then raise exception 'Only administrators can manage user ratings' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'full_name',full_name,'rating',rating,'school',school) order by full_name,id) from public.profiles),'[]'::jsonb);
end $$;
create function public.admin_set_user_rating(target_id uuid, new_rating integer, adjustment_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare previous integer;
begin
 if not public.is_site_admin() then raise exception 'Only administrators can manage user ratings' using errcode='42501';end if;
 if new_rating is null or new_rating<1 or new_rating>10000 then raise exception 'Rating must be an integer between 1 and 10000';end if;
 if adjustment_reason is null or length(trim(adjustment_reason)) not between 1 and 500 then raise exception 'Enter a reason of 1–500 characters';end if;
 select rating into previous from public.profiles where id=target_id for update;
 if not found then raise exception 'User not found';end if;
 if previous<>new_rating then
  update public.profiles set rating=new_rating,updated_at=now() where id=target_id;
  insert into public.user_rating_admin_audit(user_id,admin_id,old_rating,new_rating,reason) values(target_id,auth.uid(),previous,new_rating,trim(adjustment_reason));
 end if;
 return jsonb_build_object('id',target_id,'rating',new_rating);
end $$;
revoke all on function public.admin_user_records(),public.admin_set_user_rating(uuid,integer,text) from public,anon,authenticated;
grant execute on function public.admin_user_records(),public.admin_set_user_rating(uuid,integer,text) to authenticated;
commit;
