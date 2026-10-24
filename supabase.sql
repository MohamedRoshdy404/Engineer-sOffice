create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 150),
  partner_price numeric(12, 2) check (partner_price >= 0),
  regular_price numeric(12, 2) check (regular_price >= 0),
  price_note text,
  constraint services_pricing_mode_check check (
    (partner_price is not null and regular_price is not null and price_note is null)
    or
    (partner_price is null and regular_price is null and price_note = 'حسب الاتفاق')
  ),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;
alter table public.services enable row level security;
alter table public.admin_users enable row level security;

create or replace function public.is_price_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_price_admin() from public;
grant execute on function public.is_price_admin() to anon, authenticated;

drop policy if exists "Public can read categories" on public.categories;
create policy "Public can read categories"
  on public.categories for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can manage categories" on public.categories;
create policy "Admins can manage categories"
  on public.categories for all
  to authenticated
  using ((select public.is_price_admin()))
  with check ((select public.is_price_admin()));

drop policy if exists "Public can read services" on public.services;
create policy "Public can read services"
  on public.services for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can manage services" on public.services;
create policy "Admins can manage services"
  on public.services for all
  to authenticated
  using ((select public.is_price_admin()))
  with check ((select public.is_price_admin()));

drop policy if exists "Admins can read own admin record" on public.admin_users;
create policy "Admins can read own admin record"
  on public.admin_users for select
  to authenticated
  using (user_id = (select auth.uid()));

grant select on public.categories, public.services to anon, authenticated;
grant insert, update, delete on public.categories, public.services to authenticated;
grant select on public.admin_users to authenticated;
