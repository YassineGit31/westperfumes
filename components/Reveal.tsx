'use client'
import { useReveal } from '@/lib/useReveal'
export default function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useReveal<HTMLDivElement>()
  return <div ref={ref} className={`reveal ${className}`}>{children}</div>
}
