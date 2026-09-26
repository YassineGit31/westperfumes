'use client'
import { useState } from 'react'
import { sb } from '@/lib/supabase/client'

export default function Contact() {
  const [f, setF] = useState({ name: '', phone: '', email: '', subject: '', body: '' })
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true)
    const { error } = await sb().from('messages').insert({ name: f.name, phone: f.phone || null, email: f.email || null, subject: f.subject || null, body: f.body })
    setBusy(false)
    if (error) return setErr('Une erreur est survenue. Veuillez réessayer.')
    setDone(true)
  }

  if (done) return (<div className="max-w-lg mx-auto px-5 py-32 text-center">
    <h1 className="h text-4xl">Message envoyé !</h1>
    <p className="mt-3 text-ivory/70">Merci de nous avoir contactés. Notre équipe vous répondra dans les plus brefs délais.</p>
  </div>)

  return (<div className="max-w-lg mx-auto px-5 py-20">
    <h1 className="h text-4xl mb-2">Contact</h1>
    <p className="text-ivory/70 mb-8">Une question sur un parfum, une commande ou une livraison ? Écrivez-nous.</p>
    <form onSubmit={submit} className="space-y-3">
      <input required className="input" placeholder="Nom et prénom" value={f.name} onChange={set('name')} />
      <input className="input" placeholder="Téléphone" value={f.phone} onChange={set('phone')} />
      <input className="input" type="email" placeholder="Email (optionnel)" value={f.email} onChange={set('email')} />
      <input className="input" placeholder="Sujet" value={f.subject} onChange={set('subject')} />
      <textarea required className="input" rows={5} placeholder="Votre message" value={f.body} onChange={set('body')} />
      {err && <p className="text-red-400 text-sm">{err}</p>}
      <button disabled={busy} className="btn btn-solid w-full">{busy ? 'Envoi…' : 'Envoyer le message'}</button>
    </form>
    <p className="mt-8 text-sm text-ivory/50">Vous pouvez aussi nous joindre directement via WhatsApp ou Instagram — retrouvez nos coordonnées en bas de page.</p>
  </div>)
}
