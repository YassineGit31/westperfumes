'use client'
import { useCallback, useEffect, useState } from 'react'
import { sb } from '@/lib/supabase/client'
import { EmptyState } from '@/components/admin/Widgets'

const empty = { code: '', discount_type: 'percent', value: 10, starts_at: '', ends_at: '', min_order: 0, max_uses: '', is_active: true }

export default function Promotions() {
  const [rows, setRows] = useState<any[]>([])
  const [f, setF] = useState<any>(empty)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => { const { data } = await sb().from('coupons').select('*').order('id', { ascending: false }); setRows(data || []) }, [])
  useEffect(() => { load() }, [load])

  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('')
    const { error } = await sb().from('coupons').insert({
      code: f.code.toUpperCase(), discount_type: f.discount_type, value: +f.value, min_order: +f.min_order || 0,
      max_uses: f.max_uses ? +f.max_uses : null, starts_at: f.starts_at || null, ends_at: f.ends_at || null, is_active: f.is_active,
    })
    setBusy(false)
    if (error) return setErr('Ce code existe déjà.')
    setF(empty); load()
  }
  async function toggle(c: any) { await sb().from('coupons').update({ is_active: !c.is_active }).eq('id', c.id); load() }
  async function del(id: number) { if (confirm('Supprimer ce code promo ?')) { await sb().from('coupons').delete().eq('id', id); load() } }

  return (<div className="space-y-5 max-w-4xl">
    <h1 className="h text-3xl">Promotions</h1>
    <form onSubmit={add} className="bg-coal border border-ivory/10 p-5 grid md:grid-cols-3 gap-2">
      <input required className="input uppercase" placeholder="Code (ex: WEST10)" value={f.code} onChange={e => setF({ ...f, code: e.target.value })} />
      <select className="input bg-ink" value={f.discount_type} onChange={e => setF({ ...f, discount_type: e.target.value })}><option value="percent">Pourcentage (%)</option><option value="fixed">Montant fixe (DA)</option></select>
      <input required type="number" min={0} className="input" placeholder="Valeur" value={f.value} onChange={e => setF({ ...f, value: e.target.value })} />
      <label className="text-xs text-ivory/50 flex flex-col gap-1">Début<input type="date" className="input" value={f.starts_at} onChange={e => setF({ ...f, starts_at: e.target.value })} /></label>
      <label className="text-xs text-ivory/50 flex flex-col gap-1">Fin<input type="date" className="input" value={f.ends_at} onChange={e => setF({ ...f, ends_at: e.target.value })} /></label>
      <input type="number" min={0} className="input" placeholder="Commande minimum (DA)" value={f.min_order} onChange={e => setF({ ...f, min_order: e.target.value })} />
      <input type="number" min={0} className="input" placeholder="Utilisations max (optionnel)" value={f.max_uses} onChange={e => setF({ ...f, max_uses: e.target.value })} />
      <button disabled={busy} className="btn btn-solid md:col-span-1">{busy ? 'Création…' : 'Créer le code'}</button>
      {err && <p className="text-red-400 text-xs md:col-span-3">{err}</p>}
    </form>
    {!rows.length ? <EmptyState text="Aucun code promo." /> : (
      <div className="overflow-x-auto bg-coal border border-ivory/10"><table className="w-full text-sm text-left">
        <thead className="text-xs uppercase tracking-widest text-ivory/50"><tr>{['Code', 'Réduction', 'Commande min.', 'Période', 'Utilisations', 'Statut', ''].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead>
        <tbody>{rows.map(c => (<tr key={c.id} className="border-t border-ivory/10">
          <td className="p-3 text-gold">{c.code}</td>
          <td className="p-3">{c.discount_type === 'percent' ? `${c.value}%` : `${c.value} DA`}</td>
          <td className="p-3">{c.min_order || 0} DA</td>
          <td className="p-3 text-xs">{c.starts_at ? new Date(c.starts_at).toLocaleDateString('fr-FR') : '—'} → {c.ends_at ? new Date(c.ends_at).toLocaleDateString('fr-FR') : '—'}</td>
          <td className="p-3">{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ''}</td>
          <td className="p-3"><button onClick={() => toggle(c)} className={`px-2 py-1 text-xs ${c.is_active ? 'bg-emerald-600' : 'bg-ivory/20'}`}>{c.is_active ? 'Actif' : 'Inactif'}</button></td>
          <td className="p-3"><button onClick={() => del(c.id)} className="text-red-400 text-xs underline">Supprimer</button></td>
        </tr>))}</tbody>
      </table></div>
    )}
  </div>)
}
