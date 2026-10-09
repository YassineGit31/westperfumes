import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { sbServer } from '@/lib/supabase/server'
import ProductClient from '@/components/ProductClient'
import ProductCard from '@/components/ProductCard'
import { options, type Product } from '@/lib/format'
const site = process.env.NEXT_PUBLIC_SITE_URL || ''
const get = async (slug:string) => (await sbServer().from('products').select('*').eq('slug', slug).eq('is_active', true).maybeSingle()).data as Product | null
export async function generateMetadata({ params }:{ params:{ slug:string } }): Promise<Metadata> {
  const p = await get(params.slug); if (!p) return {}
  return { title:`${p.brand} ${p.name} — DUPE PERFUMS`, description:p.description ?? undefined, alternates:{ canonical:`${site}/product/${p.slug}` }, openGraph:{ images:p.images?.[0] ? [p.images[0]] : [] } }
}
export default async function Page({ params }:{ params:{ slug:string } }) {
  const p = await get(params.slug); if (!p) notFound()
  const { data } = await sbServer().from('products').select('*').eq('is_active', true).eq('gender', p.gender).neq('id', p.id).limit(4)
  const ld = { '@context':'https://schema.org', '@type':'Product', name:p.name, brand:{ '@type':'Brand', name:p.brand }, description:p.description,
    offers:options(p).map(o => ({ '@type':'Offer', priceCurrency:'DZD', price:o.price, name:o.label, availability:o.stock>0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' })) }
  return (<><script type="application/ld+json" dangerouslySetInnerHTML={{ __html:JSON.stringify(ld) }}/><ProductClient p={p}/>
    <section className="max-w-7xl mx-auto px-5 mt-8"><h2 className="h text-3xl mb-8">Vous pourriez aussi aimer</h2><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{((data||[]) as Product[]).map(x => <ProductCard key={x.id} p={x}/>)}</div></section></>)
}
