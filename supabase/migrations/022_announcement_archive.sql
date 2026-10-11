begin;

-- Popup expiry remains 30 seconds; retain records for recipient history.
create or replace function public.delete_expired_announcements() returns bigint
language sql security definer set search_path='' as $$ select 0::bigint $$;
revoke all on function public.delete_expired_announcements() from public,anon,authenticated;

-- Keep the original recipient boundary, but include dismissed announcements.
create or replace function public.announcement_history(p_page integer default 0) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_page is null or p_page<0 or p_page>50000 then raise exception 'Invalid page' using errcode='22023'; end if;
 with selected as (
  select a.id,a.message,a.created_at
  from public.announcement_recipients r
  join public.announcements a on a.id=r.announcement_id
  where r.user_id=auth.uid()
  order by a.created_at desc,a.id desc limit 21 offset (p_page*20)
 ), page_items as (
  select * from selected order by created_at desc,id desc limit 20
 )
 select jsonb_build_object(
  'items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'message',message,'created_at',created_at) order by created_at desc,id desc) from page_items),'[]'::jsonb),
  'has_more',(select count(*)>20 from selected)
 ) into result;
 return result;
end $$;
revoke all on function public.announcement_history(integer) from public,anon,authenticated;
grant execute on function public.announcement_history(integer) to authenticated;
commit;
