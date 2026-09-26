'use client'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { sb } from '@/lib/supabase/client'
import { da, fmtLabel, STATUS } from '@/lib/format'
import { ORDER_ACTIONS, waLink } from '@/lib/admin'
import { StatusBadge, Card } from '@/components/admin/Widgets'

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [o, setO] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const c = sb()
    const [{ data: order }, { data: hist }] = await Promise.all([
      c.from('orders').select('*, customers(name,phone,email), order_items(*)').eq('id', id).maybeSingle(),
      c.from('order_status_history').select('*').eq('order_id', id).order('created_at', { ascending: true }),
    ])
    setO(order); setNotes(order?.notes || ''); setHistory(hist || [])
  }, [id])
  useEffect(() => { load() }, [load])

  async function setStatus(s: string) {
    if (['annulee', 'refusee'].includes(s) && !confirm('Confirmer cette action ?')) return
    setBusy(true); await sb().from('orders').update({ status: s }).eq('id', id); setBusy(false); load()
  }
  async function saveNotes() { setBusy(true); await sb().from('orders').update({ notes }).eq('id', id); setBusy(false); load() }
  async function del() { if (confirm('Supprimer définitivement cette commande ?')) { await sb().from('orders').delete().eq('id', id); router.push('/admin/orders') } }

  if (!o) return <p className="text-sm text-ivory/50">Chargement…</p>

  return (<div className="space-y-5 max-w-5xl">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><Link href="/admin/orders" className="text-xs text-ivory/50 underline">← Toutes les commandes</Link>
        <h1 className="h text-3xl mt-1">Commande #{o.order_number}</h1>
        <p className="text-xs text-ivory/50 mt-1">{new Date(o.created_at).toLocaleString('fr-FR')}</p></div>
      <StatusBadge status={o.status} />
    </div>

    <div className="flex flex-wrap gap-2">
      {ORDER_ACTIONS.map(([s, l]) => <button key={s} disabled={busy || o.status === s} onClick={() => setStatus(s)} className="btn text-xs disabled:opacity-30">{l.toUpperCase()}</button>)}
      <a href={`tel:${o.customers?.phone}`} className="btn text-xs">📞 Appeler</a>
      <a href={waLink(o.customers?.phone)} target="_blank" className="btn text-xs">💬 WhatsApp</a>
      <button onClick={del} className="btn text-xs border-red-500 text-red-400 hover:bg-red-500">Supprimer</button>
    </div>

    <div className="grid md:grid-cols-2 gap-4">
      <Card title="Client">
        <p>{o.customers?.name}</p>
        <p><a className="text-gold" href={`tel:${o.customers?.phone}`}>{o.customers?.phone}</a></p>
        {o.customers?.email && <p className="text-ivory/70">{o.customers.email}</p>}
      </Card>
      <Card title="Livraison">
        <p>{o.wilaya}, {o.commune}</p>
        <p className="text-ivory/70">{o.address}</p>
      </Card>
    </div>

    <Card title="Produits">
      <table className="w-full text-sm text-left">
        <thead className="text-xs uppercase tracking-widest text-ivory/50"><tr><th className="py-2">Produit</th><th>Format</th><th>Qté</th><th>PU</th><th className="text-right">Sous-total</th></tr></thead>
        <tbody>{o.order_items.map((i: any) => (<tr key={i.id} className="border-t border-ivory/10"><td className="py-2">{i.product_name}</td><td>{fmtLabel(i.format, i.size)}</td><td>{i.quantity}</td><td>{da(i.unit_price)}</td><td className="text-right">{da(i.subtotal)}</td></tr>))}</tbody>
      </table>
      <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
        <p className="flex justify-between"><span>Sous-total</span><span>{da(o.subtotal)}</span></p>
        {o.discount > 0 && <p className="flex justify-between text-gold"><span>Remise {o.coupon_code}</span><span>−{da(o.discount)}</span></p>}
        <p className="flex justify-between"><span>Livraison</span><span>{o.delivery_fee ? da(o.delivery_fee) : 'Offerte'}</span></p>
        <p className="flex justify-between h text-xl border-t border-ivory/15 pt-1"><span>Total</span><span>{da(o.total)}</span></p>
      </div>
    </Card>

    <Card title="Notes">
      <textarea className="input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes internes…" />
      <button onClick={saveNotes} className="btn text-xs mt-2">Enregistrer</button>
    </Card>

    <Card title="Historique du statut">
      <ol className="space-y-3">{history.map((h, i) => (<li key={h.id} className="flex items-center gap-3 text-sm">
        <span className="h-2.5 w-2.5 rounded-full bg-gold" /><span>{STATUS[h.status]}</span><span className="text-ivory/40 text-xs">{new Date(h.created_at).toLocaleString('fr-FR')}</span>
      </li>))}</ol>
    </Card>
  </div>)
}
