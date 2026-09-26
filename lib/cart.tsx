'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import type { Fmt } from './format'
export interface CartItem { productId:string; slug:string; name:string; brand:string; image:string|null; format:Fmt; size:string; price:number; qty:number }
const key = (i:{productId:string;format:Fmt}) => `${i.productId}:${i.format}`
const Ctx = createContext<any>(null)
export const useCart = () => useContext(Ctx) as { items:CartItem[]; count:number; subtotal:number; toast:string;
  add:(i:Omit<CartItem,'qty'>, qty:number)=>void; setQty:(id:string,f:Fmt,q:number)=>void; remove:(id:string,f:Fmt)=>void; clear:()=>void }
export function CartProvider({ children }:{ children:React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]); const [ready, setReady] = useState(false); const [toast, setToast] = useState('')
  useEffect(() => { try { setItems(JSON.parse(localStorage.getItem('wp_cart') || '[]')) } catch {} setReady(true) }, [])
  useEffect(() => { if (ready) localStorage.setItem('wp_cart', JSON.stringify(items)) }, [items, ready])
  const add = (i:Omit<CartItem,'qty'>, qty:number) => { setItems(p => p.some(x => key(x) === key(i)) ? p.map(x => key(x) === key(i) ? { ...x, qty:x.qty + qty } : x) : [...p, { ...i, qty }]); setToast(`${i.name} (${i.format === 'full' ? i.size : '10ML'}) ajouté au panier`); setTimeout(() => setToast(''), 2500) }
  const setQty = (id:string, f:Fmt, q:number) => setItems(p => p.map(x => key(x) === `${id}:${f}` ? { ...x, qty:Math.max(1, q) } : x))
  const remove = (id:string, f:Fmt) => setItems(p => p.filter(x => key(x) !== `${id}:${f}`))
  return <Ctx.Provider value={{ items, count:items.reduce((s,i)=>s+i.qty,0), subtotal:items.reduce((s,i)=>s+i.qty*i.price,0), toast, add, setQty, remove, clear:()=>setItems([]) }}>
    {children}{toast && <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-ivory text-ink text-sm px-5 py-3">{toast}</div>}</Ctx.Provider>
}
