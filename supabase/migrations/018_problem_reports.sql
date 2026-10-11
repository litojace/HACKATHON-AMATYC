begin;
create table public.problem_reports (
 id uuid primary key default gen_random_uuid(),
 problem_id text not null references public.problems(id),
 reporter_id uuid not null references public.profiles(id),
 category text not null check(category in ('incorrect_answer','unclear_wording','missing_figure','other')),
 details text not null check(length(trim(details)) between 1 and 2000),
 status text not null default 'open' check(status in ('open','resolved','dismissed')),
 admin_note text not null default '' check(length(admin_note)<=2000),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz, reviewed_by uuid references public.profiles(id)
);
alter table public.problem_reports enable row level security;
revoke all on public.problem_reports from anon,authenticated;
create function public.report_problem(pid text, report_category text, report_details text) returns uuid language plpgsql security definer set search_path='' as $$
declare report_id uuid;
begin
 if auth.uid() is null then raise exception 'Please sign in to report a problem' using errcode='42501';end if;
 if not exists(select 1 from public.problems where id=pid and publication_status='published' and deleted_at is null) then raise exception 'Problem not available';end if;
 insert into public.problem_reports(problem_id,reporter_id,category,details) values(pid,auth.uid(),report_category,trim(report_details)) returning id into report_id;
 return report_id;
end $$;
create function public.admin_problem_reports() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.is_site_admin() then raise exception 'Only administrators can review reports' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('title',p.title,'reporter_name',u.full_name,'problem_deleted',p.deleted_at is not null) order by r.created_at desc) from public.problem_reports r join public.problems p on p.id=r.problem_id join public.profiles u on u.id=r.reporter_id),'[]'::jsonb);
end $$;
create function public.admin_review_problem_report(report_id uuid, next_status text, review_note text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_site_admin() then raise exception 'Only administrators can review reports' using errcode='42501';end if;
 update public.problem_reports set status=next_status,admin_note=coalesce(review_note,''),reviewed_at=now(),reviewed_by=auth.uid() where id=report_id;
 if not found then raise exception 'Report not found';end if;
end $$;
revoke all on function public.report_problem(text,text,text),public.admin_problem_reports(),public.admin_review_problem_report(uuid,text,text) from public,anon,authenticated;
grant execute on function public.report_problem(text,text,text),public.admin_problem_reports(),public.admin_review_problem_report(uuid,text,text) to authenticated;
-- Keep reported questions available in the private review history when removed.
create or replace function public.admin_delete_problem(pid text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare previous jsonb;preserve boolean;begin
 if not public.is_site_admin() then raise exception 'Administrator access required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext('admin-problem-'||pid));
 lock table public.practice_sessions,public.contest_attempts,public.contest_problems,public.problem_reports in share row exclusive mode;
 perform id from public.problems where id=pid and deleted_at is null for update;
 if not found then raise exception 'Problem not found';end if;
 select exists(select 1 from public.practice_sessions where problem_id=pid) or exists(select 1 from public.practice_attempts where problem_id=pid) or exists(select 1 from public.contest_problems where problem_id=pid) or exists(select 1 from public.contest_answers where problem_id=pid) or exists(select 1 from public.problem_reports where problem_id=pid) into preserve;
 previous:=public.admin_problem_records(pid);
 if preserve then
  update public.problems set deleted_at=now(),publication_status='draft' where id=pid;
 else
  delete from public.problems where id=pid;
 end if;
 insert into public.problem_admin_audit(user_id,problem_id,action,previous_record)
 values(auth.uid(),pid,'delete',previous);
 return jsonb_build_object('id',pid,'deleted',true,'history_preserved',preserve);
end $$;
commit;
