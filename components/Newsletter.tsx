'use client'
import { useState } from 'react'
import { sb } from '@/lib/supabase/client'
export default function Newsletter() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setState('busy')
    const { error } = await sb().from('newsletter_subscribers').insert({ email })
    setState(error && !error.message.includes('duplicate') ? 'error' : 'done')
  }
  return (<section className="max-w-2xl mx-auto px-5 mt-24 text-center">
    <h2 className="h text-3xl md:text-4xl">Entrez dans l&rsquo;univers WEST</h2>
    <p className="mt-3 text-ivory/70">Recevez nos nouveautés, offres et nouvelles collections.</p>
    {state === 'done' ? <p className="mt-6 text-gold">Merci, vous êtes inscrit(e) !</p> : (
      <form onSubmit={submit} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
        <input required type="email" className="input" placeholder="Votre adresse email" value={email} onChange={e => setEmail(e.target.value)} />
        <button disabled={state === 'busy'} className="btn btn-solid shrink-0">{state === 'busy' ? 'Envoi…' : "S'inscrire"}</button>
      </form>
    )}
    {state === 'error' && <p className="mt-3 text-red-400 text-sm">Une erreur est survenue. Veuillez réessayer.</p>}
  </section>)
}
