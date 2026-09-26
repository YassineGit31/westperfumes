'use client'
import { useState } from 'react'
import { sb } from '@/lib/supabase/client'
import { da, fmtLabel } from '@/lib/format'
const steps = [['nouvelle','Commande reçue'],['confirmee','Commande confirmée'],['en_preparation','En préparation'],['expediee','Expédiée'],['livree','Livrée']]
export default function Track() {
  const [n, setN] = useState(''); const [ph, setPh] = useState(''); const [o, setO] = useState<any>(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  async function go(e:React.FormEvent) { e.preventDefault(); setBusy(true); setErr(''); setO(null)
    const { data } = await sb().rpc('track_order', { p_number:n.trim(), p_phone:ph.replace(/\s/g, '') }); setBusy(false)
    data ? setO(data) : setErr('Aucune commande trouvée. Vérifiez le numéro et le téléphone.') }
  const idx = o ? Math.max(steps.findIndex(s => s[0] === o.status), o.status === 'a_confirmer' ? 0 : -1) : -1
  return (<div className="max-w-xl mx-auto px-5 py-16"><h1 className="h text-4xl mb-6">Suivi de commande</h1>
    <form onSubmit={go} className="space-y-3"><input required className="input" placeholder="Numéro de commande (WP-2026-000123)" value={n} onChange={e=>setN(e.target.value)}/><input required className="input" placeholder="Téléphone" value={ph} onChange={e=>setPh(e.target.value)}/><button disabled={busy} className="btn btn-solid w-full">{busy ? 'Recherche…' : 'Suivre'}</button></form>
    {err && <p className="text-red-400 mt-4">{err}</p>}
    {o && <div className="mt-10">{['annulee','refusee'].includes(o.status) ? <p className="border border-red-400 text-red-400 p-4">Commande {o.status === 'annulee' ? 'annulée' : 'refusée'}.</p> :
      <ol className="space-y-5">{steps.map(([k,l],i) => <li key={k} className="flex items-center gap-4"><span className={`h-4 w-4 rounded-full border ${i<=idx ? 'bg-gold border-gold' : 'border-ivory/30'}`}/><span className={i<=idx ? '' : 'text-ivory/40'}>{l}</span></li>)}</ol>}
      <div className="mt-8 border-t border-ivory/15 pt-4 text-sm space-y-1">{o.items.map((i:any,k:number) => <p key={k} className="flex justify-between"><span>{i.name} — {fmtLabel(i.format, i.size)} × {i.quantity}</span><span>{da(i.subtotal)}</span></p>)}<p className="h text-xl flex justify-between"><span>Total</span><span>{da(o.total)}</span></p></div></div>}</div>)
}
