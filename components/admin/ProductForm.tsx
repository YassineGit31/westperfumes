'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { sb } from '@/lib/supabase/client'
import ImageUploader from './ImageUploader'

const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export default function ProductForm({ product }: { product?: any }) {
  const router = useRouter()
  const [categories, setCategories] = useState<any[]>([])
  const [slugTouched, setSlugTouched] = useState(!!product)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  // Dossier stable dans le bucket Storage, même pour un produit pas encore enregistré.
  const [folderId] = useState(() => product?.id || crypto.randomUUID())
  const [images, setImages] = useState<string[]>(product?.images || [])
  const [f, setF] = useState({
    name: product?.name || '', slug: product?.slug || '', brand: product?.brand || '', description: product?.description || '',
    category_id: product?.category_id || '', gender: product?.gender || 'homme', sku: product?.sku || '',
    top_notes: (product?.top_notes || []).join(', '), heart_notes: (product?.heart_notes || []).join(', '), base_notes: (product?.base_notes || []).join(', '),
    full_size: product?.full_size ?? '100ML', full_price: product?.full_price ?? 0, full_old_price: product?.full_old_price ?? '', full_enabled: product?.full_enabled ?? true,
    sample_10ml: product?.sample_10ml ?? true, price_10ml: product?.price_10ml ?? '', old_price_10ml: product?.old_price_10ml ?? '',
    stock_ml: product?.stock_ml ?? 0,
    is_featured: product?.is_featured ?? false, is_best_seller: product?.is_best_seller ?? false, is_new: product?.is_new ?? false, is_active: product?.is_active ?? true,
  })
  useEffect(() => { sb().from('categories').select('*').order('name').then(({ data }) => setCategories(data || [])) }, [])
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  // Full bottle and 10ml portions are the SAME liquid: one shared stock in ml drives both counts below.
  const fullSizeMl = Math.max(1, parseInt(String(f.full_size).replace(/\D/g, ''), 10) || 100)
  const stockMlNum = +f.stock_ml || 0
  const computedFullStock = Math.floor(stockMlNum / fullSizeMl)
  const computed10mlStock = Math.floor(stockMlNum / 10)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true)
    const payload = {
      name: f.name, slug: f.slug || slugify(f.name), brand: f.brand, description: f.description || null,
      category_id: f.category_id ? +f.category_id : null, gender: f.gender, sku: f.sku || null,
      images,
      top_notes: f.top_notes.split(',').map((s: string) => s.trim()).filter(Boolean), heart_notes: f.heart_notes.split(',').map((s: string) => s.trim()).filter(Boolean), base_notes: f.base_notes.split(',').map((s: string) => s.trim()).filter(Boolean),
      full_size: f.full_size, full_price: +f.full_price || 0, full_old_price: f.full_old_price ? +f.full_old_price : null, full_enabled: f.full_enabled,
      sample_10ml: f.sample_10ml, price_10ml: f.price_10ml ? +f.price_10ml : null, old_price_10ml: f.old_price_10ml ? +f.old_price_10ml : null,
      stock_ml: +f.stock_ml || 0,
      is_featured: f.is_featured, is_best_seller: f.is_best_seller, is_new: f.is_new, is_active: f.is_active,
    }
    const { error } = product ? await sb().from('products').update(payload).eq('id', product.id) : await sb().from('products').insert(payload)
    setBusy(false)
    if (error) return setErr(error.message.includes('duplicate') ? 'Ce slug ou SKU existe déjà.' : error.message)
    router.push('/admin/products'); router.refresh()
  }

  return (<form onSubmit={submit} className="max-w-4xl space-y-6">
    {err && <p className="text-red-400 text-sm">{err}</p>}
    <section className="bg-coal border border-ivory/10 p-5 space-y-3">
      <h2 className="h text-lg mb-2">Informations générales</h2>
      <div className="grid md:grid-cols-2 gap-3">
        <input required className="input" placeholder="Nom du produit" value={f.name} onChange={e => { set('name')(e); if (!slugTouched) setF(s => ({ ...s, name: e.target.value, slug: slugify(e.target.value) })) }} />
        <input required className="input" placeholder="Slug (URL)" value={f.slug} onChange={e => { setSlugTouched(true); set('slug')(e) }} />
        <input required className="input" placeholder="Marque" value={f.brand} onChange={set('brand')} />
        <input className="input" placeholder="SKU" value={f.sku} onChange={set('sku')} />
        <select className="input bg-ink" value={f.gender} onChange={set('gender')}><option value="homme">Homme</option><option value="femme">Femme</option><option value="unisex">Unisex</option></select>
        <select className="input bg-ink" value={f.category_id} onChange={set('category_id')}><option value="">Catégorie…</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </div>
      <textarea className="input" rows={3} placeholder="Description" value={f.description} onChange={set('description')} />
    </section>

    <section className="bg-coal border border-ivory/10 p-5 space-y-3">
      <h2 className="h text-lg mb-2">Images du produit</h2>
      <ImageUploader images={images} onChange={setImages} folder={folderId} />
    </section>

    <section className="bg-coal border border-ivory/10 p-5 space-y-3">
      <h2 className="h text-lg mb-2">Notes olfactives</h2>
      <div className="grid md:grid-cols-3 gap-3">
        <input className="input" placeholder="Notes de tête (séparées par virgule)" value={f.top_notes} onChange={set('top_notes')} />
        <input className="input" placeholder="Notes de cœur" value={f.heart_notes} onChange={set('heart_notes')} />
        <input className="input" placeholder="Notes de fond" value={f.base_notes} onChange={set('base_notes')} />
      </div>
    </section>

    <section className="grid md:grid-cols-2 gap-4">
      <div className="bg-coal border border-ivory/10 p-5 space-y-3">
        <div className="flex items-center justify-between"><h2 className="h text-lg">Full Size</h2>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={f.full_enabled} onChange={set('full_enabled')} /> Disponible</label></div>
        <input className="input" placeholder="Contenance (ex: 100ML)" value={f.full_size} onChange={set('full_size')} />
        <input required type="number" min={0} className="input" placeholder="Prix (DA)" value={f.full_price} onChange={set('full_price')} />
        <input type="number" min={0} className="input" placeholder="Ancien prix (DA, optionnel)" value={f.full_old_price} onChange={set('full_old_price')} />
        <p className="text-xs text-ivory/50">Stock (calculé) : <span className="text-ivory">{computedFullStock} flacon(s)</span></p>
      </div>
      <div className="bg-coal border border-ivory/10 p-5 space-y-3">
        <div className="flex items-center justify-between"><h2 className="h text-lg">10ML</h2>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={f.sample_10ml} onChange={set('sample_10ml')} /> Disponible</label></div>
        <input type="number" min={0} className="input" placeholder="Prix (DA)" value={f.price_10ml} onChange={set('price_10ml')} />
        <input type="number" min={0} className="input" placeholder="Ancien prix (DA, optionnel)" value={f.old_price_10ml} onChange={set('old_price_10ml')} />
        <p className="text-xs text-ivory/50">Stock (calculé) : <span className="text-ivory">{computed10mlStock} portion(s)</span></p>
      </div>
    </section>

    <section className="bg-coal border border-ivory/10 p-5 space-y-3">
      <h2 className="h text-lg mb-2">Stock</h2>
      <p className="text-xs text-ivory/50">Un seul stock physique (en ml) pour ce parfum : le flacon plein et les portions 10ML sont le même liquide, donc une vente de l'un fait automatiquement bouger l'autre.</p>
      <input required type="number" min={0} className="input" placeholder="Stock total (en ml)" value={f.stock_ml} onChange={set('stock_ml')} />
      <p className="text-xs text-ivory/50">≈ {computedFullStock} flacon(s) de {fullSizeMl}ML, ou {computed10mlStock} portion(s) de 10ML.</p>
    </section>

    <section className="bg-coal border border-ivory/10 p-5 flex flex-wrap gap-5 text-sm">
      <label className="flex items-center gap-2"><input type="checkbox" checked={f.is_featured} onChange={set('is_featured')} /> Mis en avant</label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={f.is_best_seller} onChange={set('is_best_seller')} /> Meilleure vente</label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={f.is_new} onChange={set('is_new')} /> Nouveauté</label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={f.is_active} onChange={set('is_active')} /> Actif (visible sur le site)</label>
    </section>

    <div className="flex gap-3"><button disabled={busy} className="btn btn-solid">{busy ? 'Enregistrement…' : product ? 'Enregistrer les modifications' : 'Créer le produit'}</button>
      <button type="button" className="btn" onClick={() => router.push('/admin/products')}>Annuler</button></div>
  </form>)
}
