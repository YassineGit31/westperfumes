import Link from 'next/link'
import { sbServer } from '@/lib/supabase/server'
import ProductCard from '@/components/ProductCard'
import Newsletter from '@/components/Newsletter'
import HeroScene from '@/components/HeroScene'
import Reveal from '@/components/Reveal'
import type { Product } from '@/lib/format'
export const revalidate = 60
export default async function Home() {
  const [{ data }, { data: storeSetting }] = await Promise.all([
    sbServer().from('products').select('*').eq('is_active', true).eq('is_best_seller', true).limit(8),
    sbServer().from('settings').select('value').eq('key', 'store').maybeSingle(),
  ])
  const products = (data || []) as Product[]
  const store = (storeSetting?.value || {}) as { instagram?: string; tiktok?: string }
  const igHandle = store.instagram?.replace(/^@/, '')
  return (<>
    <section className="relative overflow-hidden">
      <HeroScene />
      <div className="relative max-w-7xl mx-auto px-5 py-24 md:py-40 text-center">
        <img src="/brand/west-perfumes-logo.png" alt="WEST PERFUMES" className="h-40 md:h-56 mx-auto object-contain drop-shadow-[0_0_40px_rgba(200,169,107,0.25)]"/>
        <h1 className="h text-4xl md:text-6xl mt-6">Your signature. Your fragrance.</h1>
        <p className="mt-5 text-ivory/70 max-w-xl mx-auto">Découvrez notre sélection de parfums pour révéler votre signature olfactive. Livraison partout en Algérie, paiement à la livraison.</p>
        <div className="mt-10 flex gap-4 justify-center flex-wrap"><Link href="/shop" className="btn btn-solid">Shop Collection</Link><Link href="/shop#best" className="btn">Nos meilleures ventes</Link></div>
      </div>
    </section>

    <Reveal><section className="max-w-7xl mx-auto px-5 grid md:grid-cols-3 gap-4">
      {['homme','femme','unisex'].map(g => <Link key={g} href={`/shop/${g}`} className="group relative border border-ivory/15 aspect-[4/3] flex flex-col items-center justify-center overflow-hidden hover:border-gold transition">
        <div className="absolute inset-0 bg-gradient-to-br from-gold/0 to-gold/0 group-hover:from-gold/10 group-hover:to-transparent transition-all duration-500" />
        <span className="h text-4xl uppercase relative">{g}</span><span className="mt-3 text-xs uppercase tracking-[.25em] text-gold relative">Découvrir</span></Link>)}
    </section></Reveal>

    <Reveal className="max-w-7xl mx-auto px-5 mt-24"><h2 className="h text-3xl mb-8">Meilleures ventes</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10">{products.map(p => <ProductCard key={p.id} p={p}/>)}</div>
      {!products.length && <p className="text-ivory/60">Aucun produit pour le moment.</p>}
    </Reveal>

    <Reveal className="max-w-7xl mx-auto px-5 mt-24 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm text-center">
      {['Livraison partout en Algérie (69 wilayas)','Paiement à la livraison','Produits soigneusement sélectionnés','Service client disponible'].map(t => <p key={t} className="glass p-6"><span className="text-gold">✓</span> {t}</p>)}
    </Reveal>

    <Reveal className="mt-24"><section className="bg-ivory text-ink text-center py-24 px-5"><h2 className="h text-4xl md:text-6xl">FIND YOUR SIGNATURE</h2>
      <Link href="/shop" className="btn mt-8 border-ink hover:bg-ink hover:text-ivory">Explorer la collection</Link></section>
    </Reveal>

    <Reveal className="max-w-5xl mx-auto px-5 mt-24">
      <a href={igHandle ? `https://instagram.com/${igHandle}` : undefined} target="_blank" rel="noreferrer" className="block text-center text-xs uppercase tracking-[.25em] text-gold mb-8 hover:underline">@{igHandle || 'westperfumes.dz'}</a>
      <div className="grid grid-cols-4 gap-1">{Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="aspect-square bg-coal flex items-center justify-center"><img src="/brand/wp-monogram.png" alt="WEST PERFUMES" className="w-1/3 opacity-30" /></div>
      ))}</div>
    </Reveal>
    <Newsletter />
  </>)
}
