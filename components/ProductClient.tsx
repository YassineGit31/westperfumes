'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/cart'
import { useWilaya } from '@/lib/wilaya'
import { options, da, type Product, type Fmt } from '@/lib/format'
export default function ProductClient({ p }:{ p:Product }) {
  const opts = options(p); const first = opts.find(o => o.stock > 0)?.format ?? opts[0]?.format
  const [fmt, setFmt] = useState<Fmt|undefined>(first); const [qty, setQty] = useState(1)
  const { add } = useCart(); const router = useRouter()
  const { wilaya, fee, isServed } = useWilaya()
  const cur = opts.find(o => o.format === fmt)
  const item = () => ({ productId:p.id, slug:p.slug, name:p.name, brand:p.brand, image:p.images?.[0] ?? null, format:cur!.format, size:cur!.size, price:cur!.price })
  return (<div className="max-w-7xl mx-auto px-5 py-12 grid md:grid-cols-2 gap-12">
    <div className="bg-coal aspect-square flex items-center justify-center overflow-hidden group"><img src={p.images?.[0] || '/brand/wp-monogram.png'} alt={p.name} className={`transition duration-700 group-hover:scale-105 ${p.images?.[0] ? 'w-full h-full object-cover' : 'w-1/3 opacity-60'}`}/></div>
    <div><p className="text-xs uppercase tracking-[.25em] text-gold">{p.brand}</p><h1 className="h text-5xl mt-2 uppercase">{p.name}</h1>
      <p className="mt-8 text-xs uppercase tracking-[.25em]">Format</p>
      <div className="grid sm:grid-cols-2 gap-3 mt-3">{opts.map(o => <button key={o.format} disabled={o.stock<=0} onClick={()=>{setFmt(o.format);setQty(1)}} className={`text-left p-4 border transition disabled:opacity-40 ${fmt===o.format ? 'border-gold bg-ivory/5' : 'border-ivory/20 hover:border-ivory/40'}`}>
        <p className="text-xs uppercase tracking-widest">{o.label}</p>{o.format==='full' && <p className="text-sm text-ivory/60">{o.size}</p>}
        <p className="h text-2xl mt-2">{da(o.price)}</p>
        {o.stock<=0 && <p className="text-xs text-red-400">Rupture de stock</p>}</button>)}</div>
      {cur && <p className="mt-4 text-sm">{cur.stock<=0 ? 'Indisponible' : cur.stock<=5 ? `Plus que ${cur.stock} en stock` : 'En stock'} — <b>{cur.label}</b></p>}
      <p className="mt-8 text-xs uppercase tracking-[.25em]">Quantité</p>
      <div className="inline-flex items-center border border-ivory/25 mt-3"><button className="px-4 py-2" onClick={()=>setQty(Math.max(1,qty-1))}>−</button><span className="px-4">{qty}</span><button className="px-4 py-2" onClick={()=>setQty(Math.min(cur?.stock||1,qty+1))}>+</button></div>
      <div className="mt-6 grid sm:grid-cols-2 gap-3"><button disabled={!cur||cur.stock<=0} className="btn" onClick={()=>add(item(),qty)}>Ajouter au panier</button>
        <button disabled={!cur||cur.stock<=0} className="btn btn-solid" onClick={()=>{add(item(),qty);router.push('/checkout')}}>Acheter maintenant</button></div>
      {wilaya && <p className="mt-3 text-xs text-ivory/50">{isServed ? (fee != null && <>Livraison vers <span className="text-gold">{wilaya}</span> : {da(fee)}</>) : <span className="text-red-400">Livraison indisponible vers {wilaya}</span>}</p>}
      <div className="mt-10 space-y-6 text-sm text-ivory/80"><p>{p.description}</p>
        <div><p className="text-xs uppercase tracking-[.25em] text-gold mb-3">Notes olfactives</p><div className="grid grid-cols-3 gap-3">{[['Tête',p.top_notes],['Cœur',p.heart_notes],['Fond',p.base_notes]].map(([t,n]) => <div key={t as string} className="border border-ivory/15 p-3"><p className="text-xs uppercase tracking-widest mb-1">{t as string}</p><p>{(n as string[]).join(', ') || '—'}</p></div>)}</div></div>
        <p className="border-t border-ivory/15 pt-6">Livraison partout en Algérie · Paiement à la livraison disponible · Délai estimé : 2 à 5 jours ouvrés.</p></div></div></div>)
}
