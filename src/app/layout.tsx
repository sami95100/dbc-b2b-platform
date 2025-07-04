import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '../lib/auth-context'
import PWAInstallPrompt from '../components/PWAInstallPrompt'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
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

export const viewport: Viewport = {
  themeColor: '#034638',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <head>
        {/* Viewport pour comportement app native sur mobile */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        
        {/* PWA Meta Tags */}
        <meta name="application-name" content="DBC B2B" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="DBC B2B" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#034638" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#034638" />

        {/* Apple Touch Icons - Nouvelles icônes DBC */}
        <link rel="apple-touch-icon" href="/icons/icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180x180.png" />

        {/* General Icons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/icons/icon-512x512.png" color="#034638" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <PWAInstallPrompt />
        </AuthProvider>
        
        {/* Script pour optimiser l'expérience tactile */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Optimisations pour l'expérience tactile mobile
              (function() {
                // Empêcher les scroll indésirables lors des mises à jour React
                let scrollLocked = false;
                let savedScrollY = 0;
                
                // Bloquer temporairement le scroll lors des mises à jour
                window.lockScroll = function() {
                  if (!scrollLocked) {
                    savedScrollY = window.scrollY;
                    scrollLocked = true;
                    document.body.style.position = 'fixed';
                    document.body.style.top = '-' + savedScrollY + 'px';
                    document.body.style.width = '100%';
                  }
                };
                
                window.unlockScroll = function() {
                  if (scrollLocked) {
                    scrollLocked = false;
                    document.body.style.position = '';
                    document.body.style.top = '';
                    document.body.style.width = '';
                    window.scrollTo(0, savedScrollY);
                  }
                };
                
                // Détecter les mises à jour du DOM et préserver la position
                let isUpdating = false;
                const preservePosition = function() {
                  if (!isUpdating) {
                    isUpdating = true;
                    const currentY = window.scrollY;
                    
                    requestAnimationFrame(() => {
                      if (Math.abs(window.scrollY - currentY) > 10) {
                        window.scrollTo(0, currentY);
                      }
                      isUpdating = false;
                    });
                  }
                };
                
                // Observer uniquement les changements critiques
                if (typeof MutationObserver !== 'undefined') {
                  const observer = new MutationObserver(function(mutations) {
                    for (let mutation of mutations) {
                      if (mutation.type === 'childList' && 
                          mutation.target.className && 
                          mutation.target.className.includes && 
                          mutation.target.className.includes('product-card')) {
                        preservePosition();
                        break;
                      }
                    }
                  });
                  
                  document.addEventListener('DOMContentLoaded', function() {
                    const container = document.querySelector('[data-products-container]');
                    if (container) {
                      observer.observe(container, {
                        childList: true,
                        subtree: true,
                        attributes: false,
                        characterData: false
                      });
                    }
                  });
                }
                
                // Forcer l'affichage du clavier numérique sur iOS
                document.addEventListener('click', function(e) {
                  if (e.target.type === 'number' || 
                      e.target.inputMode === 'numeric' || 
                      e.target.inputMode === 'decimal') {
                    e.preventDefault();
                    e.target.focus();
                    
                    // Forcer le clavier sur iOS
                    setTimeout(() => {
                      e.target.click();
                      e.target.focus();
                      if (e.target.select) {
                        e.target.select();
                      }
                    }, 100);
                  }
                }, true);
                
                // Optimiser les performances tactiles
                let touching = false;
                document.addEventListener('touchstart', function(e) {
                  touching = true;
                  document.body.classList.add('touching');
                }, { passive: true });
                
                document.addEventListener('touchend', function(e) {
                  setTimeout(() => {
                    touching = false;
                    document.body.classList.remove('touching');
                  }, 300);
                }, { passive: true });
                
                // Améliorer la réactivité des clics
                document.addEventListener('touchstart', function(e) {
                  const target = e.target;
                  if (target.classList && target.classList.contains && 
                      (target.classList.contains('product-card') || 
                       target.closest('.product-card'))) {
                    // Ajouter feedback visuel immédiat
                    const card = target.closest('.product-card') || target;
                    card.style.transform = 'scale(0.98)';
                    
                    setTimeout(() => {
                      card.style.transform = '';
                    }, 150);
                  }
                }, { passive: true });
              })();
            `,
          }}
        />
      </body>
    </html>
  )
} 