import { STATUS_COLOR } from '@/lib/admin'
import { STATUS } from '@/lib/format'

export function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (<div className="bg-coal border border-ivory/10 p-4">
    <p className="text-[11px] uppercase tracking-widest text-ivory/50">{label}</p>
    <p className="h text-2xl mt-1">{value}</p>
    {sub && <p className="text-xs text-ivory/40 mt-1">{sub}</p>}
  </div>)
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-block px-2 py-1 text-[11px] uppercase tracking-wide text-white ${STATUS_COLOR[status] || 'bg-ivory/20'}`}>{STATUS[status] || status}</span>
}

export function Card({ title, action, children }: { title?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (<div className="bg-coal border border-ivory/10">
    {title && <div className="flex items-center justify-between px-5 py-4 border-b border-ivory/10"><h2 className="h text-lg">{title}</h2>{action}</div>}
    <div className="p-5">{children}</div>
  </div>)
}

export function EmptyState({ text }: { text: string }) {
  return <p className="text-center text-ivory/50 py-12 text-sm">{text}</p>
}
