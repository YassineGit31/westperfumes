import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req })
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: {
    getAll: () => req.cookies.getAll(),
    setAll: (list: { name: string; value: string; options: any }[]) => list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)) } })
  const { data: { user } } = await sb.auth.getUser()
  const isLogin = req.nextUrl.pathname === '/admin/login'

  if (!user) return isLogin ? res : NextResponse.redirect(new URL('/admin/login', req.url))
  if (isLogin) return res

  // Being authenticated is not enough: verify the user is actually listed in `admins`.
  // The RLS policy on `admins` only lets an admin read that table (via is_admin()), so
  // a non-admin authenticated user gets zero rows here regardless of who they are —
  // this can't be bypassed by simply having any valid Supabase session.
  const { data: admin } = await sb.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
  if (!admin) {
    await sb.auth.signOut()
    return NextResponse.redirect(new URL('/admin/login?denied=1', req.url))
  }
  return res
}
export const config = { matcher: ['/admin/:path*'] }
