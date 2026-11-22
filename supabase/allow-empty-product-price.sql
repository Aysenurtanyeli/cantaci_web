-- Ürün fiyatını isteğe bağlı yapar; boş fiyat NULL olarak saklanır.
alter table public.products
  alter column fiyat drop not null;
