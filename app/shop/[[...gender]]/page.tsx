import { sbServer } from '@/lib/supabase/server'
import ShopClient from '@/components/ShopClient'
import type { Product } from '@/lib/format'
export const revalidate = 60
export default async function Shop({ params }:{ params:{ gender?:string[] } }) {
  const g = params.gender?.[0]
  let q = sbServer().from('products').select('*').eq('is_active', true)
  if (g && ['homme','femme','unisex'].includes(g)) q = q.eq('gender', g)
  const { data } = await q
  return <ShopClient products={(data || []) as Product[]} title={g ? `Parfums ${g}` : 'Tous les parfums'}/>
}
