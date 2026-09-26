-- ============================================================
-- WEST PERFUMES — Migration : livraison par wilaya (remplace le prix produit par wilaya)
-- À exécuter APRÈS schema.sql + migration_wilaya_pricing.sql + migration_storage.sql.
--
-- CHANGEMENT DE COMPORTEMENT DEMANDÉ :
-- L'ancien système (migration_wilaya_pricing.sql) permettait de fixer un prix PRODUIT
-- différent par wilaya (table product_wilaya_prices). Ce n'est plus ce qui est voulu :
-- le prix d'un parfum doit être IDENTIQUE partout. Ce qui doit varier par wilaya, c'est
-- le FRAIS DE LIVRAISON, et de la même façon pour tous les produits.
--
-- Cette migration :
--   1. Supprime le système de prix produit par wilaya (table, vue, fonction).
--   2. Crée un système de frais de livraison par wilaya, unique pour toute la boutique.
--   3. Met à jour place_order() pour résoudre le frais de livraison par wilaya côté serveur.
--   4. Corrige deux points annexes : validation du téléphone dans place_order(), et
--      l'upsert client qui écrasait le nom du client existant à chaque nouvelle commande.
-- ============================================================

-- ---------- 1. Suppression de l'ancien système (prix produit par wilaya) ----------
drop function if exists get_product_prices(text);
drop view if exists product_wilaya_price_grid;
drop table if exists product_wilaya_prices;

-- ---------- 2. Frais de livraison par wilaya (un seul tarif, valable pour tous les produits) ----------
create table if not exists wilaya_delivery_fees (
  id serial primary key,
  wilaya_id int not null unique references wilayas(id) on delete cascade,
  fee int not null check (fee >= 0),
  is_served boolean not null default true,
  updated_at timestamptz default now()
);

alter table wilaya_delivery_fees enable row level security;
drop policy if exists "public read delivery fees" on wilaya_delivery_fees;
create policy "public read delivery fees" on wilaya_delivery_fees for select using (true);
drop policy if exists "admin write delivery fees" on wilaya_delivery_fees;
create policy "admin write delivery fees" on wilaya_delivery_fees for all using (is_admin()) with check (is_admin());

-- ---------- Fonction publique : frais de livraison résolu pour une wilaya ----------
-- Utilisée côté client (panier / checkout) pour un affichage indicatif du frais de
-- livraison avant validation ; place_order() recalcule et fixe le montant définitif
-- côté serveur, sans jamais faire confiance à ce que le navigateur envoie.
create or replace function get_delivery_fee(p_wilaya_name text)
returns table (fee int, is_served boolean) language plpgsql stable security definer set search_path = public as $$
declare v_default int; v_row wilaya_delivery_fees;
begin
  select coalesce((value)::int, 600) into v_default from settings where key = 'delivery_fee';
  select wdf.* into v_row from wilaya_delivery_fees wdf join wilayas w on w.id = wdf.wilaya_id where w.name = p_wilaya_name;
  if v_row.id is null then
    return query select v_default, true; -- pas de ligne = tarif standard, wilaya desservie par défaut
  else
    return query select v_row.fee, v_row.is_served;
  end if;
end $$;
revoke execute on function get_delivery_fee from public;
grant execute on function get_delivery_fee to anon, authenticated;

-- ---------- 3. place_order() : frais de livraison résolu par wilaya (plus de prix produit par wilaya) ----------
create or replace function place_order(p_customer jsonb, p_items jsonb, p_address jsonb, p_coupon text default null)
returns table (order_number text, order_id uuid) language plpgsql security definer set search_path = public as $$
declare
  it jsonb; p products; v_fmt perfume_format; v_qty int; v_price int; v_stock int; v_size text;
  v_sub int := 0; v_disc int := 0; v_fee int; v_free int; v_low int; v_cust uuid; v_order uuid; v_num text; c coupons; v_auto boolean;
  v_wilaya_id int; v_wdf wilaya_delivery_fees;
