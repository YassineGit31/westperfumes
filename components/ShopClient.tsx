'use client'
import { useMemo, useState } from 'react'
import ProductCard from './ProductCard'
import { options, type Product } from '@/lib/format'
export default function ShopClient({ products, title }:{ products:Product[]; title:string }) {
  const [q, setQ] = useState(''); const [sort, setSort] = useState('new'); const [max, setMax] = useState(0); const [inStock, setInStock] = useState(false)
  const minPrice = (p:Product) => Math.min(...options(p).map(o => o.price))
  const list = useMemo(() => {
    let l = products.filter(p => (p.name + p.brand).toLowerCase().includes(q.toLowerCase()) && (!max || minPrice(p) <= max) && (!inStock || options(p).some(o => o.stock > 0)))
    const s:Record<string,(a:Product,b:Product)=>number> = { new:(a,b)=>+new Date(b.created_at)-+new Date(a.created_at), asc:(a,b)=>minPrice(a)-minPrice(b), desc:(a,b)=>minPrice(b)-minPrice(a), best:(a,b)=>+b.is_best_seller-+a.is_best_seller, az:(a,b)=>a.name.localeCompare(b.name) }
    return [...l].sort(s[sort])
  }, [products, q, sort, max, inStock])
  return (<div className="max-w-7xl mx-auto px-5 py-12"><h1 className="h text-4xl">{title}</h1><p id="best" className="text-sm text-ivory/60 mt-1">{list.length} produits</p>
    <div className="grid md:grid-cols-4 gap-3 my-8">
      <input className="input" placeholder="Rechercher…" value={q} onChange={e=>setQ(e.target.value)}/>
      <select className="input bg-ink" value={max} onChange={e=>setMax(+e.target.value)}><option value={0}>Tous les prix</option><option value={1000}>≤ 1 000 DA</option><option value={5000}>≤ 5 000 DA</option><option value={10000}>≤ 10 000 DA</option></select>
      <select className="input bg-ink" value={sort} onChange={e=>setSort(e.target.value)}><option value="new">Nouveautés</option><option value="asc">Prix croissant</option><option value="desc">Prix décroissant</option><option value="best">Meilleures ventes</option><option value="az">Alphabétique</option></select>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={inStock} onChange={e=>setInStock(e.target.checked)}/> En stock uniquement</label></div>
    {list.length ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">{list.map(p => <ProductCard key={p.id} p={p}/>)}</div> : <p className="py-20 text-center text-ivory/60">Aucun parfum ne correspond à votre recherche.</p>}</div>)
}
