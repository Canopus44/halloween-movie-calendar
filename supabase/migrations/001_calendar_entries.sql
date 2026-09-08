-- 001_calendar_entries.sql
-- Halloween Movie Calendar — tabla de entradas del calendario
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run

create table public.calendar_entries (
  id uuid primary key default gen_random_uuid(),
  date_key text not null unique,
  day int not null,
  year int not null,
  movie_id int,
  movie_title text,
  movie_original_title text,
  poster_path text,
  backdrop_path text,
  overview text,
  release_date text,
  vote_average numeric(3,1),
  genres text,
  watched boolean not null default false,
  rating_p1 int check (rating_p1 between 1 and 5),
  rating_p2 int check (rating_p2 between 1 and 5),
  notes_p1 text,
  notes_p2 text,
  selected_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.calendar_entries enable row level security;

grant select, insert, update on public.calendar_entries to anon;

create policy "anon read all entries" on public.calendar_entries for select to anon using (true);
create policy "anon insert entries" on public.calendar_entries for insert to anon with check (true);
create policy "anon update entries" on public.calendar_entries for update to anon using (true) with check (true);

alter publication supabase_realtime add table public.calendar_entries;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_calendar_entries_updated before update on public.calendar_entries for each row execute function public.set_updated_at();