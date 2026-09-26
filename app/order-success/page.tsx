'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { da, fmtLabel } from '@/lib/format'
export default function Success() {
  const [o, setO] = useState<any>(null)
  useEffect(() => { try { setO(JSON.parse(sessionStorage.getItem('wp_last_order') || 'null')) } catch {} }, [])
  if (!o) return <p className="text-center py-32">Aucune commande récente. <Link className="underline" href="/track-order">Suivre une commande</Link></p>
  return (<div className="max-w-2xl mx-auto px-5 py-16 text-center"><h1 className="h text-4xl">Merci pour votre commande !</h1><p className="mt-2 text-ivory/70">Votre commande a bien été enregistrée.</p>
    <p className="h text-3xl text-gold mt-6">{o.number}</p><p className="text-xs uppercase tracking-widest mt-1">Statut : Nouvelle</p>
    <div className="text-left border border-ivory/15 p-6 mt-8 space-y-2 text-sm">{o.items.map((i:any) => <p key={i.productId + i.format} className="flex justify-between"><span>{i.name} — {fmtLabel(i.format, i.size)} × {i.qty}</span><span>{da(i.price*i.qty)}</span></p>)}
      <p className="flex justify-between border-t border-ivory/15 pt-2 h text-xl"><span>Total (livraison incluse)</span><span>{da(o.subtotal+o.delivery)}</span></p>
      <p className="text-ivory/60 pt-2">Livraison : {o.name}, {o.address}, {o.commune}, {o.wilaya}. Paiement à la livraison.</p></div>
    <Link href="/track-order" className="btn mt-8">Suivre ma commande</Link></div>)
}
