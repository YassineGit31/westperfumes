import './globals.css'
import type { Metadata } from 'next'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import { CartProvider } from '@/lib/cart'
import { FavoritesProvider } from '@/lib/favorites'
import { WilayaProvider } from '@/lib/wilaya'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
const serif = Cormorant_Garamond({ subsets:['latin'], weight:['400','500','600'], variable:'--font-serif' })
const sans = Inter({ subsets:['latin'], variable:'--font-sans' })
export const metadata: Metadata = { title:'WEST PERFUMES — Your signature. Your fragrance.', description:'Parfums avec livraison partout en Algérie et paiement à la livraison.' }
export default function RootLayout({ children }:{ children:React.ReactNode }) {
  return (<html lang="fr"><body className={`${serif.variable} ${sans.variable}`}><WilayaProvider><CartProvider><FavoritesProvider><Navbar/><main className="min-h-screen pb-20 md:pb-0">{children}</main><Footer/></FavoritesProvider></CartProvider></WilayaProvider></body></html>)
}
