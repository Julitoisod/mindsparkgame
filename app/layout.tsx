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
    default: 'MindSpark Math',
    template: '%s | MindSpark Math',
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
  themeColor: '#22326f',
}

/**
 * Runs before anything paints: inside the student APK the teacher landing page
 * must never be seen, not even for a frame. The React-side redirect in
 * StudentAppRedirect only fires after hydration, which is why the panel kept
 * seeing the teacher page flash before the login.
 */
const APP_REDIRECT = `try{
  var c = window.Capacitor;
  if (c && c.isNativePlatform && c.isNativePlatform() && location.pathname === '/') {
    location.replace('/login');
  }
}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${orbitron.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APP_REDIRECT }} />
      </head>
      <body className="bg-dark-900 text-primary-100 font-body antialiased min-h-screen">
        {children}
        {/* MindSpark palette — the old dark-green toast was the "green" the
            panel kept seeing after sign-in and character purchases (Nov 2026). */}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#22326f',
              color:      '#F4F2FF',
              border:     '1px solid rgba(155,131,245,0.55)',
              borderRadius: '14px',
              fontSize:   '14px',
              fontWeight: 600,
              boxShadow:  '0 10px 30px rgba(34,50,111,0.35)',
            },
            success: { iconTheme: { primary: '#9B83F5', secondary: '#F4F2FF' } },
            error:   { iconTheme: { primary: '#F472B6', secondary: '#F4F2FF' } },
          }}
        />
      </body>
    </html>
  )
}
