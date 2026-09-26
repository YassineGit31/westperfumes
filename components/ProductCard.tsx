'use client'
import Link from 'next/link'
import { options, da, type Product } from '@/lib/format'
import { useFavorites } from '@/lib/favorites'
export default function ProductCard({ p }:{ p:Product }) {
  const { has, toggle } = useFavorites()
  return (<div className="group block relative transition-transform duration-500 hover:-translate-y-1">
    <button aria-label="Favori" onClick={(e)=>{e.preventDefault();toggle(p.id)}} className="absolute top-3 right-3 z-10 h-8 w-8 flex items-center justify-center bg-ink/70 text-lg backdrop-blur-sm transition group-hover:bg-ink/90">
      {has(p.id) ? <span className="text-gold">♥</span> : <span className="text-ivory/70">♡</span>}</button>
    <Link href={`/product/${p.slug}`}>
    <div className="aspect-[4/5] bg-coal flex items-center justify-center overflow-hidden relative transition-shadow duration-500 group-hover:shadow-[0_20px_50px_-15px_rgba(200,169,107,0.35)]">
      <img loading="lazy" src={p.images?.[0] || '/brand/wp-monogram.png'} alt={p.name} className={`transition duration-700 ease-out group-hover:scale-110 ${p.images?.[0] ? 'w-full h-full object-cover' : 'w-1/2 opacity-60'}`}/>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      {p.is_new && <span className="absolute top-3 left-3 text-[10px] uppercase tracking-widest bg-ivory text-ink px-2 py-1">Nouveau</span>}</div>
    <p className="mt-4 text-[11px] uppercase tracking-[.2em] text-gold">{p.brand}</p>
    <h3 className="h text-xl transition-colors group-hover:text-gold">{p.name}</h3>
    <div className="mt-2 text-sm space-y-0.5">{options(p).map(o => <p key={o.format} className="flex justify-between text-ivory/80">
        <span>{o.label === 'Full Size' ? `Full Size — ${o.size}` : '10ML'}</span>
        <span>{da(o.price)}</span>
      </p>)}</div>
    <span className="btn mt-4 w-full transition group-hover:border-gold group-hover:text-gold">Voir le parfum</span></Link></div>)
}

