import './globals.css'
import type { Metadata } from 'next'
import { Montserrat, Inter } from 'next/font/google'
import { CartProvider } from '@/lib/cart'
import { FavoritesProvider } from '@/lib/favorites'
import { WilayaProvider } from '@/lib/wilaya'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
const serif = Montserrat({ subsets:['latin'], weight:['400','500','600','700'], variable:'--font-serif' })
const sans = Inter({ subsets:['latin'], variable:'--font-sans' })
export const metadata: Metadata = { title:'DUPE PERFUMS — More than a scent', description:'Parfums avec livraison partout en Algérie et paiement à la livraison.' }
export default function RootLayout({ children }:{ children:React.ReactNode }) {
  return (<html lang="fr"><body className={`${serif.variable} ${sans.variable}`}><WilayaProvider><CartProvider><FavoritesProvider><Navbar/><main className="min-h-screen pb-20 md:pb-0">{children}</main><Footer/></FavoritesProvider></CartProvider></WilayaProvider></body></html>)
}
