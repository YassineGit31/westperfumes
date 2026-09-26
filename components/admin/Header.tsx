'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { sb } from '@/lib/supabase/client'

const ICON: Record<string, string> = { new_order: '🛍️', order_cancelled: '✕', low_stock: '⚠️', out_of_stock: '⛔', new_message: '✉️' }

export default function Header({ onMenu }: { onMenu: () => void }) {
  const [notifs, setNotifs] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState(false)
  const [email, setEmail] = useState('')
  const router = useRouter()

  const load = useCallback(async () => {
    const { data } = await sb().from('notifications').select('*').eq('is_read', false).order('created_at', { ascending: false }).limit(30)
    setNotifs(data || [])
  }, [])
  useEffect(() => {
    load()
    sb().auth.getUser().then(({ data }) => setEmail(data.user?.email || ''))
    const ch = sb().channel('admin-notifs').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, load).subscribe()
    return () => { sb().removeChannel(ch) }
  }, [load])

  async function markRead(id?: number) {
    const q = sb().from('notifications').update({ is_read: true })
    await (id ? q.eq('id', id) : q.eq('is_read', false))
    load()
  }
  async function logout() { await sb().auth.signOut(); router.push('/admin/login') }

  return (
    <header className="sticky top-0 z-30 h-16 bg-ink/95 backdrop-blur border-b border-ivory/10 flex items-center gap-4 px-4 md:px-6">
      <button className="md:hidden text-xl" onClick={onMenu} aria-label="Menu">☰</button>
      <input className="input hidden md:block max-w-xs !py-2 !text-sm" placeholder="Rechercher une commande, un produit…" />
      <div className="flex-1" />
      <div className="relative">
        <button className="relative text-lg px-2" onClick={() => { setOpen(o => !o); setProfile(false) }} aria-label="Notifications">
          🔔{notifs.length > 0 && <span className="absolute -top-0.5 -right-0.5 bg-gold text-ink text-[10px] leading-none rounded-full h-4 w-4 flex items-center justify-center">{notifs.length > 9 ? '9+' : notifs.length}</span>}
        </button>
        {open && (<div className="absolute right-0 mt-3 w-80 bg-coal border border-ivory/15 shadow-xl max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-ivory/10"><p className="text-xs uppercase tracking-widest">Notifications</p>
            {notifs.length > 0 && <button className="text-xs underline text-ivory/60" onClick={() => markRead()}>Tout marquer comme lu</button>}</div>
          {!notifs.length ? <p className="p-4 text-sm text-ivory/50">Aucune notification.</p> : notifs.map(n => (
            <button key={n.id} onClick={() => markRead(n.id)} className="w-full text-left px-4 py-3 border-b border-ivory/5 hover:bg-ivory/5 text-sm flex gap-2">
              <span>{ICON[n.type] || '•'}</span><span><b className="block">{n.title}</b><span className="text-ivory/60">{n.body}</span></span>
            </button>))}
        </div>)}
      </div>
      <div className="relative">
        <button className="flex items-center gap-2 text-sm" onClick={() => { setProfile(p => !p); setOpen(false) }}>
          <span className="h-8 w-8 rounded-full bg-gold/20 text-gold flex items-center justify-center text-xs uppercase">{email.slice(0, 2) || 'AD'}</span>
          <span className="hidden md:block text-ivory/70">{email || 'Admin'}</span>
        </button>
        {profile && (<div className="absolute right-0 mt-3 w-48 bg-coal border border-ivory/15 shadow-xl text-sm">
          <Link href="/" className="block px-4 py-3 hover:bg-ivory/5 border-b border-ivory/10">Voir le site</Link>
          <Link href="/admin/settings" className="block px-4 py-3 hover:bg-ivory/5 border-b border-ivory/10">Paramètres</Link>
          <button onClick={logout} className="w-full text-left px-4 py-3 hover:bg-ivory/5 text-red-400">Déconnexion</button>
        </div>)}
      </div>
    </header>
  )
}
