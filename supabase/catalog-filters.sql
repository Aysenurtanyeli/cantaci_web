-- Run once in the Supabase SQL Editor to enable product type/model filters.
alter table public.products
  add column if not exists urun_turu text,
  add column if not exists alt_tur text;

-- Allow the new child collection in the existing category constraint.
alter table public.products
  drop constraint if exists products_kategori_check;

alter table public.products
  add constraint products_kategori_check
  check (
    kategori is null
    or lower(kategori) in (
      'kadin', 'kadın', 'erkek', 'unisex', 'cocuk', 'çocuk',
      'women', 'woman', 'men', 'man', 'kids', 'children'
    )
  );
