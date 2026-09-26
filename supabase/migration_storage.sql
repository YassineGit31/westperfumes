-- ============================================================
-- WEST PERFUMES — Migration : Supabase Storage pour les images produits
-- Additive uniquement. À exécuter après migration_wilaya_pricing.sql.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Lecture publique (le site affiche les images à tout le monde)
drop policy if exists "public read product images" on storage.objects;
create policy "public read product images" on storage.objects
  for select using (bucket_id = 'product-images');

-- Écriture réservée aux admins connectés (voir is_admin() dans schema.sql)
drop policy if exists "admin upload product images" on storage.objects;
create policy "admin upload product images" on storage.objects
  for insert with check (bucket_id = 'product-images' and is_admin());

drop policy if exists "admin update product images" on storage.objects;
create policy "admin update product images" on storage.objects
  for update using (bucket_id = 'product-images' and is_admin());

drop policy if exists "admin delete product images" on storage.objects;
create policy "admin delete product images" on storage.objects
  for delete using (bucket_id = 'product-images' and is_admin());
