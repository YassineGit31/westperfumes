'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { sb } from './supabase/client'
import { WILAYAS } from './format'

export interface WilayaRow { id: number; code: number; name: string }
interface WilayaCtx {
  wilaya: string
  setWilaya: (w: string) => void
  wilayas: WilayaRow[]
  fee: number | null
  isServed: boolean
  loading: boolean
}
const Ctx = createContext<WilayaCtx | null>(null)
export const useWilaya = () => useContext(Ctx) as WilayaCtx

// Le frais de livraison affiché ici est purement indicatif pour l'UX (choix de wilaya,
// aperçu panier/checkout) : la source de vérité reste toujours la fonction SQL
// place_order(), qui recalcule le frais côté serveur à la confirmation de commande,
// sans jamais faire confiance à ce que le navigateur envoie. Le prix des produits, lui,
// ne dépend plus de la wilaya — seul le frais de livraison varie, de la même façon pour
// tous les produits.
export function WilayaProvider({ children }: { children: React.ReactNode }) {
  const [wilaya, setWilayaState] = useState('')
  const [wilayas, setWilayas] = useState<WilayaRow[]>(WILAYAS.map((name, i) => ({ id: i + 1, code: i + 1, name })))
  const [fee, setFee] = useState<number | null>(null)
  const [isServed, setIsServed] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try { const w = localStorage.getItem('wp_wilaya'); if (w) setWilayaState(w) } catch {}
    sb().from('wilayas').select('id,code,name').order('code').then(({ data }) => { if (data?.length) setWilayas(data) })
  }, [])

  const load = useCallback(async (w: string) => {
    if (!w) { setFee(null); setIsServed(true); return }
    setLoading(true)
    const { data, error } = await sb().rpc('get_delivery_fee', { p_wilaya_name: w }).maybeSingle()
    if (!error && data) { setFee((data as any).fee); setIsServed((data as any).is_served) }
    setLoading(false)
  }, [])

  useEffect(() => { load(wilaya) }, [wilaya, load])

  const setWilaya = (w: string) => { setWilayaState(w); try { localStorage.setItem('wp_wilaya', w) } catch {} }
  return <Ctx.Provider value={{ wilaya, setWilaya, wilayas, fee, isServed, loading }}>{children}</Ctx.Provider>
}
