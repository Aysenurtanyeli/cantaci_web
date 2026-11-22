-- Çantacı Mehmet: vitrin izinleri, admin yazma kilidi ve favoriler.
-- Supabase SQL Editor'a yapıştırıp bir kez çalıştırın.
-- Eski products politikaları kaldırılır; yazma yalnızca yönetici e-postasına kalır.

grant usage on schema public to anon, authenticated;

grant select on table public.products to anon, authenticated;
grant insert, update, delete on table public.products to authenticated;
grant usage, select on all sequences in schema public to authenticated;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'id'
  ) then
    alter table public.products
      add column id uuid default gen_random_uuid() primary key;
  end if;
end $$;

alter table public.products enable row level security;

-- Ürünleri tür ve alt türe göre filtreleyebilmek için sınıflandırma alanları.
alter table public.products
  add column if not exists urun_turu text,
  add column if not exists alt_tur text,
  add column if not exists renk_gorselleri jsonb not null default '[]'::jsonb;

alter table public.products alter column fiyat drop not null;

do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'products'
  loop
    execute format('drop policy %I on public.products', r.policyname);
  end loop;
end $$;

create policy "products_public_read"
on public.products
for select
to anon, authenticated
using (
  yayinda_mi = true
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'cantacimwebde@gmail.com'
);

create policy "products_admin_insert"
on public.products
for insert
to authenticated
with check (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'cantacimwebde@gmail.com'
);

create policy "products_admin_update"
on public.products
for update
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'cantacimwebde@gmail.com'
)
with check (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'cantacimwebde@gmail.com'
);

create policy "products_admin_delete"
on public.products
for delete
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'cantacimwebde@gmail.com'
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists favorites_user_id_idx
  on public.favorites (user_id, created_at desc);

alter table public.favorites enable row level security;

grant select, insert, delete on table public.favorites to authenticated;

drop policy if exists "favorites_select_own" on public.favorites;
drop policy if exists "favorites_insert_own" on public.favorites;
drop policy if exists "favorites_delete_own" on public.favorites;

create policy "favorites_select_own"
on public.favorites
for select
to authenticated
using (auth.uid() = user_id);

create policy "favorites_insert_own"
on public.favorites
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "favorites_delete_own"
on public.favorites
for delete
to authenticated
using (auth.uid() = user_id);
