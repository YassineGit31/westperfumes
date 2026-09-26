import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'FAQ — WEST PERFUMES', description: 'Questions fréquentes sur la livraison, le paiement et nos parfums.' }
const faqs: [string, string][] = [
  ['Livrez-vous dans toute l\u2019Algérie ?', 'Oui, nous livrons dans les 58 wilayas. Le délai estimé est de 2 à 5 jours ouvrés selon votre wilaya.'],
  ['Comment fonctionne le paiement à la livraison ?', 'Vous réglez en espèces directement au livreur au moment de la réception de votre commande, sans rien payer en ligne.'],
  ['Quelle est la différence entre le Full Size et le 10ML ?', 'Le Full Size est le flacon complet (généralement 100ML). Le format 10ML est un flacon découverte qui vous permet de tester un parfum avant d\u2019investir dans le flacon complet.'],
  ['Puis-je suivre ma commande ?', 'Oui, rendez-vous sur la page « Suivi de commande » et renseignez votre numéro de commande ainsi que votre numéro de téléphone.'],
  ['Puis-je modifier ou annuler ma commande ?', 'Contactez-nous rapidement par WhatsApp ou téléphone après votre commande, tant qu\u2019elle n\u2019a pas encore été expédiée.'],
  ['Les parfums sont-ils authentiques ?', 'Oui, tous nos parfums sont soigneusement sélectionnés pour garantir leur authenticité.'],
  ['Comment utiliser un code promo ?', 'Entrez votre code lors de l\u2019étape de commande, dans le champ « Code promo ». La réduction sera appliquée automatiquement à la confirmation.'],
]
export default function FAQ() {
  return (<div className="max-w-2xl mx-auto px-5 py-20">
    <h1 className="h text-4xl mb-10">Questions fréquentes</h1>
    <div className="divide-y divide-ivory/10 border-t border-b border-ivory/10">
      {faqs.map(([q, a]) => (<details key={q} className="group py-5">
        <summary className="cursor-pointer list-none flex justify-between items-center gap-4 text-sm md:text-base">{q}<span className="text-gold shrink-0 group-open:rotate-45 transition">+</span></summary>
        <p className="mt-3 text-ivory/70 text-sm leading-relaxed">{a}</p>
      </details>))}
    </div>
  </div>)
}
