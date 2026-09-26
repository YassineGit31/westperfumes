-- WEST PERFUMES — Supabase schema (run in SQL editor)
-- Every perfume has two formats: 'full' and '10ml', each with its own price/stock/availability.

create extension if not exists pgcrypto;

create type order_status as enum ('nouvelle','a_confirmer','confirmee','en_preparation','expediee','livree','annulee','refusee');
create type perfume_format as enum ('full','10ml');

create table admins (user_id uuid primary key references auth.users on delete cascade, full_name text, created_at timestamptz default now());
create function is_admin() returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from admins where user_id = auth.uid()) $$;

create table categories (id serial primary key, name text not null, slug text unique not null, gender text check (gender in ('homme','femme','unisex')));

create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null, slug text unique not null, brand text not null, description text,
  category_id int references categories(id), gender text not null check (gender in ('homme','femme','unisex')),
  sku text unique, images text[] default '{}',
  top_notes text[] default '{}', heart_notes text[] default '{}', base_notes text[] default '{}',
  -- FULL SIZE
  full_size text default '100ML', full_size_ml int not null default 100, full_price int not null default 0, full_old_price int, full_enabled boolean not null default true,
  -- 10ML
  sample_10ml boolean not null default true, price_10ml int, old_price_10ml int,
  -- STOCK: single physical pool, tracked in ml. A full bottle and its 10ml portions are the SAME liquid,
  -- so both displayed stocks below are always derived from this one number and stay in sync automatically:
  -- selling one full bottle removes full_size_ml from stock_ml; selling one 10ml portion removes 10.
  stock_ml int not null default 0,
  full_stock int generated always as (floor(stock_ml::numeric / nullif(full_size_ml,0))::int) stored,
  stock_10ml int generated always as (floor(stock_ml::numeric / 10)::int) stored,
  is_featured boolean default false, is_best_seller boolean default false, is_new boolean default false, is_active boolean default true,
  created_at timestamptz default now()
);
create index on products (gender, is_active);

-- Keep full_size_ml (the numeric volume of one full bottle) in sync with the free-text full_size label
-- (e.g. '100ML' -> 100, '50 ml' -> 50) so admins only ever type the label and the math stays correct.
create function sync_full_size_ml() returns trigger language plpgsql as $$
begin
  new.full_size_ml := greatest(1, coalesce(nullif(regexp_replace(coalesce(new.full_size,''), '\D', '', 'g'), '')::int, 100));
  return new;
end $$;
create trigger trg_products_full_size_ml before insert or update of full_size on products for each row execute function sync_full_size_ml();

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null, phone text not null unique, email text, wilaya text, commune text, address text,
  status text default 'actif', created_at timestamptz default now()
);

create table coupons (
  id serial primary key, code text unique not null,
  discount_type text not null check (discount_type in ('percent','fixed')), value int not null,
  starts_at timestamptz, ends_at timestamptz, min_order int default 0, max_uses int, used_count int default 0, is_active boolean default true
);

create sequence order_seq start 1;
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  customer_id uuid references customers(id),
  status order_status not null default 'nouvelle',
  subtotal int not null, discount int not null default 0, delivery_fee int not null, total int not null,
  coupon_code text, payment_method text not null default 'cod',
  wilaya text not null, commune text not null, address text not null, notes text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index on orders (status, created_at desc);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null, format perfume_format not null, size text not null,
  quantity int not null check (quantity > 0), unit_price int not null, subtotal int not null
);

create table order_status_history (
  id bigserial primary key, order_id uuid references orders(id) on delete cascade,
  status order_status not null, changed_by uuid, created_at timestamptz default now()
);

create table stock_movements (
  id bigserial primary key, product_id uuid references products(id) on delete cascade,
  format perfume_format not null, delta int not null, reason text not null, order_id uuid, created_at timestamptz default now()
);

create table notifications (
  id bigserial primary key, type text not null, -- new_order | order_cancelled | low_stock | out_of_stock
  title text not null, body text, order_id uuid, product_id uuid, is_read boolean default false, created_at timestamptz default now()
);

