-- ============================================================
-- WEST PERFUMES — Migration : 69 wilayas + prix régionaux
-- Additive uniquement : ne supprime ni ne modifie aucune table existante.
-- À exécuter dans le SQL Editor de Supabase APRÈS schema.sql.
-- ============================================================

-- ---------- Référentiel des 69 wilayas (réforme du 16 nov. 2025) ----------
create table if not exists wilayas (
  id serial primary key,
  code smallint unique not null,
  name text unique not null
);

insert into wilayas (code, name) values
(1,'Adrar'),(2,'Chlef'),(3,'Laghouat'),(4,'Oum El Bouaghi'),(5,'Batna'),
(6,'Béjaïa'),(7,'Biskra'),(8,'Béchar'),(9,'Blida'),(10,'Bouira'),
(11,'Tamanrasset'),(12,'Tébessa'),(13,'Tlemcen'),(14,'Tiaret'),(15,'Tizi Ouzou'),
(16,'Alger'),(17,'Djelfa'),(18,'Jijel'),(19,'Sétif'),(20,'Saïda'),
(21,'Skikda'),(22,'Sidi Bel Abbès'),(23,'Annaba'),(24,'Guelma'),(25,'Constantine'),
(26,'Médéa'),(27,'Mostaganem'),(28,'M''Sila'),(29,'Mascara'),(30,'Ouargla'),
(31,'Oran'),(32,'El Bayadh'),(33,'Illizi'),(34,'Bordj Bou Arréridj'),(35,'Boumerdès'),
(36,'El Tarf'),(37,'Tindouf'),(38,'Tissemsilt'),(39,'El Oued'),(40,'Khenchela'),
(41,'Souk Ahras'),(42,'Tipaza'),(43,'Mila'),(44,'Aïn Defla'),(45,'Naâma'),
(46,'Aïn Témouchent'),(47,'Ghardaïa'),(48,'Relizane'),(49,'Timimoun'),(50,'Bordj Badji Mokhtar'),
(51,'Ouled Djellal'),(52,'Béni Abbès'),(53,'In Salah'),(54,'In Guezzam'),(55,'Touggourt'),
(56,'Djanet'),(57,'El M''Ghair'),(58,'El Meniaa'),
-- Les 11 wilayas créées le 16 novembre 2025 :
(59,'Aflou'),(60,'El Abiodh Sidi Cheikh'),(61,'El Aricha'),(62,'El Kantara'),(63,'Barika'),
(64,'Bousaâda'),(65,'Bir El Ater'),(66,'Ksar El Boukhari'),(67,'Ksar Chellala'),(68,'Aïn Oussera'),
(69,'Messaad')
on conflict (code) do nothing;

-- ---------- Prix régionaux (surcharge optionnelle par produit / wilaya / format) ----------
-- S'il n'existe pas de ligne ici pour un couple (produit, wilaya, format),
-- le prix de base du produit (full_price / price_10ml) s'applique automatiquement.
create table if not exists product_wilaya_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  wilaya_id int not null references wilayas(id) on delete cascade,
  format perfume_format not null,
  price int not null check (price >= 0),
  updated_at timestamptz default now(),
  unique (product_id, wilaya_id, format)
);
create index if not exists idx_pwp_product on product_wilaya_prices (product_id);
create index if not exists idx_pwp_wilaya on product_wilaya_prices (wilaya_id);

alter table wilayas enable row level security;
alter table product_wilaya_prices enable row level security;

drop policy if exists "public read wilayas" on wilayas;
create policy "public read wilayas" on wilayas for select using (true);
drop policy if exists "admin write wilayas" on wilayas;
create policy "admin write wilayas" on wilayas for all using (is_admin()) with check (is_admin());

drop policy if exists "public read wilaya prices" on product_wilaya_prices;
create policy "public read wilaya prices" on product_wilaya_prices for select using (true);
drop policy if exists "admin write wilaya prices" on product_wilaya_prices;
create policy "admin write wilaya prices" on product_wilaya_prices for all using (is_admin()) with check (is_admin());

-- ---------- Vue pratique pour l'admin : voir toutes les wilayas + prix (ou null) pour un produit ----------
create or replace view product_wilaya_price_grid as
select p.id as product_id, w.id as wilaya_id, w.code as wilaya_code, w.name as wilaya_name,
  pf.price as full_price_override, p.full_price as full_price_base,
  pt.price as price_10ml_override, p.price_10ml as price_10ml_base
from products p
cross join wilayas w
left join product_wilaya_prices pf on pf.product_id = p.id and pf.wilaya_id = w.id and pf.format = 'full'
left join product_wilaya_prices pt on pt.product_id = p.id and pt.wilaya_id = w.id and pt.format = '10ml';

