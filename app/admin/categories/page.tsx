'use client'
import { useCallback, useEffect, useState } from 'react'
import { sb } from '@/lib/supabase/client'
import { EmptyState } from '@/components/admin/Widgets'

const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export default function Categories() {
  const [rows, setRows] = useState<any[]>([])
  const [f, setF] = useState({ name: '', slug: '', gender: 'homme' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => { const { data } = await sb().from('categories').select('*').order('name'); setRows(data || []) }, [])
  useEffect(() => { load() }, [load])

  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    await sb().from('categories').insert({ name: f.name, slug: f.slug || slugify(f.name), gender: f.gender })
    setF({ name: '', slug: '', gender: 'homme' }); setBusy(false); load()
  }
  async function del(id: number) { if (confirm('Supprimer cette catégorie ?')) { await sb().from('categories').delete().eq('id', id); load() } }

  return (<div className="space-y-5 max-w-3xl">
    <h1 className="h text-3xl">Catégories</h1>
    <form onSubmit={add} className="bg-coal border border-ivory/10 p-5 grid md:grid-cols-4 gap-2">
      <input required className="input" placeholder="Nom" value={f.name} onChange={e => setF({ ...f, name: e.target.value, slug: slugify(e.target.value) })} />
      <input className="input" placeholder="Slug" value={f.slug} onChange={e => setF({ ...f, slug: e.target.value })} />
      <select className="input bg-ink" value={f.gender} onChange={e => setF({ ...f, gender: e.target.value })}><option value="homme">Homme</option><option value="femme">Femme</option><option value="unisex">Unisex</option></select>
      <button disabled={busy} className="btn btn-solid">Ajouter</button>
    </form>
    {!rows.length ? <EmptyState text="Aucune catégorie." /> : (
      <div className="bg-coal border border-ivory/10 divide-y divide-ivory/10">{rows.map(c => (
        <div key={c.id} className="flex items-center justify-between p-4 text-sm"><span>{c.name}<span className="text-ivory/40 ml-2 text-xs">/{c.slug} · {c.gender}</span></span>
          <button onClick={() => del(c.id)} className="text-red-400 text-xs underline">Supprimer</button></div>
      ))}</div>
    )}
  </div>)
}
