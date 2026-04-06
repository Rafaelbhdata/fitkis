import type { Metadata, Viewport } from 'next'
import { Outfit, DM_Sans } from 'next/font/google'
import { Providers } from '@/components/Providers'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'FitLife',
  description: 'Tu app personal de fitness y salud',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FitLife',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#050505',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${outfit.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-background">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
