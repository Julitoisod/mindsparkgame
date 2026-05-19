import type { Metadata, Viewport } from 'next'
import { Inter, Orbitron } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
})

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  display: 'swap',
  variable: '--font-orbitron',
})

export const metadata: Metadata = {
  title: {
    default: 'MindSpark Game',
    template: '%s | MindSpark',
  },
  description: 'A 2D/3D anime-inspired browser RPG built with Next.js, Three.js and MySQL.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MindSpark',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#00441b',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${orbitron.variable}`}>
      <body className="bg-dark-900 text-primary-100 font-body antialiased min-h-screen">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0d2b18',
              color:      '#f7fcf5',
              border:     '1px solid rgba(199,233,192,0.18)',
              borderRadius: '12px',
              fontSize:   '14px',
            },
            success: { iconTheme: { primary: '#74c476', secondary: '#041008' } },
            error:   { iconTheme: { primary: '#c7e9c0', secondary: '#041008' } },
          }}
        />
      </body>
    </html>
  )
}
