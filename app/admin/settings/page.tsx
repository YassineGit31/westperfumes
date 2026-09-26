'use client'
import { useEffect, useState } from 'react'
import { sb } from '@/lib/supabase/client'

export default function Settings() {
  const [store, setStore] = useState({ name: '', phone: '', whatsapp: '', instagram: '', tiktok: '', facebook: '' })
  const [deliveryFee, setDeliveryFee] = useState(600)
  const [freeThreshold, setFreeThreshold] = useState(0)
  const [lowStock, setLowStock] = useState(5)
  const [autoConfirm, setAutoConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    (async () => {
      const { data } = await sb().from('settings').select('*')
      data?.forEach((s: any) => {
        if (s.key === 'store') setStore({ ...store, ...s.value })
        if (s.key === 'delivery_fee') setDeliveryFee(+s.value)
        if (s.key === 'free_delivery_threshold') setFreeThreshold(+s.value)
        if (s.key === 'low_stock_threshold') setLowStock(+s.value)
        if (s.key === 'auto_confirm') setAutoConfirm(s.value === true || s.value === 'true')
      })
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })()
  }, [])

  async function save() {
    setBusy(true)
    await sb().from('settings').upsert([
      { key: 'store', value: store },
      { key: 'delivery_fee', value: deliveryFee },
      { key: 'free_delivery_threshold', value: freeThreshold },
      { key: 'low_stock_threshold', value: lowStock },
      { key: 'auto_confirm', value: autoConfirm },
    ])
    setBusy(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  return (<div className="space-y-6 max-w-3xl">
    <h1 className="h text-3xl">Paramètres</h1>

    <section className="bg-coal border border-ivory/10 p-5 space-y-3">
      <h2 className="h text-lg">Informations boutique</h2>
      <input className="input" placeholder="Nom de la boutique" value={store.name} onChange={e => setStore({ ...store, name: e.target.value })} />
      <div className="grid md:grid-cols-2 gap-3">
        <input className="input" placeholder="Téléphone" value={store.phone} onChange={e => setStore({ ...store, phone: e.target.value })} />
        <input className="input" placeholder="WhatsApp" value={store.whatsapp} onChange={e => setStore({ ...store, whatsapp: e.target.value })} />
        <input className="input" placeholder="Instagram" value={store.instagram} onChange={e => setStore({ ...store, instagram: e.target.value })} />
        <input className="input" placeholder="TikTok" value={store.tiktok} onChange={e => setStore({ ...store, tiktok: e.target.value })} />
        <input className="input" placeholder="Facebook" value={store.facebook} onChange={e => setStore({ ...store, facebook: e.target.value })} />
      </div>
    </section>

    <section className="bg-coal border border-ivory/10 p-5 space-y-3">
      <h2 className="h text-lg">Livraison</h2>
      <div className="grid md:grid-cols-2 gap-3">
        <label className="text-xs text-ivory/50 flex flex-col gap-1">Frais de livraison (DA)<input type="number" min={0} className="input" value={deliveryFee} onChange={e => setDeliveryFee(+e.target.value)} /></label>
        <label className="text-xs text-ivory/50 flex flex-col gap-1">Livraison gratuite dès (DA, 0 = désactivé)<input type="number" min={0} className="input" value={freeThreshold} onChange={e => setFreeThreshold(+e.target.value)} /></label>
      </div>
    </section>

    <section className="bg-coal border border-ivory/10 p-5 space-y-3">
      <h2 className="h text-lg">Commandes</h2>
      <label className="text-xs text-ivory/50 flex flex-col gap-1 max-w-xs">Seuil de stock faible (unités)<input type="number" min={0} className="input" value={lowStock} onChange={e => setLowStock(+e.target.value)} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={autoConfirm} onChange={e => setAutoConfirm(e.target.checked)} /> Confirmer automatiquement les nouvelles commandes</label>
    </section>

    <div className="flex items-center gap-3"><button disabled={busy} onClick={save} className="btn btn-solid">{busy ? 'Enregistrement…' : 'Enregistrer les paramètres'}</button>{saved && <span className="text-emerald-400 text-sm">Enregistré ✓</span>}</div>
  </div>)
}
