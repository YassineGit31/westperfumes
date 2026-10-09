import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'À propos — DUPE PERFUMS', description: "L'histoire et la philosophie de DUPE PERFUMS." }
export default function About() {
  return (<div className="max-w-3xl mx-auto px-5 py-20">
    <p className="text-xs uppercase tracking-[.25em] text-gold">Dupe Perfums</p>
    <h1 className="h text-4xl md:text-5xl mt-3">Votre signature, révélée.</h1>
    <div className="mt-8 space-y-5 text-ivory/75 leading-relaxed">
      <p>DUPE PERFUMS est née d'une conviction simple : un parfum n'est pas un accessoire, c'est une signature. Nous sélectionnons avec exigence des fragrances qui traversent le temps, pour vous permettre de trouver celle qui vous ressemble — ou de l'offrir à quelqu'un qui le mérite.</p>
      <p>Basés en Algérie, nous livrons partout dans le pays avec paiement à la livraison, pour une expérience simple, rapide et sans risque. Chaque parfum de notre sélection est disponible en flacon complet ou en format découverte de 10ML, pour que vous puissiez essayer avant de vous engager.</p>
      <p>Notre équipe reste disponible pour vous conseiller sur le choix d'une fragrance, le suivi d'une commande ou toute autre question. Dupe Perfums, c'est l'élégance rendue accessible.</p>
    </div>
    <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-center">
      {['Livraison à domicile', 'Paiement à la livraison', 'Produits soigneusement sélectionnés', 'Service client disponible'].map(t => (
        <p key={t} className="border border-ivory/15 p-5"><span className="text-gold">✓</span> {t}</p>
      ))}
    </div>
  </div>)
}
