-- 1. Profiles Table linked with Supabase Auth
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  full_name text default 'College Math Student',
  school text default 'Orange Coast College',
  rating integer default 1500 not null,
  contests_attended integer default 0 not null,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;
create policy "Allow public read access to profiles" on public.profiles for select using (true);
create policy "Allow users to update own profile" on public.profiles for update using (auth.uid() = id);

-- 2. Trigger to automatically generate a profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', 'Student Competitor')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Competition Problems Table
create table if not exists public.problems (
  id text primary key,
  contest_name text not null,
  question_number integer not null,
  category text not null,
  difficulty_rating integer default 1400,
  question_latex text not null,
  options jsonb not null,
  correct_answer text not null,
  figure_required boolean default false,
  figure_image_path text,
  written_solution text not null,
  calculator_trick jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.problems enable row level security;
create policy "Allow public read access to problems" on public.problems for select using (true);

-- 4. Contest Submissions Table
create table if not exists public.contest_submissions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  contest_name text not null,
  score numeric(4, 1) not null,
  time_spent_seconds integer not null,
  old_rating integer not null,
  new_rating integer not null,
  submitted_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.contest_submissions enable row level security;
create policy "Allow public read access to submissions" on public.contest_submissions for select using (true);
create policy "Allow users to insert own submissions" on public.contest_submissions for insert with check (auth.uid() = user_id);

