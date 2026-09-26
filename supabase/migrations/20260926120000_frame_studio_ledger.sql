-- Frame Studio spend ledger (auditing). Safe to run once.
create table if not exists public.frame_studio_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  frame_id text not null,
  tier text not null check (tier in ('common', 'aiplus', 'premium')),
  cost integer not null check (cost >= 0),
  created_at timestamptz not null default now()
);

create index if not exists frame_studio_ledger_user_created
  on public.frame_studio_ledger (user_id, created_at desc);

alter table public.frame_studio_ledger enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'frame_studio_ledger' and policyname = 'Users view own frame ledger'
  ) then
    create policy "Users view own frame ledger"
      on public.frame_studio_ledger for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

grant select on public.frame_studio_ledger to authenticated;
grant all on public.frame_studio_ledger to service_role;
