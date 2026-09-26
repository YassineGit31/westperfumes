'use client'
import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useCart } from '@/lib/cart'
import { useFavorites } from '@/lib/favorites'
import WilayaSelector from './WilayaSelector'
export default function Navbar() {
  const path = usePathname(); const { count } = useCart(); const { ids } = useFavorites()
  const [menu, setMenu] = useState(false)
  if (path.startsWith('/admin')) return null
  const links = [['/shop','Boutique'],['/shop/homme','Homme'],['/shop/femme','Femme'],['/shop/unisex','Unisex'],['/about','À propos'],['/track-order','Suivi']]
  return (<>
    <header className="sticky top-0 z-40 bg-ink/80 backdrop-blur-md border-b border-ivory/10 supports-[backdrop-filter]:bg-ink/60">
      <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button aria-label="Menu" onClick={()=>setMenu(true)} className="md:hidden h-9 w-9 -ml-2 flex items-center justify-center text-lg">☰</button>
          <Link href="/" className="flex items-center gap-3"><img src="/brand/wp-monogram.png" alt="WEST PERFUMES" className="h-10 w-10 object-contain"/><span className="h text-lg tracking-[.3em] hidden sm:block">WEST</span></Link>
        </div>
        <nav className="hidden md:flex gap-8 text-xs uppercase tracking-[.2em]">{links.map(([h,l]) => <Link key={h} href={h} className="relative py-1 hover:text-gold transition-colors after:absolute after:left-0 after:-bottom-1 after:h-px after:w-0 after:bg-gold hover:after:w-full after:transition-all">{l}</Link>)}</nav>
        <div className="flex items-center gap-4 text-xs uppercase tracking-[.2em]">
          <span className="hidden lg:block"><WilayaSelector compact/></span>
          <Link href="/favoris" className="hidden sm:block hover:text-gold">Favoris ({ids.length})</Link>
          <Link href="/cart" className="hover:text-gold">Panier ({count})</Link>
        </div>
      </div>
    </header>

    {menu && (<div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/70" onClick={()=>setMenu(false)} />
      <div className="absolute inset-y-0 left-0 w-72 bg-coal border-r border-ivory/10 p-6 flex flex-col gap-6 mobile-menu-in">
        <div className="flex items-center justify-between"><img src="/brand/wp-monogram.png" alt="WEST PERFUMES" className="h-12 w-12 object-contain"/><button onClick={()=>setMenu(false)} className="text-xl leading-none">✕</button></div>
        <nav className="flex flex-col gap-1 text-sm uppercase tracking-[.2em]">{links.map(([h,l]) => <Link key={h} href={h} onClick={()=>setMenu(false)} className="py-3 border-b border-ivory/10 hover:text-gold">{l}</Link>)}</nav>
        <WilayaSelector/>
      </div>
    </div>)}

    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-coal/95 backdrop-blur border-t border-ivory/10 grid grid-cols-4 text-[10px] uppercase tracking-widest text-center">
      {[['/','Accueil'],['/shop','Boutique'],['/favoris',`Favoris (${ids.length})`],['/cart',`Panier (${count})`]].map(([h,l]) => <Link key={h} href={h} className="py-4">{l}</Link>)}</nav></>)
}
