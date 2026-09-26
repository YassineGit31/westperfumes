-- WEST PERFUMES — Migration: link full-bottle stock and 10ml stock to ONE physical pool
-- Run this once in the Supabase SQL editor on an existing project.
--
-- Problem this fixes: full_stock and stock_10ml used to be two independent counters, so
-- buying either one never affected the other, even though they're the same bottle of perfume.
--
-- After this migration there is a single number, stock_ml (the total ml of that perfume you
-- actually have), and the two counters admins/customers see are always computed from it:
--   - full_stock  = how many complete full-size bottles fit in stock_ml
--   - stock_10ml  = how many 10ml portions fit in stock_ml
-- Selling one full bottle removes full_size_ml (e.g. 100) from stock_ml.
-- Selling one 10ml portion removes 10 from stock_ml.
-- Example: 20 x 10ml in stock = 200ml. Sell one 100ml bottle -> 100ml left -> shows as 10 x 10ml.
-- Example: 10 x 100ml bottles = 1000ml. Sell one 10ml portion -> 990ml -> shows as 9 bottles + 90ml left.

begin;

alter table products add column if not exists full_size_ml int not null default 100;
alter table products add column if not exists stock_ml int not null default 0;

-- 1) Work out each bottle's real volume in ml from its existing free-text label ('100ML' -> 100, '50 ml' -> 50).
update products set full_size_ml = greatest(1, coalesce(nullif(regexp_replace(coalesce(full_size,''), '\D', '', 'g'), '')::int, 100));

-- 2) Combine whatever the two old independent counters currently hold into one real physical pool.
--    (This is a one-time reconciliation — after this, the two counters are never set independently again.)
update products set stock_ml = coalesce(full_stock,0) * full_size_ml + coalesce(stock_10ml,0) * 10;

-- 3) Replace the old free-standing counters with generated columns that always derive from stock_ml,
--    so the two displayed stocks can never drift apart again.
alter table products drop column if exists full_stock;
alter table products drop column if exists stock_10ml;
alter table products add column full_stock int generated always as (floor(stock_ml::numeric / nullif(full_size_ml,0))::int) stored;
alter table products add column stock_10ml int generated always as (floor(stock_ml::numeric / 10)::int) stored;

-- 4) Keep full_size_ml in sync whenever the admin edits the free-text full_size label.
create or replace function sync_full_size_ml() returns trigger language plpgsql as $$
begin
  new.full_size_ml := greatest(1, coalesce(nullif(regexp_replace(coalesce(new.full_size,''), '\D', '', 'g'), '')::int, 100));
  return new;
end $$;
drop trigger if exists trg_products_full_size_ml on products;
create trigger trg_products_full_size_ml before insert or update of full_size on products for each row execute function sync_full_size_ml();

-- 5) Replace place_order() so a sale of either format debits the shared ml pool instead of an
--    independent per-format counter (same logic as in the up-to-date schema.sql).
create or replace function place_order(p_customer jsonb, p_items jsonb, p_address jsonb, p_coupon text default null)
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

commit;
