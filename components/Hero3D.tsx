'use client'
import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { MeshDistortMaterial, Sphere, Sparkles } from '@react-three/drei'
import * as THREE from 'three'

// Pas de modèle de flacon réel disponible : plutôt qu'un asset 3D générique de mauvaise
// qualité, on utilise une scène abstraite (orbe façon verre distordu + particules,
// évoquant la diffusion d'un parfum) — sobre, légère, et cohérente avec la charte.
function FragranceOrb() {
  const mesh = useRef<THREE.Mesh>(null!)
  useFrame((state, delta) => {
    if (!mesh.current) return
    mesh.current.rotation.y += delta * 0.12
    mesh.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.12) * 0.12
    const t = state.pointer
    mesh.current.rotation.y += t.x * 0.0005
    mesh.current.rotation.x += -t.y * 0.0005
  })
  return (
    <Sphere ref={mesh} args={[1.4, 96, 96]}>
      <MeshDistortMaterial color="#C8A96B" distort={0.32} speed={1.1} roughness={0.2} metalness={0.55} />
    </Sphere>
  )
}

function Scene() {
  return (<>
    <ambientLight intensity={0.45} />
    <directionalLight position={[3, 3, 3]} intensity={1.3} color="#F5F0E8" />
    <directionalLight position={[-3, -2, -2]} intensity={0.5} color="#C8A96B" />
    <FragranceOrb />
    <Sparkles count={50} scale={5} size={2} speed={0.25} color="#C8A96B" opacity={0.55} />
  </>)
}

export default function Hero3D({ dpr = [1, 1.5] }: { dpr?: [number, number] }) {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={dpr} gl={{ antialias: true, alpha: true }}>
      <Suspense fallback={null}><Scene /></Suspense>
    </Canvas>
  )
}
