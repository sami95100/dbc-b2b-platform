import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '../lib/auth-context'
import PWAInstallPrompt from '../components/PWAInstallPrompt'
import ClientOnly from '../lib/client-only'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'DBC B2B Platform',
  description: 'Plateforme B2B pour la gestion des commandes DBC',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DBC B2B',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'DBC B2B Platform',
    title: 'DBC B2B Platform',
    description: 'Plateforme B2B pour la gestion des commandes DBC',
  },
  twitter: {
    card: 'summary',
    title: 'DBC B2B Platform',
    description: 'Plateforme B2B pour la gestion des commandes DBC',
  },
}

export function generateViewport() {
  return {
    themeColor: '#10B981',
    width: 'device-width',
    initialScale: 1,
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="DBC B2B" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="DBC B2B" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#10B981" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#10B981" />

        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />

        {/* General Icons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/icons/icon-512x512.png" color="#10B981" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <ClientOnly>
            <PWAInstallPrompt />
          </ClientOnly>
        </AuthProvider>
      </body>
    </html>
  )
} 