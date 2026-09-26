'use client'
import { useRef, useState } from 'react'
import { sb } from '@/lib/supabase/client'

// Upload direct vers le bucket public "product-images" (voir supabase/migration_storage.sql).
// Assomption : pas de conversion automatique en WebP côté client ici (nécessiterait une
// librairie de traitement d'image ou une Edge Function) — les fichiers sont stockés tels
// quels. Convertissez vos visuels en WebP/AVIF avant l'upload pour un poids optimal.
export default function ImageUploader({ images, onChange, folder }: { images: string[]; onChange: (urls: string[]) => void; folder: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return
    setBusy(true); setErr('')
    const uploaded: string[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${folder}/${crypto.randomUUID()}.${ext}`
      const { error } = await sb().storage.from('product-images').upload(path, file, { upsert: true, cacheControl: '31536000' })
      if (error) { setErr(error.message); continue }
      const { data } = sb().storage.from('product-images').getPublicUrl(path)
      uploaded.push(data.publicUrl)
    }
    onChange([...images, ...uploaded])
    setBusy(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  function remove(url: string) {
    onChange(images.filter(u => u !== url))
    // Best-effort : tente de retirer aussi le fichier du bucket (n'échoue pas la suppression
    // dans la liste si l'URL ne correspond pas exactement à un chemin du bucket, par ex.
    // une image collée manuellement en dehors de Storage).
    const marker = '/product-images/'
    const idx = url.indexOf(marker)
    if (idx !== -1) sb().storage.from('product-images').remove([url.slice(idx + marker.length)]).catch(() => {})
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir; if (j < 0 || j >= images.length) return
    const next = [...images]; [next[i], next[j]] = [next[j], next[i]]; onChange(next)
  }

  return (<div className="space-y-3">
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      {images.map((url, i) => (<div key={url} className="relative group aspect-square bg-ink border border-ivory/15">
        <img src={url} alt="" className="w-full h-full object-cover" />
        {i === 0 && <span className="absolute top-1 left-1 bg-gold text-ink text-[9px] uppercase tracking-widest px-1.5 py-0.5">Principale</span>}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1">
          <div className="flex gap-1">
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-xs bg-ivory/20 px-2 py-1 disabled:opacity-30">←</button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} className="text-xs bg-ivory/20 px-2 py-1 disabled:opacity-30">→</button>
          </div>
          <button type="button" onClick={() => remove(url)} className="text-xs bg-red-600 px-2 py-1">Supprimer</button>
        </div>
      </div>))}
      <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
        className="aspect-square border border-dashed border-ivory/25 flex flex-col items-center justify-center text-xs text-ivory/50 hover:border-gold hover:text-gold transition disabled:opacity-40">
        <span className="text-2xl leading-none mb-1">{busy ? '…' : '+'}</span>{busy ? 'Envoi…' : 'Ajouter'}
      </button>
    </div>
    <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
    {err && <p className="text-red-400 text-xs">{err}</p>}
    <p className="text-[11px] text-ivory/40">La première image est utilisée comme visuel principal. Glissez les flèches pour réordonner.</p>
  </div>)
}
