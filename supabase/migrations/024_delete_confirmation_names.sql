begin;

-- Confirm the displayed name; target_id still identifies the account exactly.
create or replace function public.admin_delete_user(target_id uuid, confirmation text, operation_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare target_username text;
begin
 if auth.uid() is null or not public.is_site_admin() then raise exception 'Administrator access required' using errcode='42501';end if;
 if target_id=auth.uid() then raise exception 'You cannot delete your own administrator account' using errcode='22023';end if;
 if operation_reason is null or length(btrim(operation_reason)) not between 1 and 500 then raise exception 'Enter a reason of 1–500 characters' using errcode='22023';end if;
 lock table public.site_admins in share row exclusive mode;
 select coalesce(nullif(btrim(full_name),''),username) into target_username from public.profiles where id=target_id for update;
 if not found then raise exception 'User not found' using errcode='P0002';end if;
 if confirmation is distinct from 'DELETE '||target_username then raise exception 'Confirmation does not match' using errcode='22023';end if;
 if exists(select 1 from public.site_admins where user_id=target_id) and (select count(*) from public.site_admins)<=1 then
  raise exception 'The last administrator cannot be deleted' using errcode='22023';
 end if;
 insert into public.admin_data_audit(admin_id,action,target_id,reason,affected)
 values(auth.uid(),'delete_account',target_id,btrim(operation_reason),jsonb_build_object('accounts_deleted',1));
 -- Auth identities/sessions cascade in Supabase; public profile data cascades too.
 -- Shared problem/media assets are retained, not deleted from Storage metadata.
 delete from auth.users where id=target_id;
 if not found then raise exception 'User not found' using errcode='P0002';end if;
 return jsonb_build_object('deleted',true,'id',target_id);
end $$;
revoke all on function public.admin_delete_user(uuid,text,text) from public,anon,authenticated;
grant execute on function public.admin_delete_user(uuid,text,text) to authenticated;
commit;
