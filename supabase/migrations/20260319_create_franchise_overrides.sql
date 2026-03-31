create table if not exists public.franchise_overrides (
  platform text not null check (platform in ('ANILIST', 'MAL')),
  account_key text not null,
  entry_id bigint not null,
  target_franchise_id text not null,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (platform, account_key, entry_id)
);

create index if not exists franchise_overrides_target_idx
  on public.franchise_overrides (platform, account_key, target_franchise_id);

alter table public.franchise_overrides enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'franchise_overrides'
      and policyname = 'franchise_overrides_public_read'
  ) then
    create policy franchise_overrides_public_read
      on public.franchise_overrides
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
      and tablename = 'franchise_overrides'
      and policyname = 'franchise_overrides_public_write'
  ) then
    create policy franchise_overrides_public_write
      on public.franchise_overrides
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
      and tablename = 'franchise_overrides'
      and policyname = 'franchise_overrides_public_update'
  ) then
    create policy franchise_overrides_public_update
      on public.franchise_overrides
      for update
      to anon, authenticated
      using (true)
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
      and tablename = 'franchise_overrides'
      and policyname = 'franchise_overrides_public_delete'
  ) then
    create policy franchise_overrides_public_delete
      on public.franchise_overrides
      for delete
      to anon, authenticated
      using (true);
  end if;
end
$$;
