'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { sb } from '@/lib/supabase/client'
import { useCart } from '@/lib/cart'
import { useWilaya } from '@/lib/wilaya'
import { da, fmtLabel } from '@/lib/format'

export default function Checkout() {
  const { items, subtotal, clear } = useCart(); const router = useRouter()
  const { wilaya, setWilaya, wilayas, fee, isServed, loading:feeLoading } = useWilaya()
  const [f, setF] = useState({ name:'', phone:'', email:'', wilaya, commune:'', address:'', notes:'', coupon:'' })
  const [free, setFree] = useState(0); const [busy, setBusy] = useState(false); const [err, setErr] = useState('')

  useEffect(() => { sb().from('settings').select('*').eq('key', 'free_delivery_threshold').maybeSingle().then(({ data }) => { if (data) setFree(+data.value) }) }, [])
  useEffect(() => { if (wilaya && !f.wilaya) setF(prev => ({ ...prev, wilaya })) }, [wilaya]) // eslint-disable-line react-hooks/exhaustive-deps
  // Frais de livraison affiché : résolu par wilaya (identique pour tous les produits),
  // avec livraison offerte au-delà du seuil. Indicatif uniquement — place_order()
  // recalcule et fixe le montant définitif côté serveur.
  const rawFee = fee ?? 0
  const delivery = free > 0 && subtotal >= free ? 0 : rawFee
  const set = (k:string) => (e:any) => setF({ ...f, [k]:e.target.value })

  async function submit(e:React.FormEvent) {
    e.preventDefault(); setErr('')
    if (!/^(0)(5|6|7)\d{8}$/.test(f.phone.replace(/\s/g, ''))) return setErr('Numéro de téléphone invalide (ex : 0550123456).')
    if (!f.wilaya) return setErr('Veuillez choisir votre wilaya.')
    if (!isServed) return setErr("La livraison n'est pas disponible pour cette wilaya.")
    setBusy(true)
    const { data, error } = await sb().rpc('place_order', { p_customer:{ name:f.name, phone:f.phone.replace(/\s/g, ''), email:f.email }, p_address:{ wilaya:f.wilaya, commune:f.commune, address:f.address, notes:f.notes },
      p_items:items.map(i => ({ product_id:i.productId, format:i.format, quantity:i.qty })), p_coupon:f.coupon || null })
    setBusy(false)
    if (error) {
      if (error.message.includes('OUT_OF_STOCK')) return setErr('Un article n\'est plus disponible en quantité suffisante.')
      if (error.message.includes('WILAYA_NOT_SERVED')) return setErr("La livraison n'est pas disponible pour cette wilaya.")
      if (error.message.includes('INVALID_WILAYA')) return setErr('Wilaya invalide, veuillez la sélectionner dans la liste.')
      if (error.message.includes('INVALID_PHONE')) return setErr('Numéro de téléphone invalide.')
      return setErr('Erreur lors de la commande. Veuillez réessayer.')
    }
    const o = data[0]; sessionStorage.setItem('wp_last_order', JSON.stringify({ number:o.order_number, phone:f.phone, items, subtotal, delivery, name:f.name, wilaya:f.wilaya, commune:f.commune, address:f.address }))
    clear(); router.push('/order-success')
  }
  if (!items.length) return <p className="text-center py-32">Votre panier est vide.</p>
  return (<form onSubmit={submit} className="max-w-6xl mx-auto px-5 py-12 grid md:grid-cols-5 gap-10"><div className="md:col-span-3 space-y-4"><h1 className="h text-4xl mb-4">Commande</h1>
    <input required className="input" placeholder="Nom et prénom" value={f.name} onChange={set('name')}/><input required className="input" inputMode="tel" placeholder="Numéro de téléphone" value={f.phone} onChange={set('phone')}/>
    <select required className="input bg-ink" value={f.wilaya} onChange={e => { setF({ ...f, wilaya:e.target.value }); setWilaya(e.target.value) }}>
      <option value="">Wilaya</option>{wilayas.map(w => <option key={w.id} value={w.name}>{w.code} - {w.name}</option>)}</select>
    {f.wilaya && !feeLoading && !isServed && <p className="text-xs text-red-400 -mt-2">La livraison n'est pas disponible pour cette wilaya.</p>}
    <input required className="input" placeholder="Commune" value={f.commune} onChange={set('commune')}/><input required className="input" placeholder="Adresse" value={f.address} onChange={set('address')}/>
    <textarea className="input" placeholder="Notes de livraison" value={f.notes} onChange={set('notes')}/><input className="input" type="email" placeholder="Email (optionnel)" value={f.email} onChange={set('email')}/><input className="input uppercase" placeholder="Code promo" value={f.coupon} onChange={set('coupon')}/>
    <p className="border border-gold p-4 text-sm">● Paiement à la livraison</p></div>
    <aside className="md:col-span-2 border border-ivory/15 p-6 h-fit space-y-3 text-sm"><h2 className="h text-2xl">Résumé</h2>
      {items.map(i => <p key={i.productId + i.format} className="flex justify-between gap-3"><span>{i.name}<br/><span className="text-ivory/60">{fmtLabel(i.format, i.size)} × {i.qty}</span></span><span>{da(i.price*i.qty)}</span></p>)}
      <p className="flex justify-between border-t border-ivory/15 pt-3"><span>Sous-total</span><span>{da(subtotal)}</span></p>
      <p className="flex justify-between"><span>Livraison</span><span>{!f.wilaya ? '—' : delivery ? da(delivery) : 'Offerte'}</span></p>
      <p className="flex justify-between h text-2xl"><span>Total</span><span>{da(subtotal+delivery)}</span></p><p className="text-xs text-ivory/50">Le code promo est appliqué à la confirmation.</p>
      {err && <p className="text-red-400">{err}</p>}<button disabled={busy} className="btn btn-solid w-full">{busy ? 'Envoi…' : 'Confirmer ma commande'}</button></aside></form>)
}
