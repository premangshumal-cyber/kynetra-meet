-- Kynetra: run in your own Supabase project SQL editor.
-- Enable Row Level Security; a public anon key MUST NOT bypass these policies.
create extension if not exists pgcrypto;

-- Internal routines must not live in the Data API-exposed public schema.
create schema if not exists kynetra_internal;
revoke all on schema kynetra_internal from public, anon, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "owner reads profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "owner updates profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create or replace function kynetra_internal.kynetra_create_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 60))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists kynetra_user_created on auth.users;
create trigger kynetra_user_created after insert on auth.users
for each row execute function kynetra_internal.kynetra_create_profile();
revoke all on function kynetra_internal.kynetra_create_profile() from public, anon, authenticated;

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 500),
  room_code text not null unique check (room_code ~ '^kyn-[0-9a-f]{32}$'),
  scheduled_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled', 'active', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kynetra_meetings_owner_created on public.meetings (owner_id, created_at desc);
create index if not exists kynetra_meetings_scheduled on public.meetings (scheduled_at) where status = 'scheduled';
alter table public.meetings enable row level security;

create policy "owner reads meetings" on public.meetings
for select to authenticated using ((select auth.uid()) = owner_id);
-- Meeting creation, cancellation and deletion are server-side only.
-- The browser's publishable/anon key can select its own rows, not forge meetings.

create or replace function kynetra_internal.kynetra_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists kynetra_meetings_updated on public.meetings;
create trigger kynetra_meetings_updated before update on public.meetings
for each row execute function kynetra_internal.kynetra_updated_at();
revoke all on function kynetra_internal.kynetra_updated_at() from public, anon, authenticated;

-- Ensure anonymous visitors cannot read meeting organizer details.
revoke all on public.profiles from anon;
revoke all on public.meetings from anon;
grant select, update on public.profiles to authenticated;
grant select on public.meetings to authenticated;
