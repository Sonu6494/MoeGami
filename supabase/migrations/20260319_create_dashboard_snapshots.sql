create table if not exists public.dashboard_snapshots (
  platform text not null check (platform in ('ANILIST', 'MAL')),
  account_key text not null,
  payload jsonb not null,
  synced_at timestamptz not null,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (platform, account_key)
);

create index if not exists dashboard_snapshots_synced_at_idx
  on public.dashboard_snapshots (synced_at desc);

alter table public.dashboard_snapshots enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'dashboard_snapshots'
      and policyname = 'dashboard_snapshots_public_read'
  ) then
    create policy dashboard_snapshots_public_read
      on public.dashboard_snapshots
      for select
      to anon, authenticated
      using (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'dashboard_snapshots'
      and policyname = 'dashboard_snapshots_public_write'
  ) then
    create policy dashboard_snapshots_public_write
      on public.dashboard_snapshots
      for insert
      to anon, authenticated
      with check (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'dashboard_snapshots'
      and policyname = 'dashboard_snapshots_public_update'
  ) then
    create policy dashboard_snapshots_public_update
      on public.dashboard_snapshots
      for update
      to anon, authenticated
      using (true)
      with check (true);
  end if;
end
$$;