create table settings (key text primary key, value jsonb not null);

create table messages (
  id uuid primary key default gen_random_uuid(),
  name text not null, phone text, email text, subject text, body text not null,
  is_read boolean default false, created_at timestamptz default now()
);

create table newsletter_subscribers (
  id uuid primary key default gen_random_uuid(), email text unique not null, created_at timestamptz default now()
);

-- ---------- Triggers ----------
create function log_status() returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into order_status_history(order_id, status, changed_by) values (new.id, new.status, auth.uid());
    new.updated_at = now();
    if tg_op = 'UPDATE' and new.status = 'annulee' then
      insert into notifications(type,title,body,order_id) values ('order_cancelled','Commande annulée', new.order_number, new.id);
    end if;
  end if;
  return new;
end $$;
create trigger trg_order_status_upd before update on orders for each row execute function log_status();
create function log_status_ins() returns trigger language plpgsql security definer as $$
begin insert into order_status_history(order_id,status) values (new.id,new.status); return new; end $$;
create trigger trg_order_status_ins after insert on orders for each row execute function log_status_ins();

create function log_message() returns trigger language plpgsql security definer as $$
begin insert into notifications(type,title,body) values ('new_message','Nouveau message', new.name||' — '||left(new.body,80)); return new; end $$;
create trigger trg_message_ins after insert on messages for each row execute function log_message();

-- ---------- Place order (guest checkout; prices & stock computed server-side) ----------
-- p_items: [{"product_id":"...","format":"full|10ml","quantity":2}]
create function place_order(p_customer jsonb, p_items jsonb, p_address jsonb, p_coupon text default null)
returns table (order_number text, order_id uuid) language plpgsql security definer set search_path = public as $$
declare
  it jsonb; p products; v_fmt perfume_format; v_qty int; v_price int; v_stock int; v_size text; v_unit_ml int; v_new_full int; v_new_10ml int;
  v_sub int := 0; v_disc int := 0; v_fee int; v_free int; v_low int; v_cust uuid; v_order uuid; v_num text; c coupons; v_auto boolean;
begin
  if jsonb_array_length(p_items) = 0 then raise exception 'EMPTY_CART'; end if;
  select coalesce((value)::int,600) into v_fee from settings where key='delivery_fee';
  select coalesce((value)::int,0) into v_free from settings where key='free_delivery_threshold';
  select coalesce((value)::int,5) into v_low from settings where key='low_stock_threshold';
  select coalesce((value)::boolean,false) into v_auto from settings where key='auto_confirm';

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
    -- full bottles and 10ml portions are drawn from the SAME physical stock (stock_ml), so selling
    -- either format always moves both displayed counters together, in proportion to the ml sold.
    if v_fmt = 'full' then
      if not p.full_enabled then raise exception 'FORMAT_UNAVAILABLE:%', p.name; end if;
      v_price := p.full_price; v_stock := p.full_stock; v_size := p.full_size; v_unit_ml := p.full_size_ml;
    else
      if not p.sample_10ml then raise exception 'FORMAT_UNAVAILABLE:%', p.name; end if;
      v_price := p.price_10ml; v_stock := p.stock_10ml; v_size := '10ML'; v_unit_ml := 10;
    end if;
    if v_stock < v_qty then raise exception 'OUT_OF_STOCK:% (%)', p.name, v_size; end if;

    insert into order_items(order_id,product_id,product_name,format,size,quantity,unit_price,subtotal)
    values (v_order,p.id,p.name,v_fmt,v_size,v_qty,v_price,v_price*v_qty);
    v_sub := v_sub + v_price*v_qty;

    update products set stock_ml = stock_ml - (v_unit_ml * v_qty) where id=p.id
      returning full_stock, stock_10ml into v_new_full, v_new_10ml;
    insert into stock_movements(product_id,format,delta,reason,order_id) values (p.id,v_fmt,-v_qty,'order',v_order);

    -- Notify on whichever displayed format(s) the shared pool now leaves low/out, not just the one sold.
    if p.full_enabled then
      if v_new_full <= 0 then insert into notifications(type,title,body,product_id) values ('out_of_stock','Rupture de stock', p.name||' — '||p.full_size, p.id);
      elsif v_new_full <= v_low then insert into notifications(type,title,body,product_id) values ('low_stock','Stock faible', p.name||' — '||p.full_size||' ('||v_new_full||')', p.id);
      end if;
    end if;
    if p.sample_10ml then
      if v_new_10ml <= 0 then insert into notifications(type,title,body,product_id) values ('out_of_stock','Rupture de stock', p.name||' — 10ML', p.id);
      elsif v_new_10ml <= v_low then insert into notifications(type,title,body,product_id) values ('low_stock','Stock faible', p.name||' — 10ML ('||v_new_10ml||')', p.id);
      end if;
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

