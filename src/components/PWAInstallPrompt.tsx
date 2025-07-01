'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Vérifier si l'app est déjà installée
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Détecter iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Gestionnaire pour l'événement beforeinstallprompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Attendre un peu avant de montrer le prompt (pour ne pas être intrusif)
      setTimeout(() => {
        setShowPrompt(true);
      }, 10000); // 10 secondes après le chargement
    };

    // Gestionnaire pour l'installation réussie
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    
    setDeferredPrompt(null);
  };

  const handleIOSInstall = () => {
    setShowIOSInstructions(true);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Ne rien afficher si l'app est installée ou si l'utilisateur a dismissé
  if (isInstalled || localStorage.getItem('pwa-install-dismissed')) {
    return null;
  }

  if (showIOSInstructions && isIOS) {
    return (
      <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm z-50">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center">
            <Smartphone className="h-5 w-5 mr-2 text-blue-600" />
            Installer l'app
          </h3>
          <button
            onClick={() => setShowIOSInstructions(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="text-sm text-gray-600 space-y-2">
          <p>Pour installer DBC B2B sur votre iPhone/iPad :</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Appuyez sur le bouton Partager <span className="inline-block">📤</span></li>
            <li>Sélectionnez "Sur l'écran d'accueil"</li>
            <li>Appuyez sur "Ajouter"</li>
          </ol>
        </div>
      </div>
    );
  }

  if (showPrompt && (deferredPrompt || isIOS)) {
    return (
      <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm z-50">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center">
            <Download className="h-5 w-5 mr-2 text-blue-600" />
            Installer DBC B2B
          </h3>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Accédez rapidement au catalogue et à vos commandes depuis votre écran d'accueil !
        </p>
        
        <div className="flex gap-2">
          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Monitor className="h-4 w-4 mr-1" />
              Installer
            </button>
          )}
          
          {isIOS && (
            <button
              onClick={handleIOSInstall}
              className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Smartphone className="h-4 w-4 mr-1" />
              Guide iOS
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
} 