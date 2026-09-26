'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { sb } from '@/lib/supabase/client'
import { da } from '@/lib/format'
import { Card, EmptyState } from '@/components/admin/Widgets'

interface Wilaya { id: number; code: number; name: string }
interface FeeRow { fee: string; served: boolean }

export default function DeliveryByWilaya() {
  const [wilayas, setWilayas] = useState<Wilaya[]>([])
  const [rows, setRows] = useState<Record<number, FeeRow>>({})
  const [original, setOriginal] = useState<Record<number, FeeRow>>({})
  const [defaultFee, setDefaultFee] = useState(600)
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkFee, setBulkFee] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [w, f, s] = await Promise.all([
      sb().from('wilayas').select('id,code,name').order('code'),
      sb().from('wilaya_delivery_fees').select('wilaya_id,fee,is_served'),
      sb().from('settings').select('value').eq('key', 'delivery_fee').maybeSingle(),
    ])
    setWilayas(w.data || [])
    if (s.data) setDefaultFee(+s.data.value)
    const next: Record<number, FeeRow> = {}
    ;(f.data || []).forEach((r: any) => { next[r.wilaya_id] = { fee: String(r.fee), served: r.is_served } })
    setRows(next); setOriginal(JSON.parse(JSON.stringify(next))); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => wilayas.filter(w => w.name.toLowerCase().includes(q.toLowerCase()) || String(w.code).includes(q)), [wilayas, q])
  const overrideCount = Object.values(rows).filter(r => r.fee !== '').length

  function setFee(id: number, value: string) { setRows(r => ({ ...r, [id]: { fee: value, served: r[id]?.served ?? true } })) }
  function setServed(id: number, served: boolean) { setRows(r => ({ ...r, [id]: { fee: r[id]?.fee ?? '', served } })) }
  function resetRow(id: number) { setRows(r => ({ ...r, [id]: { fee: '', served: true } })) }
  function toggleSelect(id: number) { setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  function applyBulk() {
    if (!selected.size) return setMsg('Sélectionnez au moins une wilaya avant d\u2019appliquer un tarif groupé.')
    if (bulkFee === '') return setMsg('Indiquez un tarif à appliquer.')
    setRows(r => { const n = { ...r }; selected.forEach(id => { n[id] = { fee: bulkFee, served: n[id]?.served ?? true } }); return n }); setMsg('')
  }

  async function save() {
    setSaving(true); setMsg('')
    const upserts: { wilaya_id: number; fee: number; is_served: boolean }[] = []
    const deletes: number[] = []
    wilayas.forEach(w => {
      const cur = rows[w.id] || { fee: '', served: true }
      const orig = original[w.id] || { fee: '', served: true }
      if (cur.fee !== '') upserts.push({ wilaya_id: w.id, fee: +cur.fee, is_served: cur.served })
      else if (orig.fee !== '') deletes.push(w.id)
    })
    if (upserts.length) {
      const { error } = await sb().from('wilaya_delivery_fees').upsert(upserts, { onConflict: 'wilaya_id' })
      if (error) { setSaving(false); return setMsg(`Erreur : ${error.message}`) }
    }
    for (const id of deletes) await sb().from('wilaya_delivery_fees').delete().eq('wilaya_id', id)
    await load(); setSaving(false); setMsg('Tarifs enregistrés.')
  }

  return (<div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="h text-3xl">Livraison par wilaya</h1>
      <p className="text-xs text-ivory/50 max-w-sm text-right">Définissez un frais de livraison différent par wilaya. Ce tarif s'applique à tous les produits de la même façon — il n'y a pas de prix produit différent selon la wilaya. Sans tarif spécifique, le frais par défaut ({da(defaultFee)}, modifiable dans Paramètres) s'applique.</p></div>

    {loading ? <p className="text-sm text-ivory/50">Chargement…</p> : !wilayas.length ? <EmptyState text="Aucune wilaya trouvée. Exécutez migration_wilaya_pricing.sql." /> : (<>
      <Card title={`Actions groupées (${selected.size} wilaya${selected.size > 1 ? 's' : ''} sélectionnée${selected.size > 1 ? 's' : ''})`}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 items-end">
          <input className="input" placeholder="Rechercher une wilaya…" value={q} onChange={e => setQ(e.target.value)} />
          <input className="input" type="number" min={0} placeholder="Frais (DA)" value={bulkFee} onChange={e => setBulkFee(e.target.value)} />
          <button type="button" onClick={applyBulk} className="btn text-xs">Appliquer à la sélection</button>
          <div className="flex gap-2 text-xs">
            <button type="button" onClick={() => setSelected(new Set(filtered.map(w => w.id)))} className="border border-ivory/25 px-2 py-2 flex-1">Tout sélectionner</button>
            <button type="button" onClick={() => setSelected(new Set())} className="border border-ivory/25 px-2 py-2 flex-1">Aucune</button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3 text-xs text-ivory/50"><span>{filtered.length} wilaya(s) affichée(s) · {overrideCount} avec un tarif spécifique</span></div>
        <div className="overflow-x-auto border border-ivory/10">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase tracking-widest text-ivory/50 bg-ink/50"><tr>
              <th className="p-2 w-8"></th><th className="p-2">#</th><th className="p-2">Wilaya</th>
              <th className="p-2">Frais de livraison (DA)</th><th className="p-2">Desservie</th><th className="p-2"></th>
            </tr></thead>
            <tbody>{filtered.map(w => {
              const r = rows[w.id] || { fee: '', served: true }
              const active = r.fee !== ''
              return (<tr key={w.id} className={`border-t border-ivory/10 ${active ? 'bg-gold/5' : ''}`}>
                <td className="p-2"><input type="checkbox" checked={selected.has(w.id)} onChange={() => toggleSelect(w.id)} /></td>
                <td className="p-2 text-ivory/50">{w.code}</td>
                <td className="p-2">{w.name}{active && <span className="ml-2 text-gold text-[10px]">●</span>}</td>
                <td className="p-2"><input type="number" min={0} className="input py-1.5" placeholder={String(defaultFee)} value={r.fee} onChange={e => setFee(w.id, e.target.value)} /></td>
                <td className="p-2"><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={r.served} onChange={e => setServed(w.id, e.target.checked)} /> Oui</label></td>
                <td className="p-2">{active && <button type="button" onClick={() => resetRow(w.id)} className="text-xs text-ivory/50 underline">Défaut</button>}</td>
              </tr>)
            })}</tbody>
          </table>
        </div>
      </Card>

      <div className="flex items-center gap-4 sticky bottom-4">
        <button type="button" disabled={saving} onClick={save} className="btn btn-solid">{saving ? 'Enregistrement…' : 'Enregistrer les tarifs'}</button>
        {msg && <p className="text-sm text-gold">{msg}</p>}
      </div>
    </>)}
  </div>)
}
