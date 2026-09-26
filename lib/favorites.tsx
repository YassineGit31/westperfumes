'use client'
import { createContext, useContext, useEffect, useState } from 'react'
const Ctx = createContext<any>(null)
export const useFavorites = () => useContext(Ctx) as { ids: string[]; has: (id: string) => boolean; toggle: (id: string) => void }
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([])
  const [ready, setReady] = useState(false)
  useEffect(() => { try { setIds(JSON.parse(localStorage.getItem('wp_favorites') || '[]')) } catch { } setReady(true) }, [])
  useEffect(() => { if (ready) localStorage.setItem('wp_favorites', JSON.stringify(ids)) }, [ids, ready])
  const has = (id: string) => ids.includes(id)
  const toggle = (id: string) => setIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  return <Ctx.Provider value={{ ids, has, toggle }}>{children}</Ctx.Provider>
}
