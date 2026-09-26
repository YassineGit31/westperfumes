'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { sb } from '@/lib/supabase/client'
import { da, STATUS } from '@/lib/format'
import { STATUS_COLOR, lastNDays, startOfDay, startOfWeek, startOfMonth } from '@/lib/admin'
import { StatCard, Card, StatusBadge, EmptyState } from '@/components/admin/Widgets'

export default function Dashboard() {
  const [orders, setOrders] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [customerCount, setCustomerCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const c = sb()
      const [o, p, cu] = await Promise.all([
        c.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }),
        c.from('products').select('id,name,brand,full_stock,stock_10ml,is_active,sku'),
        c.from('customers').select('id', { count: 'exact', head: true }),
      ])
      setOrders(o.data || []); setProducts(p.data || []); setCustomerCount((cu as any).count || 0)
      setLoading(false)
    })()
  }, [])

  const valid = useMemo(() => orders.filter(o => !['annulee', 'refusee'].includes(o.status)), [orders])
  const sumSince = (d: Date) => valid.filter(o => new Date(o.created_at) >= d).reduce((s, o) => s + o.total, 0)
  const revenue = { today: sumSince(startOfDay()), week: sumSince(startOfWeek()), month: sumSince(startOfMonth()), total: valid.reduce((s, o) => s + o.total, 0) }
  const pending = orders.filter(o => ['nouvelle', 'a_confirmer'].includes(o.status)).length
  const unitsSold = valid.reduce((s, o) => s + o.order_items.reduce((x: number, i: any) => x + i.quantity, 0), 0)

  const days = lastNDays(14)
  const dayTotals = days.map(d => valid.filter(o => { const t = new Date(o.created_at); return t >= d && t.getTime() < d.getTime() + 86400000 }).reduce((s, o) => s + o.total, 0))
  const dayCounts = days.map(d => orders.filter(o => { const t = new Date(o.created_at); return t >= d && t.getTime() < d.getTime() + 86400000 }).length)
  const maxRev = Math.max(1, ...dayTotals)
  const maxCnt = Math.max(1, ...dayCounts)

  const bestSellers = useMemo(() => {
    const map = new Map<string, { name: string; units: number; revenue: number }>()
    valid.forEach(o => o.order_items.forEach((i: any) => {
      const cur = map.get(i.product_name) || { name: i.product_name, units: 0, revenue: 0 }
      cur.units += i.quantity; cur.revenue += i.subtotal; map.set(i.product_name, cur)
    }))
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6)
  }, [valid])

  const lowStock = products.filter(p => p.is_active && (p.full_stock <= 5 || p.stock_10ml <= 5))
  const statusDist = Object.keys(STATUS).map(k => ({ k, n: orders.filter(o => o.status === k).length }))
  const maxStatus = Math.max(1, ...statusDist.map(s => s.n))

  if (loading) return <p className="text-ivory/50 text-sm">Chargement du tableau de bord…</p>

  return (<div className="space-y-6">
    <div className="flex items-center justify-between"><h1 className="h text-3xl">Dashboard</h1><Link href="/admin/orders" className="btn text-xs">Voir les commandes</Link></div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard label="CA aujourd'hui" value={da(revenue.today)} />
      <StatCard label="CA cette semaine" value={da(revenue.week)} />
      <StatCard label="CA ce mois" value={da(revenue.month)} />
      <StatCard label="CA total" value={da(revenue.total)} />
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <StatCard label="Commandes" value={orders.length} />
      <StatCard label="En attente" value={pending} sub="à confirmer" />
      <StatCard label="Produits vendus" value={unitsSold} />
      <StatCard label="Clients" value={customerCount} />
      <StatCard label="Produits actifs" value={products.filter(p => p.is_active).length} />
    </div>

    <div className="grid lg:grid-cols-2 gap-4">
      <Card title="Chiffre d'affaires — 14 derniers jours">
        <div className="flex items-end gap-1.5 h-40">
          {dayTotals.map((v, i) => (<div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
            <div className="w-full bg-gold/70 hover:bg-gold transition" style={{ height: `${(v / maxRev) * 100}%`, minHeight: v ? 3 : 0 }} />
            <span className="absolute -top-6 text-[10px] opacity-0 group-hover:opacity-100 whitespace-nowrap bg-ink border border-ivory/20 px-1.5 py-0.5">{da(v)}</span>
          </div>))}
        </div>
        <div className="flex justify-between text-[10px] text-ivory/40 mt-2"><span>{days[0].toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</span><span>{days[days.length - 1].toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</span></div>
      </Card>
      <Card title="Commandes — 14 derniers jours">
        <div className="flex items-end gap-1.5 h-40">
          {dayCounts.map((v, i) => (<div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
            <div className="w-full bg-ivory/60 hover:bg-ivory transition" style={{ height: `${(v / maxCnt) * 100}%`, minHeight: v ? 3 : 0 }} />
            <span className="absolute -top-6 text-[10px] opacity-0 group-hover:opacity-100 bg-ink border border-ivory/20 px-1.5 py-0.5">{v}</span>
          </div>))}
        </div>
        <div className="flex justify-between text-[10px] text-ivory/40 mt-2"><span>{days[0].toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</span><span>{days[days.length - 1].toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</span></div>
      </Card>
    </div>

    <div className="grid lg:grid-cols-3 gap-4">
      <Card title="Meilleures ventes">
        {!bestSellers.length ? <EmptyState text="Aucune vente pour le moment." /> : <ul className="space-y-3 text-sm">
          {bestSellers.map(b => (<li key={b.name} className="flex justify-between"><span>{b.name}<span className="block text-xs text-ivory/40">{b.units} vendus</span></span><span className="text-gold">{da(b.revenue)}</span></li>))}
        </ul>}
      </Card>
      <Card title="Répartition des statuts">
        <ul className="space-y-2">{statusDist.filter(s => s.n > 0).map(s => (<li key={s.k} className="flex items-center gap-2 text-xs">
          <span className="w-24 truncate">{STATUS[s.k]}</span>
          <span className="flex-1 bg-ivory/10 h-2"><span className={`block h-2 ${STATUS_COLOR[s.k]}`} style={{ width: `${(s.n / maxStatus) * 100}%` }} /></span>
          <span className="w-6 text-right text-ivory/60">{s.n}</span></li>))}
          {!statusDist.some(s => s.n > 0) && <EmptyState text="Aucune commande." />}
        </ul>
      </Card>
      <Card title="Stock faible" action={<Link href="/admin/stock" className="text-xs underline text-ivory/60">Gérer</Link>}>
        {!lowStock.length ? <EmptyState text="Tous les stocks sont sains." /> : <ul className="space-y-2 text-sm">
          {lowStock.slice(0, 6).map(p => (<li key={p.id} className="flex justify-between"><span>{p.name}</span>
            <span className="text-amber-400 text-xs">{p.full_stock <= 5 ? `Full: ${p.full_stock}` : ''} {p.stock_10ml <= 5 ? `10ML: ${p.stock_10ml}` : ''}</span></li>))}
        </ul>}
      </Card>
    </div>

    <Card title="Commandes récentes" action={<Link href="/admin/orders" className="text-xs underline text-ivory/60">Tout voir</Link>}>
      {!orders.length ? <EmptyState text="Aucune commande." /> : <div className="overflow-x-auto"><table className="w-full text-sm text-left">
        <thead className="text-xs uppercase tracking-widest text-ivory/50"><tr>{['Commande', 'Wilaya', 'Total', 'Statut', ''].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead>
        <tbody>{orders.slice(0, 8).map(o => (<tr key={o.id} className="border-t border-ivory/10">
          <td className="p-2">{o.order_number}<br /><span className="text-ivory/40 text-xs">{new Date(o.created_at).toLocaleDateString('fr-FR')}</span></td>
          <td className="p-2">{o.wilaya}</td><td className="p-2">{da(o.total)}</td><td className="p-2"><StatusBadge status={o.status} /></td>
          <td className="p-2"><Link href={`/admin/orders/${o.id}`} className="underline text-xs">Ouvrir</Link></td>
        </tr>))}</tbody></table></div>}
    </Card>
  </div>)
}