-- ---------- Public order tracking (order number + phone) ----------
create function track_order(p_number text, p_phone text) returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'order_number', o.order_number, 'status', o.status, 'total', o.total, 'delivery_fee', o.delivery_fee, 'created_at', o.created_at,
    'items', (select coalesce(jsonb_agg(jsonb_build_object('name',i.product_name,'format',i.format,'size',i.size,'quantity',i.quantity,'unit_price',i.unit_price,'subtotal',i.subtotal)),'[]') from order_items i where i.order_id=o.id),
    'history', (select coalesce(jsonb_agg(jsonb_build_object('status',h.status,'at',h.created_at) order by h.created_at),'[]') from order_status_history h where h.order_id=o.id))
  from orders o join customers c on c.id=o.customer_id
  where o.order_number = upper(p_number) and c.phone = p_phone
$$;

-- ---------- Admin analytics: sales by format ----------
create view sales_by_format as
select i.format, date_trunc('day', o.created_at) as day, sum(i.quantity) as units, sum(i.subtotal) as revenue
from order_items i join orders o on o.id=i.order_id
where o.status not in ('annulee','refusee') group by 1,2;

-- ---------- Row Level Security ----------
alter table admins enable row level security; alter table categories enable row level security; alter table products enable row level security;
alter table customers enable row level security; alter table coupons enable row level security; alter table orders enable row level security;
alter table order_items enable row level security; alter table order_status_history enable row level security;
alter table stock_movements enable row level security; alter table notifications enable row level security; alter table settings enable row level security;
alter table messages enable row level security;
alter table newsletter_subscribers enable row level security;

create policy "public read categories" on categories for select using (true);
create policy "public read active products" on products for select using (is_active or is_admin());
create policy "public read settings" on settings for select using (key not like 'private_%' or is_admin());
create policy "public submit messages" on messages for insert with check (true);
create policy "public subscribe newsletter" on newsletter_subscribers for insert with check (true);
-- Guests never touch orders/customers directly: they call place_order() / track_order() (security definer).
do $$ declare t text; begin
  foreach t in array array['admins','categories','products','customers','coupons','orders','order_items','order_status_history','stock_movements','notifications','settings','messages','newsletter_subscribers'] loop
    execute format('create policy "admin all %1$s" on %1$I for all using (is_admin()) with check (is_admin())', t);
  end loop; end $$;
revoke execute on function place_order, track_order from public; grant execute on function place_order, track_order to anon, authenticated;

-- Storage: create a public bucket "product-images"; writes restricted to admins
insert into storage.buckets (id,name,public) values ('product-images','product-images',true) on conflict do nothing;
create policy "admin upload images" on storage.objects for all using (bucket_id='product-images' and is_admin()) with check (bucket_id='product-images' and is_admin());
create policy "public read images" on storage.objects for select using (bucket_id='product-images');

-- Realtime for admin notifications: alter publication supabase_realtime add table notifications, orders;

-- ---------- Seed ----------
insert into settings values ('delivery_fee','600'),('free_delivery_threshold','15000'),('low_stock_threshold','5'),('auto_confirm','false'),
 ('wilayas_served','"all"'),
 ('store','{"name":"WEST PERFUMES","phone":"","whatsapp":"","instagram":"","tiktok":"","facebook":""}');
