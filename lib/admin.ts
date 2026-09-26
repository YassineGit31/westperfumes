export const STATUS_COLOR: Record<string, string> = {
  nouvelle: 'bg-blue-500', a_confirmer: 'bg-amber-500', confirmee: 'bg-emerald-600', en_preparation: 'bg-purple-500',
  expediee: 'bg-cyan-600', livree: 'bg-green-700', annulee: 'bg-red-600', refusee: 'bg-red-800',
}
export const ORDER_ACTIONS: [string, string][] = [
  ['confirmee', 'Confirmer'], ['en_preparation', 'Préparer'], ['expediee', 'Expédier'],
  ['livree', 'Livrée'], ['annulee', 'Annuler'], ['refusee', 'Refuser'],
]
export function waLink(phone?: string) {
  if (!phone) return '#'
  return `https://wa.me/213${phone.replace(/^0/, '')}`
}
export function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
export function startOfWeek(d = new Date()) { const x = startOfDay(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); return x }
export function startOfMonth(d = new Date()) { const x = startOfDay(d); x.setDate(1); return x }
export function lastNDays(n: number) {
  return Array.from({ length: n }, (_, i) => { const d = startOfDay(); d.setDate(d.getDate() - (n - 1 - i)); return d })
}
