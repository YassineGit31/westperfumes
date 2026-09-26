'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { sb } from '@/lib/supabase/client'
import ProductForm from '@/components/admin/ProductForm'

export default function EditProduct() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<any>(undefined)
  useEffect(() => { sb().from('products').select('*').eq('id', id).maybeSingle().then(({ data }) => setProduct(data)) }, [id])
  if (product === undefined) return <p className="text-sm text-ivory/50">Chargement…</p>
  if (!product) return <p className="text-sm text-ivory/50">Produit introuvable.</p>
  return (<div className="space-y-5"><h1 className="h text-3xl">Modifier — {product.name}</h1><ProductForm product={product} /></div>)
}
