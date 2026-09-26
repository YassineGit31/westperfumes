'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { sb } from '@/lib/supabase/client'
import { da } from '@/lib/format'
import { EmptyState } from '@/components/admin/Widgets'

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const c = sb()
      const [{ data: cu }, { data: o }] = await Promise.all([c.from('customers').select('*').order('created_at', { ascending: false }), c.from('orders').select('customer_id,total,status,created_at')])
      setCustomers(cu || []); setOrders(o || []); setLoading(false)
    })()
  }, [])

  const rows = useMemo(() => customers.map(c => {
    const os = orders.filter(o => o.customer_id === c.id && !['annulee', 'refusee'].includes(o.status))
    const last = orders.filter(o => o.customer_id === c.id).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0]
    return { ...c, orderCount: os.length, total: os.reduce((s, o) => s + o.total, 0), last: last?.created_at }
  }).filter(c => `${c.name} ${c.phone} ${c.wilaya || ''}`.toLowerCase().includes(q.toLowerCase())), [customers, orders, q])

  return (<div className="space-y-5">
    <h1 className="h text-3xl">Clients</h1>
    <input className="input max-w-sm" placeholder="Rechercher nom, téléphone, wilaya…" value={q} onChange={e => setQ(e.target.value)} />
    {loading ? <p className="text-sm text-ivory/50">Chargement…</p> : !rows.length ? <EmptyState text="Aucun client." /> : (
      <div className="overflow-x-auto bg-coal border border-ivory/10"><table className="w-full text-sm text-left">
        <thead className="text-xs uppercase tracking-widest text-ivory/50"><tr>{['Client', 'Téléphone', 'Wilaya', 'Commandes', 'Total dépensé', 'Dernière commande', ''].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead>
        <tbody>{rows.map(c => (<tr key={c.id} className="border-t border-ivory/10 hover:bg-ivory/5">
          <td className="p-3">{c.name}</td><td className="p-3"><a className="text-gold" href={`tel:${c.phone}`}>{c.phone}</a></td><td className="p-3">{c.wilaya}</td>
          <td className="p-3">{c.orderCount}</td><td className="p-3">{da(c.total)}</td><td className="p-3">{c.last ? new Date(c.last).toLocaleDateString('fr-FR') : '—'}</td>
          <td className="p-3"><Link href={`/admin/customers/${c.id}`} className="underline text-xs">Voir le profil</Link></td>
        </tr>))}</tbody>
      </table></div>
    )}
  </div>)
}
