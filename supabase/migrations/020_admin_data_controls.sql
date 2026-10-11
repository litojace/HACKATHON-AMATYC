begin;
-- Preserve administrator audit records when an account is removed.
alter table public.user_rating_admin_audit alter column user_id drop not null, alter column admin_id drop not null;
alter table public.user_rating_admin_audit drop constraint user_rating_admin_audit_user_id_fkey,
 drop constraint user_rating_admin_audit_admin_id_fkey,
 add foreign key(user_id) references public.profiles(id) on delete set null,
 add foreign key(admin_id) references public.profiles(id) on delete set null;
alter table public.problem_admin_audit drop constraint problem_admin_audit_user_id_fkey,
 add foreign key(user_id) references auth.users(id) on delete set null;
alter table public.rating_history drop constraint rating_history_user_id_fkey,
 add foreign key(user_id) references public.profiles(id) on delete cascade;
alter table public.problem_reports drop constraint problem_reports_reporter_id_fkey,
 drop constraint problem_reports_reviewed_by_fkey,
 add foreign key(reporter_id) references public.profiles(id) on delete cascade,
 add foreign key(reviewed_by) references public.profiles(id) on delete set null;

create table public.admin_data_audit (
 id uuid primary key default gen_random_uuid(),
 admin_id uuid references public.profiles(id) on delete set null,
 action text not null check(action in ('reset_progress','clear_community','delete_account')),
 target_id uuid, reason text not null, affected jsonb not null,
 created_at timestamptz not null default now()
);
alter table public.admin_data_audit enable row level security;
revoke all on public.admin_data_audit from public,anon,authenticated;

create or replace function public.admin_user_records() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_site_admin() then raise exception 'Administrator access required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'username',p.username,'full_name',p.full_name,'rating',p.rating,'school',p.school,'is_admin',exists(select 1 from public.site_admins a where a.user_id=p.id)) order by p.full_name,p.id) from public.profiles p),'[]'::jsonb);
end $$;

create function public.admin_reset_data(reset_scope text, confirmation text, operation_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare affected jsonb; expected text;
begin
 if auth.uid() is null or not public.is_site_admin() then raise exception 'Administrator access required' using errcode='42501';end if;
 if reset_scope not in ('progress','community') or reset_scope is null then raise exception 'Invalid reset scope' using errcode='22023';end if;
 expected:=case when reset_scope='progress' then 'RESET PROGRESS' else 'CLEAR BOOKMARKS AND REPORTS' end;
 if confirmation is distinct from expected then raise exception 'Confirmation does not match' using errcode='22023';end if;
 if operation_reason is null or length(btrim(operation_reason)) not between 1 and 500 then raise exception 'Enter a reason of 1–500 characters' using errcode='22023';end if;
 if reset_scope='progress' then
  lock table public.contests,public.profiles,public.contest_attempts,public.contest_answers,public.practice_sessions,public.practice_attempts,public.rating_history in share row exclusive mode;
  if exists(select 1 from public.contests where published and kind='rated' and starts_at<=now() and ends_at>now()) then
   raise exception 'Wait until active rated contests close before resetting progress' using errcode='55000';
  end if;
  affected:=jsonb_build_object('profiles_reset',(select count(*) from public.profiles),'practice_attempts_deleted',(select count(*) from public.practice_attempts),'contest_attempts_deleted',(select count(*) from public.contest_attempts));
  delete from public.rating_history;
  delete from public.contest_answers;
  delete from public.contest_attempts;
  delete from public.practice_attempts;
  delete from public.practice_sessions;
  update public.profiles set rating=800,contests_attended=0,updated_at=now();
  -- Closed events must not later re-apply ratings from before the reset.
  update public.contests set ratings_processed_at=coalesce(ratings_processed_at,now()) where kind='rated' and ends_at<=now();
 else
  lock table public.bookmarks,public.problem_reports in share row exclusive mode;
  affected:=jsonb_build_object('bookmarks_deleted',(select count(*) from public.bookmarks),'reports_deleted',(select count(*) from public.problem_reports));
  delete from public.bookmarks;
  delete from public.problem_reports;
 end if;
 insert into public.admin_data_audit(admin_id,action,reason,affected)
 values(auth.uid(),case when reset_scope='progress' then 'reset_progress' else 'clear_community' end,btrim(operation_reason),affected);
 return affected;
end $$;

create function public.admin_delete_user(target_id uuid, confirmation text, operation_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare target_username text;
begin
 if auth.uid() is null or not public.is_site_admin() then raise exception 'Administrator access required' using errcode='42501';end if;
 if target_id=auth.uid() then raise exception 'You cannot delete your own administrator account' using errcode='22023';end if;
 if operation_reason is null or length(btrim(operation_reason)) not between 1 and 500 then raise exception 'Enter a reason of 1–500 characters' using errcode='22023';end if;
 lock table public.site_admins in share row exclusive mode;
 select username into target_username from public.profiles where id=target_id for update;
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
revoke all on function public.admin_user_records(),public.admin_reset_data(text,text,text),public.admin_delete_user(uuid,text,text) from public,anon,authenticated;
grant execute on function public.admin_user_records(),public.admin_reset_data(text,text,text),public.admin_delete_user(uuid,text,text) to authenticated;
commit;
