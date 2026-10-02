'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { sb } from '@/lib/supabase/client'
export default function Footer() {
  const [store, setStore] = useState<{ instagram?: string; tiktok?: string; facebook?: string; whatsapp?: string }>({})
  useEffect(() => { sb().from('settings').select('value').eq('key', 'store').maybeSingle().then(({ data }) => setStore(data?.value || {})) }, [])
  if (usePathname().startsWith('/admin')) return null
  const clean = (h?: string) => h?.replace(/^@/, '').trim() || ''
  const links = [
    store.instagram && { label: 'Instagram', href: `https://instagram.com/${clean(store.instagram)}` },
    store.tiktok && { label: 'TikTok', href: `https://tiktok.com/@${clean(store.tiktok)}` },
    store.facebook && { label: 'Facebook', href: `https://facebook.com/${clean(store.facebook)}` },
    store.whatsapp && { label: 'WhatsApp', href: `https://wa.me/${store.whatsapp.replace(/\D/g, '')}` },
  ].filter(Boolean) as { label: string; href: string }[]
  return (<footer className="relative border-t border-ivory/10 mt-24 py-14 px-5 overflow-hidden">
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-coal/40" />
    <div className="relative max-w-7xl mx-auto grid gap-10 md:grid-cols-4">
      <div><img src="/brand/west-perfumes-logo.png" alt="WEST PERFUMES" className="h-24 w-24 object-contain"/><p className="mt-4 text-xs text-ivory/50 max-w-[20ch]">Votre signature. Votre parfum.</p></div>
      <div className="text-sm space-y-2"><p className="text-xs uppercase tracking-[.2em] text-gold">Navigation</p><Link className="block transition hover:text-gold hover:translate-x-1" href="/shop">Boutique</Link><Link className="block transition hover:text-gold hover:translate-x-1" href="/about">À propos</Link><Link className="block transition hover:text-gold hover:translate-x-1" href="/faq">FAQ</Link><Link className="block transition hover:text-gold hover:translate-x-1" href="/contact">Contact</Link></div>
      <div className="text-sm space-y-2"><p className="text-xs uppercase tracking-[.2em] text-gold">Catégories</p><Link className="block transition hover:text-gold hover:translate-x-1" href="/shop/homme">Homme</Link><Link className="block transition hover:text-gold hover:translate-x-1" href="/shop/femme">Femme</Link><Link className="block transition hover:text-gold hover:translate-x-1" href="/shop/unisex">Unisex</Link></div>
      <div className="text-sm space-y-2"><p className="text-xs uppercase tracking-[.2em] text-gold">Suivez-nous</p>
        {links.length ? links.map(l => <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="block text-ivory/70 transition hover:text-gold hover:translate-x-1">{l.label}</a>) : <p className="text-ivory/70">Instagram · Facebook · TikTok · WhatsApp</p>}
      </div>
    </div>
    <p className="relative max-w-7xl mx-auto mt-10 text-xs text-ivory/50">© {new Date().getFullYear()} WEST PERFUMES. Les marques citées sont des références de catalogue ; WEST PERFUMES n'en est ni le fabricant ni le propriétaire.</p>
  </footer>)
}
