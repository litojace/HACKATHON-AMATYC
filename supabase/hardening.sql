-- Run AFTER schema.sql. The supplied base policies allow rating forgery;
-- restrict users to editing display fields and forbid client-written standings.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, school, avatar_url) on public.profiles to authenticated;
revoke insert, update, delete on public.contest_submissions from anon, authenticated;
drop policy if exists "Allow users to insert own submissions" on public.contest_submissions;
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare candidate text;
begin
  candidate := regexp_replace(coalesce(new.raw_user_meta_data->>'username', 'student'), '[^a-zA-Z0-9_]', '', 'g');
  candidate := left(coalesce(nullif(candidate,''), 'student'),30);
  -- Preserve chosen username where available; resolve duplicates safely.
  insert into public.profiles (id, username, full_name)
  values (new.id, candidate, left(coalesce(new.raw_user_meta_data->>'full_name','Student Competitor'),100))
  on conflict (username) do nothing;
  if not found then
    insert into public.profiles (id, username, full_name)
    values (new.id, candidate || '_' || replace(new.id::text,'-',''), 'Student Competitor');
  end if;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('problem-images', 'problem-images', true, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;
-- Uploads are limited to trusted organizers via dashboard/service-role.
drop policy if exists "Public problem image read" on storage.objects;
create policy "Public problem image read" on storage.objects for select using (bucket_id = 'problem-images');
-- Organizer-only transactional rating publication. Clients cannot spoof scores.
create unique index if not exists one_submission_per_contest
on public.contest_submissions (user_id, contest_name);
create or replace function public.publish_contest_results(contest text, results jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare entry jsonb; uid uuid; current_rating integer;
begin
  if jsonb_typeof(results) <> 'array' or jsonb_array_length(results) < 2 then
    raise exception 'At least two results required';
  end if;
  -- Stable lock order prevents deadlocks between overlapping contests.
  perform p.id from public.profiles p
    where p.id in (select (value->>'id')::uuid from jsonb_array_elements(results))
    order by p.id for update;
  for entry in select value from jsonb_array_elements(results) loop
    uid := (entry->>'id')::uuid;
    select rating into current_rating from public.profiles where id = uid;
    if current_rating is null or current_rating <> (entry->>'old_rating')::integer then
      raise exception 'Profile missing or rating changed; recompute results';
    end if;
    if (entry->>'new_rating')::integer < 1 or (entry->>'score')::numeric not between -10 and 40
       or (entry->>'time_spent_seconds')::integer not between 0 and 3600 then
      raise exception 'Invalid result';
    end if;
    insert into public.contest_submissions (user_id,contest_name,score,time_spent_seconds,old_rating,new_rating)
    values (uid,contest,(entry->>'score')::numeric,(entry->>'time_spent_seconds')::integer,current_rating,(entry->>'new_rating')::integer);
    update public.profiles set rating=(entry->>'new_rating')::integer,
      contests_attended=contests_attended+1,updated_at=now() where id=uid;
  end loop;
end;
$$;
revoke all on function public.publish_contest_results(text,jsonb) from public, anon, authenticated;
grant execute on function public.publish_contest_results(text,jsonb) to service_role;
