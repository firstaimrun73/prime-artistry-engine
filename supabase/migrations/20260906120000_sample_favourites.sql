-- Persistent sample favourites for homepage discovery.
-- user_id + sample_id unique. Admin can read all via service role.

create table if not exists public.sample_favourites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sample_id text not null,
  sample_title text,
  sample_url text,
  sample_kind text,
  sample_aspect text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, sample_id)
);

create index if not exists sample_favourites_user_idx on public.sample_favourites (user_id);
create index if not exists sample_favourites_sample_idx on public.sample_favourites (sample_id);
create index if not exists sample_favourites_created_idx on public.sample_favourites (created_at desc);

alter table public.sample_favourites enable row level security;

drop policy if exists "Users read own favourites" on public.sample_favourites;
create policy "Users read own favourites"
  on public.sample_favourites for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own favourites" on public.sample_favourites;
create policy "Users insert own favourites"
  on public.sample_favourites for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own favourites" on public.sample_favourites;
create policy "Users delete own favourites"
  on public.sample_favourites for delete
  using (auth.uid() = user_id);
