'use client'
import { useCallback, useEffect, useState } from 'react'
import { sb } from '@/lib/supabase/client'
import { EmptyState } from '@/components/admin/Widgets'
import { waLink } from '@/lib/admin'

export default function Messages() {
  const [rows, setRows] = useState<any[]>([])
  const load = useCallback(async () => { const { data } = await sb().from('messages').select('*').order('created_at', { ascending: false }); setRows(data || []) }, [])
  useEffect(() => { load() }, [load])
  async function markRead(id: string) { await sb().from('messages').update({ is_read: true }).eq('id', id); load() }
  async function del(id: string) { if (confirm('Supprimer ce message ?')) { await sb().from('messages').delete().eq('id', id); load() } }

  return (<div className="space-y-5 max-w-3xl">
    <h1 className="h text-3xl">Messages</h1>
    {!rows.length ? <EmptyState text="Aucun message." /> : (
      <div className="space-y-3">{rows.map(m => (
        <div key={m.id} className={`bg-coal border p-5 ${m.is_read ? 'border-ivory/10' : 'border-gold/50'}`}>
          <div className="flex justify-between items-start gap-3"><div><p className="font-medium">{m.name} {!m.is_read && <span className="ml-2 text-[10px] uppercase tracking-widest text-gold">Nouveau</span>}</p>
            <p className="text-xs text-ivory/50">{m.phone} {m.email && `· ${m.email}`} · {new Date(m.created_at).toLocaleString('fr-FR')}</p></div>
            <div className="text-xs space-x-2 shrink-0">{m.phone && <a className="underline text-gold" target="_blank" href={waLink(m.phone)}>WhatsApp</a>}{!m.is_read && <button onClick={() => markRead(m.id)} className="underline">Marquer lu</button>}<button onClick={() => del(m.id)} className="underline text-red-400">Suppr.</button></div>
          </div>
          {m.subject && <p className="mt-2 text-sm text-gold">{m.subject}</p>}
          <p className="mt-2 text-sm text-ivory/80 whitespace-pre-wrap">{m.body}</p>
        </div>
      ))}</div>
    )}
  </div>)
}
