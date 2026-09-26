'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { sb } from '@/lib/supabase/client'
import { useFavorites } from '@/lib/favorites'
import ProductCard from '@/components/ProductCard'
import type { Product } from '@/lib/format'
export default function Favoris() {
  const { ids } = useFavorites()
  const [products, setProducts] = useState<Product[]>([])
  useEffect(() => { if (!ids.length) return setProducts([]); sb().from('products').select('*').in('id', ids).then(({ data }) => setProducts((data || []) as Product[])) }, [ids])
  if (!ids.length) return <div className="text-center py-32"><h1 className="h text-4xl">Aucun favori pour le moment</h1><Link href="/shop" className="btn mt-8">Découvrir les parfums</Link></div>
  return (<div className="max-w-7xl mx-auto px-5 py-12"><h1 className="h text-4xl mb-8">Mes favoris</h1>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">{products.map(p => <ProductCard key={p.id} p={p} />)}</div></div>)
}