insert into categories(name,slug,gender) values ('Homme','homme','homme'),('Femme','femme','femme'),('Unisex','unisex','unisex');
insert into coupons(code,discount_type,value) values ('WEST10','percent',10);

-- Demo catalogue references only; WEST PERFUMES is not the owner or manufacturer of these brands.
insert into products(name,slug,brand,gender,category_id,sku,full_price,price_10ml,stock_ml,top_notes,heart_notes,base_notes,is_best_seller,is_new,description) values
('Sauvage','dior-sauvage','Dior','homme',1,'WP-001',4500,900,1450,'{Bergamote,Poivre}','{Lavande,Géranium}','{Ambroxan,Vanille}',true,false,'Frais, poivré et boisé.'),
('Bleu de Chanel','bleu-de-chanel','Chanel','homme',1,'WP-002',5200,1000,1100,'{Agrumes,Menthe}','{Gingembre,Jasmin}','{Cèdre,Santal}',true,false,'Aromatique et intemporel.'),
('Y','ysl-y','Yves Saint Laurent','homme',1,'WP-003',4800,950,1180,'{Pomme,Gingembre}','{Sauge,Géranium}','{Cèdre,Fève tonka}',false,true,'Frais et moderne.'),
('Le Male','jpg-le-male','Jean Paul Gaultier','homme',1,'WP-004',4300,850,950,'{Menthe,Lavande}','{Cannelle}','{Vanille,Tonka}',false,false,'Iconique, ambré et vanillé.'),
('Acqua di Giò','armani-acqua-di-gio','Armani','homme',1,'WP-005',4200,850,1320,'{Marin,Citron}','{Jasmin,Romarin}','{Patchouli,Musc}',false,false,'Aquatique et léger.'),
('Libre','ysl-libre','Yves Saint Laurent','femme',2,'WP-006',5000,1000,1200,'{Mandarine,Lavande}','{Jasmin,Fleur d''oranger}','{Vanille,Musc}',true,false,'Floral lavandé.'),
('J''adore','dior-jadore','Dior','femme',2,'WP-007',5300,1050,860,'{Poire,Bergamote}','{Rose,Jasmin}','{Musc,Cèdre}',false,false,'Floral lumineux.'),
('Miss Dior','dior-miss-dior','Dior','femme',2,'WP-008',5100,1000,940,'{Mandarine}','{Rose de Grasse}','{Patchouli}',false,true,'Floral et poudré.'),
('Coco Mademoiselle','chanel-coco-mademoiselle','Chanel','femme',2,'WP-009',5500,1100,720,'{Orange,Bergamote}','{Rose,Jasmin}','{Patchouli,Vétiver}',true,false,'Oriental frais.'),
('Good Girl','ch-good-girl','Carolina Herrera','femme',2,'WP-010',4900,950,1070,'{Amande,Café}','{Tubéreuse}','{Cacao,Tonka}',false,false,'Sensuel et gourmand.'),
('Oud Wood','tom-ford-oud-wood','Tom Ford','unisex',3,'WP-011',9500,1900,500,'{Cardamome}','{Oud,Palissandre}','{Ambre,Vanille}',false,true,'Boisé et précieux.'),
('Baccarat Rouge 540','mfk-baccarat-rouge-540','Maison Francis Kurkdjian','unisex',3,'WP-012',12000,2400,390,'{Safran,Jasmin}','{Ambre gris}','{Cèdre,Résine}',true,false,'Ambré floral lumineux.'),
('Molecule 01','escentric-molecule-01','Escentric Molecules','unisex',3,'WP-013',7800,1600,620,'{Iso E Super}','{}','{}',false,false,'Minimaliste et boisé.'),
('Gypsy Water','byredo-gypsy-water','Byredo','unisex',3,'WP-014',8800,1800,480,'{Bergamote,Citron}','{Pin,Encens}','{Vanille,Santal}',false,false,'Frais, boisé et poudré.');
-- After creating your admin user in Supabase Auth:
-- insert into admins(user_id, full_name) values ('<auth-user-uuid>','Admin');
