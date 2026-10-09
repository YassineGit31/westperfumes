'use client'
import Link from 'next/link'
import { useCart } from '@/lib/cart'
import { useWilaya } from '@/lib/wilaya'
import WilayaSelector from '@/components/WilayaSelector'
import { da, fmtLabel } from '@/lib/format'
export default function Cart() {
  const { items, subtotal, setQty, remove } = useCart()
  const { wilaya, fee, isServed } = useWilaya()
  if (!items.length) return <div className="text-center py-32"><h1 className="h text-4xl">Votre panier est vide</h1><Link href="/shop" className="btn mt-8">Continuer vos achats</Link></div>
  return (<div className="max-w-5xl mx-auto px-5 py-12"><div className="flex flex-wrap items-center justify-between gap-3 mb-8"><h1 className="h text-4xl">Panier</h1><WilayaSelector/></div>
    {!wilaya && <p className="mb-6 text-xs text-ivory/50 border border-ivory/15 p-3">Choisissez votre wilaya pour voir le frais de livraison estimé. Le prix des produits reste le même partout en Algérie.</p>}
    {wilaya && !isServed && <p className="mb-6 text-xs text-red-400 border border-red-400/40 p-3">La livraison n'est pas disponible pour {wilaya} actuellement.</p>}
    {items.map(i => <div key={i.productId + i.format} className="flex gap-4 py-5 border-b border-ivory/10">
      <img src={i.image || '/brand/dupe-monogram.png'} className="w-20 h-24 object-cover bg-coal" alt=""/>
      <div className="flex-1"><p className="text-[11px] uppercase tracking-widest text-gold">{i.brand}</p><p className="h text-xl">{i.name}</p><p className="text-sm text-ivory/70">{fmtLabel(i.format, i.size)}</p><p className="text-sm">{da(i.price)}</p>
        <div className="mt-2 flex items-center gap-4 text-sm"><span className="border border-ivory/25"><button className="px-3 py-1" onClick={()=>setQty(i.productId,i.format,i.qty-1)}>−</button>{i.qty}<button className="px-3 py-1" onClick={()=>setQty(i.productId,i.format,i.qty+1)}>+</button></span>
          <button className="underline text-ivory/60" onClick={()=>remove(i.productId,i.format)}>Retirer</button></div></div>
      <p className="h text-xl">{da(i.price*i.qty)}</p></div>)}
    <div className="mt-8 ml-auto max-w-sm space-y-2 text-sm"><p className="flex justify-between"><span>Sous-total</span><span>{da(subtotal)}</span></p>
      <p className="flex justify-between text-ivory/60"><span>Livraison</span><span>{wilaya && fee != null ? (isServed ? da(fee) : 'Non disponible') : 'Choisissez une wilaya'}</span></p>
      <Link href="/checkout" className="btn btn-solid w-full mt-4">Passer la commande</Link><Link href="/shop" className="btn w-full">Continuer vos achats</Link></div></div>)
}
