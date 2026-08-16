create extension if not exists pgcrypto;

create table if not exists public.maple_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  class_name text,
  level integer,
  combat_power bigint,
  memo text,
  updated_at timestamptz not null default now()
);

create table if not exists public.maple_checklist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  cycle text not null default 'daily' check (cycle in ('daily','weekly','once')),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.meso_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income','expense')),
  amount bigint not null check (amount > 0),
  category text,
  memo text,
  created_at timestamptz not null default now()
);

create table if not exists public.enhancement_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_name text not null,
  enhance_type text not null check (enhance_type in ('starforce','potential','additional','scroll','other')),
  result text not null check (result in ('success','fail','destroyed','change')),
  cost bigint not null default 0 check (cost >= 0),
  memo text,
  created_at timestamptz not null default now()
);

create index if not exists maple_checklist_user_idx on public.maple_checklist(user_id, created_at);
create index if not exists meso_records_user_idx on public.meso_records(user_id, created_at desc);
create index if not exists enhancement_records_user_idx on public.enhancement_records(user_id, created_at desc);

alter table public.maple_profile enable row level security;
alter table public.maple_checklist enable row level security;
alter table public.meso_records enable row level security;
alter table public.enhancement_records enable row level security;

do $$
declare t text;
begin
  foreach t in array array['maple_profile','maple_checklist','meso_records','enhancement_records']
  loop
    execute format('drop policy if exists "own_select" on public.%I', t);
    execute format('drop policy if exists "own_insert" on public.%I', t);
    execute format('drop policy if exists "own_update" on public.%I', t);
    execute format('drop policy if exists "own_delete" on public.%I', t);

    execute format('create policy "own_select" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "own_insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "own_update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "own_delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

grant select,insert,update,delete on public.maple_profile to authenticated;
grant select,insert,update,delete on public.maple_checklist to authenticated;
grant select,insert,update,delete on public.meso_records to authenticated;
grant select,insert,update,delete on public.enhancement_records to authenticated;
