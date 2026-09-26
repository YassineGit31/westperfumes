'use client'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const Hero3D = dynamic(() => import('./Hero3D'), { ssr: false, loading: () => null })

export default function HeroScene() {
  const [mode, setMode] = useState<'loading' | '3d' | 'static'>('loading')

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const small = window.innerWidth < 640
    const deviceMemory = (navigator as any).deviceMemory as number | undefined
    const lowPower = typeof deviceMemory === 'number' && deviceMemory < 4
    setMode(reduced || (small && lowPower) ? 'static' : '3d')
  }, [])

  // Dégradé statique : pendant le chargement, si l'utilisateur préfère moins d'animations,
  // ou sur un petit écran + appareil peu puissant (heuristique simple, sans bloquer le mobile en général).
  const staticGlow = <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(200,169,107,0.20),transparent_60%)]" />

  if (mode !== '3d') return staticGlow
  return (<>{staticGlow}<div className="absolute inset-0"><Hero3D dpr={window.innerWidth < 768 ? [1, 1] : [1, 1.5]} /></div></>)
}