-- ============================================================
-- Mise à jour de place_order : résolution du prix par wilaya, côté serveur.
-- Le prix envoyé par le client n'est JAMAIS utilisé (déjà le cas avant cette
-- migration) — seule la logique de résolution du prix change ci-dessous.
-- ============================================================
create or replace function place_order(p_customer jsonb, p_items jsonb, p_address jsonb, p_coupon text default null)
returns table (order_number text, order_id uuid) language plpgsql security definer set search_path = public as $$
declare
  it jsonb; p products; v_fmt perfume_format; v_qty int; v_price int; v_stock int; v_size text;
  v_sub int := 0; v_disc int := 0; v_fee int; v_free int; v_low int; v_cust uuid; v_order uuid; v_num text; c coupons; v_auto boolean;
  v_wilaya_id int; v_override int;
begin
  if jsonb_array_length(p_items) = 0 then raise exception 'EMPTY_CART'; end if;
  select coalesce((value)::int,600) into v_fee from settings where key='delivery_fee';
  select coalesce((value)::int,0) into v_free from settings where key='free_delivery_threshold';
  select coalesce((value)::int,5) into v_low from settings where key='low_stock_threshold';
  select coalesce((value)::boolean,false) into v_auto from settings where key='auto_confirm';

  -- Résout la wilaya envoyée (nom exact) vers son id ; reste NULL si non trouvée
  -- (dans ce cas, tous les produits retombent sur leur prix de base).
  select id into v_wilaya_id from wilayas where name = p_address->>'wilaya';

  insert into customers(name,phone,email,wilaya,commune,address)
  values (p_customer->>'name', p_customer->>'phone', nullif(p_customer->>'email',''), p_address->>'wilaya', p_address->>'commune', p_address->>'address')
  on conflict (phone) do update set name=excluded.name, email=coalesce(excluded.email,customers.email),
    wilaya=excluded.wilaya, commune=excluded.commune, address=excluded.address
  returning id into v_cust;

  v_num := 'WP-' || extract(year from now())::int || '-' || lpad(nextval('order_seq')::text, 6, '0');
  insert into orders(order_number,customer_id,status,subtotal,delivery_fee,total,wilaya,commune,address,notes)
  values (v_num, v_cust, (case when v_auto then 'confirmee' else 'nouvelle' end)::order_status, 0,0,0, p_address->>'wilaya', p_address->>'commune', p_address->>'address', p_address->>'notes')
  returning id into v_order;

  for it in select * from jsonb_array_elements(p_items) loop
    select * into p from products where id = (it->>'product_id')::uuid and is_active for update;
    if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;
    v_fmt := (it->>'format')::perfume_format; v_qty := (it->>'quantity')::int;
    if v_fmt = 'full' then
      if not p.full_enabled then raise exception 'FORMAT_UNAVAILABLE:%', p.name; end if;
      v_price := p.full_price; v_stock := p.full_stock; v_size := p.full_size;
    else
      if not p.sample_10ml then raise exception 'FORMAT_UNAVAILABLE:%', p.name; end if;
      v_price := p.price_10ml; v_stock := p.stock_10ml; v_size := '10ML';
    end if;
    if v_stock < v_qty then raise exception 'OUT_OF_STOCK:% (%)', p.name, v_size; end if;

    -- Surcharge régionale : si une ligne existe pour ce produit/wilaya/format, elle remplace le prix de base.
    if v_wilaya_id is not null then
      select price into v_override from product_wilaya_prices where product_id = p.id and wilaya_id = v_wilaya_id and format = v_fmt;
      if v_override is not null then v_price := v_override; end if;
    end if;

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

-- ---------- Fonction publique : donne le prix résolu (base ou régional) pour un produit + wilaya ----------
-- Utilisée côté client pour afficher le bon prix quand l'utilisateur change de wilaya,
-- sans jamais faire confiance à un prix calculé côté navigateur.
create or replace function get_product_prices(p_wilaya_name text)
returns table (product_id uuid, full_price int, price_10ml int) language sql stable security definer set search_path = public as $$
  select p.id,
    coalesce((select price from product_wilaya_prices pw join wilayas w on w.id=pw.wilaya_id where pw.product_id=p.id and pw.format='full' and w.name=p_wilaya_name), p.full_price),
    coalesce((select price from product_wilaya_prices pw join wilayas w on w.id=pw.wilaya_id where pw.product_id=p.id and pw.format='10ml' and w.name=p_wilaya_name), p.price_10ml)
  from products p where p.is_active
$$;
grant execute on function get_product_prices to anon, authenticated;
