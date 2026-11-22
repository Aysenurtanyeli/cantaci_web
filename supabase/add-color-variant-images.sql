-- Admin panelinde her ürün rengi için ayrı fotoğraf galerisi saklar.
alter table public.products
  add column if not exists renk_gorselleri jsonb not null default '[]'::jsonb;

comment on column public.products.renk_gorselleri is
  'Renk başına fotoğraf listesi: [{"color":"Siyah","images":["https://..."]}]';
