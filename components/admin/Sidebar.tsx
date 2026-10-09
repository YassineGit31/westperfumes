'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
const nav = [
  ['/admin', 'Dashboard', '◧'],
  ['/admin/orders', 'Commandes', '▤'],
  ['/admin/products', 'Produits', '◈'],
  ['/admin/categories', 'Catégories', '▦'],
  ['/admin/delivery', 'Livraison par wilaya', '⌗'],
  ['/admin/customers', 'Clients', '◑'],
  ['/admin/stock', 'Stock', '◫'],
  ['/admin/promotions', 'Promotions', '◎'],
  ['/admin/messages', 'Messages', '✉'],
  ['/admin/settings', 'Paramètres', '⚙'],
] as const
export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const path = usePathname()
  const isActive = (h: string) => (h === '/admin' ? path === '/admin' : path.startsWith(h))
  return (<>
    {open && <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={onClose} />}
    <aside className={`fixed md:sticky top-0 z-50 md:z-0 h-screen w-64 shrink-0 bg-coal border-r border-ivory/10 flex flex-col transition-transform md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <Link href="/admin" className="flex items-center gap-3 px-6 h-20 border-b border-ivory/10 shrink-0">
        <img src="/brand/dupe-monogram.png" alt="DP" className="h-9 w-9" />
        <div><p className="h text-sm tracking-[.25em] leading-none">DUPE</p><p className="text-[10px] uppercase tracking-[.25em] text-ivory/50 mt-1">Admin</p></div>
      </Link>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {nav.map(([href, label, icon]) => (
          <Link key={href} href={href} onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded transition ${isActive(href) ? 'bg-ivory/10 text-gold border-l-2 border-gold' : 'text-ivory/70 hover:bg-ivory/5 hover:text-ivory border-l-2 border-transparent'}`}>
            <span className="w-4 text-center opacity-70">{icon}</span>{label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-ivory/10 text-[10px] text-ivory/40 uppercase tracking-widest">Dupe Perfums © {new Date().getFullYear()}</div>
    </aside>
  </>)
}
