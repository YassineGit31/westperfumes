'use client'
import { useState } from 'react'
import { useWilaya } from '@/lib/wilaya'
import { da } from '@/lib/format'

export default function WilayaSelector({ compact = false }: { compact?: boolean }) {
  const { wilaya, setWilaya, wilayas, fee, isServed, loading } = useWilaya()
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 text-xs uppercase tracking-[.15em] transition hover:text-gold ${compact ? 'px-0' : 'px-3 py-2 border border-ivory/20'}`}
      >
        <span aria-hidden>📍</span>
        <span className="max-w-[9rem] truncate">{wilaya || 'Livraison : ma wilaya'}</span>
        {loading && <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 max-h-80 overflow-y-auto bg-coal border border-ivory/15 z-50 shadow-xl">
          <div className="p-2 sticky top-0 bg-coal border-b border-ivory/10 text-[10px] uppercase tracking-widest text-ivory/50">Choisissez votre wilaya de livraison</div>
          {wilayas.map(w => (
            <button
              key={w.id}
              onClick={() => { setWilaya(w.name); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-ivory/10 ${wilaya === w.name ? 'text-gold' : 'text-ivory/80'}`}
            >
              {w.code}. {w.name}
            </button>
          ))}
        </div>
      )}
      {wilaya && !loading && (
        <p className="mt-1 text-[10px] text-ivory/50">
          {isServed ? (fee != null && <>Livraison : <span className="text-gold">{da(fee)}</span></>) : <span className="text-red-400">Livraison indisponible pour cette wilaya</span>}
        </p>
      )}
    </div>
  )
}
