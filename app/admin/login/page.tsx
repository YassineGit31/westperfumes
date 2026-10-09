'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { sb } from '@/lib/supabase/client'

function LoginForm() {
  const [e, setE] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState(''); const r = useRouter()
  const denied = useSearchParams().get('denied')
  async function go(ev:React.FormEvent) {
    ev.preventDefault(); setErr('')
    const { error } = await sb().auth.signInWithPassword({ email:e, password:p })
    if (error) return setErr('Identifiants incorrects.')
    r.push('/admin'); r.refresh()
  }
  return (<form onSubmit={go} className="max-w-sm mx-auto py-32 px-5 space-y-3">
    <img src="/brand/dupe-monogram.png" className="h-24 mx-auto" alt="DP"/>
    {denied && <p className="text-amber-400 text-sm text-center">Ce compte n'a pas les droits administrateur.</p>}
    <input className="input" type="email" placeholder="Email" value={e} onChange={x=>setE(x.target.value)}/>
    <input className="input" type="password" placeholder="Mot de passe" value={p} onChange={x=>setP(x.target.value)}/>
    {err && <p className="text-red-400 text-sm">{err}</p>}
    <button className="btn btn-solid w-full">Connexion</button>
  </form>)
}
export default function Login() { return <Suspense fallback={null}><LoginForm/></Suspense> }