begin
  if jsonb_array_length(p_items) = 0 then raise exception 'EMPTY_CART'; end if;
  if p_customer->>'phone' !~ '^0[5-7][0-9]{8}$' then raise exception 'INVALID_PHONE'; end if;

  select coalesce((value)::int,600) into v_fee from settings where key='delivery_fee';
  select coalesce((value)::int,0) into v_free from settings where key='free_delivery_threshold';
  select coalesce((value)::int,5) into v_low from settings where key='low_stock_threshold';
  select coalesce((value)::boolean,false) into v_auto from settings where key='auto_confirm';

  -- Résout la wilaya envoyée (nom exact) vers son id ; une wilaya inconnue est refusée
  -- pour éviter qu'une commande soit créée avec un frais de livraison non maîtrisé.
  select id into v_wilaya_id from wilayas where name = p_address->>'wilaya';
  if v_wilaya_id is null then raise exception 'INVALID_WILAYA'; end if;

  -- Frais de livraison : même tarif pour tous les produits, résolu uniquement par wilaya.
  select * into v_wdf from wilaya_delivery_fees where wilaya_id = v_wilaya_id;
  if v_wdf.id is not null then
    if not v_wdf.is_served then raise exception 'WILAYA_NOT_SERVED'; end if;
    v_fee := v_wdf.fee;
  end if;

  insert into customers(name,phone,email,wilaya,commune,address)
  values (p_customer->>'name', p_customer->>'phone', nullif(p_customer->>'email',''), p_address->>'wilaya', p_address->>'commune', p_address->>'address')
  on conflict (phone) do update set
    -- Le nom n'est plus écrasé par une commande ultérieure (une même ligne "phone" peut
    -- recevoir une commande passée par erreur au nom de quelqu'un d'autre) ; seules les
    -- coordonnées de livraison, légitimement amenées à changer, sont mises à jour.
    email=coalesce(excluded.email,customers.email), wilaya=excluded.wilaya, commune=excluded.commune, address=excluded.address
  returning id into v_cust;

  v_num := 'WP-' || extract(year from now())::int || '-' || lpad(nextval('order_seq')::text, 6, '0');
  insert into orders(order_number,customer_id,status,subtotal,delivery_fee,total,wilaya,commune,address,notes)
  values (v_num, v_cust, (case when v_auto then 'confirmee' else 'nouvelle' end)::order_status, 0,0,0, p_address->>'wilaya', p_address->>'commune', p_address->>'address', p_address->>'notes')
  returning id into v_order;

  for it in select * from jsonb_array_elements(p_items) loop
    select * into p from products where id = (it->>'product_id')::uuid and is_active for update;
    if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;
    v_fmt := (it->>'format')::perfume_format; v_qty := (it->>'quantity')::int;
    if v_qty is null or v_qty <= 0 then raise exception 'INVALID_QUANTITY'; end if;
    if v_fmt = 'full' then
      if not p.full_enabled then raise exception 'FORMAT_UNAVAILABLE:%', p.name; end if;
      v_price := p.full_price; v_stock := p.full_stock; v_size := p.full_size;
    else
      if not p.sample_10ml then raise exception 'FORMAT_UNAVAILABLE:%', p.name; end if;
      v_price := p.price_10ml; v_stock := p.stock_10ml; v_size := '10ML';
    end if;
    if v_stock < v_qty then raise exception 'OUT_OF_STOCK:% (%)', p.name, v_size; end if;

    -- Le prix produit est TOUJOURS le prix de base : il ne dépend plus de la wilaya.
    insert into order_items(order_id,product_id,product_name,format,size,quantity,unit_price,subtotal)
    values (v_order,p.id,p.name,v_fmt,v_size,v_qty,v_price,v_price*v_qty);
    v_sub := v_sub + v_price*v_qty;

    if v_fmt='full' then update products set full_stock = full_stock - v_qty where id=p.id;
    else update products set stock_10ml = stock_10ml - v_qty where id=p.id; end if;
    insert into stock_movements(product_id,format,delta,reason,order_id) values (p.id,v_fmt,-v_qty,'order',v_order);

    if v_stock - v_qty <= 0 then
      insert into notifications(type,title,body,product_id) values ('out_of_stock','Rupture de stock', p.name||' — '||v_size, p.id);
    elsif v_stock - v_qty <= v_low then
      insert into notifications(type,title,body,product_id) values ('low_stock','Stock faible', p.name||' — '||v_size||' ('||(v_stock-v_qty)||')', p.id);
    end if;
  end loop;

  if p_coupon is not null then
    select * into c from coupons where code = upper(p_coupon) and is_active
      and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now())
      and (max_uses is null or used_count < max_uses) and v_sub >= min_order;
    if found then
      v_disc := case when c.discount_type='percent' then v_sub * c.value / 100 else least(c.value, v_sub) end;
      update coupons set used_count = used_count + 1 where id = c.id;
    end if;
  end if;

  if v_free > 0 and (v_sub - v_disc) >= v_free then v_fee := 0; end if;
  update orders set subtotal=v_sub, discount=v_disc, delivery_fee=v_fee, total=v_sub-v_disc+v_fee, coupon_code=case when v_disc>0 then upper(p_coupon) end where id=v_order;
  insert into notifications(type,title,body,order_id) values ('new_order','Nouvelle commande', v_num||' — '||(v_sub-v_disc+v_fee)||' DA', v_order);

  return query select v_num, v_order;
end $$;

-- ============================================================
-- Note sécurité (voir aussi la correction du middleware côté application) :
-- middleware.ts ne vérifiait auparavant que la présence d'une session Supabase
-- authentifiée pour autoriser l'accès à /admin/*, sans vérifier l'appartenance à la
-- table `admins`. Les données restaient protégées par les policies RLS (is_admin()),
-- mais un utilisateur authentifié non-admin (ex. un compte créé via l'auto-inscription
-- Supabase si elle est activée) pouvait tout de même atteindre l'interface /admin.
-- Le nouveau middleware.ts fourni avec cette mise à jour vérifie explicitement la
-- présence d'une ligne dans `admins` avant d'autoriser l'accès.
-- ============================================================
