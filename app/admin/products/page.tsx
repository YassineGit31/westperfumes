'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { sb } from '@/lib/supabase/client'
import { da } from '@/lib/format'
import { EmptyState } from '@/components/admin/Widgets'

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [gender, setGender] = useState('')
  const [active, setActive] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await sb().from('products').select('*').order('created_at', { ascending: false })
    setProducts(data || []); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function toggleActive(p: any) { await sb().from('products').update({ is_active: !p.is_active }).eq('id', p.id); load() }
  async function duplicate(p: any) {
    const { id, created_at, ...rest } = p
    let slug = `${p.slug}-copie`, n = 1
    while (products.some(x => x.slug === slug)) slug = `${p.slug}-copie-${++n}`
    await sb().from('products').insert({ ...rest, slug, name: `${p.name} (copie)`, sku: p.sku ? `${p.sku}-COPY` : null, is_active: false })
    load()
  }
  async function del(p: any) { if (confirm(`Supprimer « ${p.name} » ?`)) { await sb().from('products').delete().eq('id', p.id); load() } }

  const rows = products.filter(p => (!gender || p.gender === gender) && (!active || (active === '1' ? p.is_active : !p.is_active)) && `${p.name} ${p.brand} ${p.sku || ''}`.toLowerCase().includes(q.toLowerCase()))

  return (<div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="h text-3xl">Produits</h1><Link href="/admin/products/new" className="btn btn-solid text-xs">+ Ajouter un produit</Link></div>
    <div className="grid md:grid-cols-4 gap-2">
      <input className="input md:col-span-2" placeholder="Rechercher nom, marque, SKU…" value={q} onChange={e => setQ(e.target.value)} />
      <select className="input bg-ink" value={gender} onChange={e => setGender(e.target.value)}><option value="">Tous genres</option><option value="homme">Homme</option><option value="femme">Femme</option><option value="unisex">Unisex</option></select>
      <select className="input bg-ink" value={active} onChange={e => setActive(e.target.value)}><option value="">Tous statuts</option><option value="1">Actif</option><option value="0">Inactif</option></select>
    </div>
    {loading ? <p className="text-sm text-ivory/50">Chargement…</p> : !rows.length ? <EmptyState text="Aucun produit." /> : (
      <div className="overflow-x-auto bg-coal border border-ivory/10"><table className="w-full text-sm text-left">
        <thead className="text-xs uppercase tracking-widest text-ivory/50"><tr>{['Produit', 'Genre', 'Full Size', '10ML', 'Statut', 'Actions'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead>
        <tbody>{rows.map(p => (<tr key={p.id} className="border-t border-ivory/10 hover:bg-ivory/5">
          <td className="p-3 flex items-center gap-3"><img src={p.images?.[0] || '/brand/dupe-monogram.png'} className="h-12 w-10 object-cover bg-ink" alt="" />
            <span><span className="block text-gold text-xs uppercase tracking-widest">{p.brand}</span>{p.name}<span className="block text-ivory/40 text-xs">{p.sku}</span></span></td>
          <td className="p-3 capitalize">{p.gender}</td>
          <td className="p-3">{p.full_enabled ? <>{da(p.full_price)}<br /><span className={`text-xs ${p.full_stock <= 5 ? 'text-amber-400' : 'text-ivory/50'}`}>Stock: {p.full_stock}</span></> : <span className="text-ivory/30">—</span>}</td>
          <td className="p-3">{p.sample_10ml ? <>{da(p.price_10ml || 0)}<br /><span className={`text-xs ${p.stock_10ml <= 5 ? 'text-amber-400' : 'text-ivory/50'}`}>Stock: {p.stock_10ml}</span></> : <span className="text-ivory/30">—</span>}</td>
          <td className="p-3"><button onClick={() => toggleActive(p)} className={`px-2 py-1 text-xs ${p.is_active ? 'bg-emerald-600' : 'bg-ivory/20'}`}>{p.is_active ? 'Actif' : 'Inactif'}</button></td>
          <td className="p-3 space-x-1 space-y-1">
            <Link href={`/admin/products/${p.id}`} className="border border-ivory/25 px-2 py-1 text-xs inline-block hover:border-gold">Modifier</Link>
            <button onClick={() => duplicate(p)} className="border border-ivory/25 px-2 py-1 text-xs">Dupliquer</button>
            <button onClick={() => del(p)} className="border border-red-500 text-red-400 px-2 py-1 text-xs">Suppr.</button>
          </td>
        </tr>))}</tbody>
      </table></div>
    )}
  </div>)
}
