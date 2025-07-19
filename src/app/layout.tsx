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
  themeColor: '#10B981',
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
          <PWAInstallPrompt />
        </AuthProvider>
        
        {/* Script pour optimiser l'expérience tactile et préserver le scroll */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Optimisations pour l'expérience tactile mobile et préservation du scroll
              (function() {
                let isPreservingScroll = false;
                let preservedScrollY = 0;
                
                // Fonction globale pour préserver le scroll (appelée par React)
                window.preserveScrollPosition = function() {
                  if (!isPreservingScroll) {
                    preservedScrollY = window.scrollY;
                    isPreservingScroll = true;
                  }
                };
                
                // Fonction globale pour restaurer le scroll (appelée par React)
                window.restoreScrollPosition = function() {
                  if (isPreservingScroll) {
                    isPreservingScroll = false;
                    
                    // Utiliser requestAnimationFrame pour s'assurer que le DOM est mis à jour
                    requestAnimationFrame(() => {
                      // Vérifier si le scroll a changé de manière significative
                      if (Math.abs(window.scrollY - preservedScrollY) > 10) {
                        window.scrollTo(0, preservedScrollY);
                      }
                    });
                  }
                };
                
                // Observer les changements spécifiquement dans les conteneurs de produits
                if (typeof MutationObserver !== 'undefined') {
                  const observer = new MutationObserver(function(mutations) {
                    let shouldPreserveScroll = false;
                    
                    for (let mutation of mutations) {
                      // Détecter les changements dans les product-cards ou quantity-controls
                      if (mutation.type === 'childList' || mutation.type === 'attributes') {
                        const target = mutation.target;
                        
                        if (target.nodeType === 1) { // Element node
                          const element = target;
                          
                          // Vérifier si c'est lié aux produits ou aux quantités
                          if (element.classList && (
                            element.classList.contains('product-card') ||
                            element.classList.contains('quantity-controls') ||
                            element.closest('.product-card') ||
                            element.closest('.quantity-controls')
                          )) {
                            shouldPreserveScroll = true;
                            break;
                          }
                        }
                      }
                    }
                    
                    // Si on détecte des changements de produits, préserver le scroll
                    if (shouldPreserveScroll && !isPreservingScroll) {
                      const currentY = window.scrollY;
                      
                      // Utiliser un léger délai pour permettre à React de finir ses mises à jour
                      setTimeout(() => {
                        if (Math.abs(window.scrollY - currentY) > 10) {
                          window.scrollTo(0, currentY);
                        }
                      }, 50);
                    }
                  });
                  
                  // Démarrer l'observation quand le DOM est prêt
                  function startObserving() {
                    const containers = document.querySelectorAll('[data-products-container], .products-grid');
                    containers.forEach(container => {
                      observer.observe(container, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        attributeFilter: ['class', 'style']
                      });
                    });
                  }
                  
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', startObserving);
                  } else {
                    startObserving();
                  }
                  
                  // Re-observer après navigation SPA
                  let lastUrl = location.href;
                  new MutationObserver(() => {
                    const url = location.href;
                    if (url !== lastUrl) {
                      lastUrl = url;
                      setTimeout(startObserving, 100);
                    }
                  }).observe(document, { subtree: true, childList: true });
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