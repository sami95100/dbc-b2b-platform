'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DBCLogo from '@/components/DBCLogo';
import { CheckCircle, MessageCircle, Clock, Shield, Phone, Mail, ArrowRight, LogOut } from 'lucide-react';

// Composant pour gérer les paramètres de recherche
function SearchParamsWrapper({ onParamsLoaded }: { onParamsLoaded: (params: any) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Récupérer les informations utilisateur depuis les paramètres URL
    const email = searchParams.get('email');
    const company = searchParams.get('company');
    const contact = searchParams.get('contact');
    
    if (email && company && contact) {
      onParamsLoaded({ email, company, contact });
    }
  }, [searchParams, onParamsLoaded]);

  return null;
}

// Loading component
function LoadingFallback() {
  return (
    <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white border-opacity-20">
      <div className="animate-pulse">
        <div className="h-4 bg-white bg-opacity-20 rounded mb-2"></div>
        <div className="h-4 bg-white bg-opacity-20 rounded mb-2"></div>
        <div className="h-4 bg-white bg-opacity-20 rounded"></div>
      </div>
    </div>
  );
}

export default function PendingValidationPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<any>(null);

  const accountManagerPhone = "0768644427";
  const accountManagerWhatsApp = `https://wa.me/33${accountManagerPhone.substring(1)}`;

  const handleParamsLoaded = (params: any) => {
    setUserInfo(params);
  };

  const handleWhatsAppContact = () => {
    const message = encodeURIComponent(
      `Bonjour ! Je viens de créer un compte B2B sur la plateforme DBC Electronics.\n\n` +
      `Informations de mon entreprise :\n` +
      `• Société : ${userInfo?.company || 'Non spécifié'}\n` +
      `• Contact : ${userInfo?.contact || 'Non spécifié'}\n` +
      `• Email : ${userInfo?.email || 'Non spécifié'}\n\n` +
      `Je souhaiterais valider mon inscription et commencer l'onboarding pour accéder au catalogue. Merci !`
    );
    
    window.open(`${accountManagerWhatsApp}?text=${message}`, '_blank');
  };

  const handleLogout = () => {
    // Simple redirection vers la page de login - la déconnexion sera gérée là-bas
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dbc-dark-green via-emerald-800 to-dbc-light-green relative overflow-hidden">
      {/* Motifs de fond décoratifs */}
      <div className="absolute inset-0">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-white opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 -right-4 w-96 h-96 bg-dbc-bright-green opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-400 opacity-5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Logo et titre principal */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-4 mb-6">
              <DBCLogo size={64} />
              <div>
                <h1 className="text-3xl font-bold text-white">DBC Electronics</h1>
                <p className="text-emerald-200 font-medium">Plateforme B2B Professionnelle</p>
              </div>
              </div>
            </div>

          {/* Carte principale */}
          <div className="bg-white bg-opacity-20 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white border-opacity-30">
            
            {/* Suspense wrapper pour les paramètres de recherche */}
            <Suspense fallback={null}>
              <SearchParamsWrapper onParamsLoaded={handleParamsLoaded} />
            </Suspense>

            {/* Bouton de déconnexion */}
            <div className="flex justify-end mb-4">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-emerald-200 hover:text-white transition-colors text-sm"
              >
                <LogOut className="h-4 w-4" />
                <span>Se déconnecter</span>
              </button>
            </div>

            {/* Statut d'inscription */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-yellow-500 bg-opacity-20 rounded-full flex items-center justify-center">
                  <Clock className="h-8 w-8 text-yellow-300" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Compte en attente de validation</h2>
              <p className="text-emerald-100 text-lg">
                Votre inscription est en cours de traitement par notre équipe
              </p>
            </div>

            {/* Informations utilisateur */}
            <Suspense fallback={<LoadingFallback />}>
              {userInfo && (
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white border-opacity-20">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-dbc-bright-green" />
                    Votre demande d'accès
                  </h3>
                  <div className="space-y-2 text-emerald-100">
                    <p><span className="font-medium">Société :</span> {userInfo.company}</p>
                    <p><span className="font-medium">Contact :</span> {userInfo.contact}</p>
                    <p><span className="font-medium">Email :</span> {userInfo.email}</p>
                  </div>
                </div>
              )}
            </Suspense>

            {/* Étapes du processus */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Processus de validation :</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-dbc-bright-green rounded-full flex items-center justify-center mt-1">
                    <span className="text-dbc-dark-green text-sm font-bold">✓</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Inscription soumise</p>
                    <p className="text-emerald-200 text-sm">Vos informations ont été transmises</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center mt-1">
                    <Clock className="h-3 w-3 text-yellow-800" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Vérification en cours</p>
                    <p className="text-emerald-200 text-sm">Notre équipe examine votre profil professionnel</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-white bg-opacity-30 rounded-full flex items-center justify-center mt-1">
                    <span className="text-white text-sm font-bold">3</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Activation du compte</p>
                    <p className="text-emerald-200 text-sm">Accès complet à la plateforme et au catalogue</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Call-to-action WhatsApp */}
            <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-2xl p-6 mb-6">
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <MessageCircle className="h-8 w-8 text-white mr-2" />
                  <h3 className="text-xl font-bold text-white">Accélérez le processus !</h3>
                </div>
                <p className="text-green-100 mb-4">
                  Contactez notre Account Manager pour obtenir une validation prioritaire
                </p>
                <button
                  onClick={handleWhatsAppContact}
                  className="w-full bg-white text-green-600 py-4 px-6 rounded-xl hover:bg-green-50 focus:ring-2 focus:ring-white focus:ring-offset-2 transition-all duration-200 flex items-center justify-center space-x-2 font-bold shadow-lg"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>Contacter via WhatsApp</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>

            {/* Informations de contact alternatif */}
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6 border border-white border-opacity-20">
              <h4 className="text-lg font-semibold text-white mb-3">Autres moyens de contact</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-emerald-300" />
                  <div>
                    <p className="text-white font-medium">Téléphone</p>
                    <a href={`tel:${accountManagerPhone}`} className="text-dbc-bright-green hover:text-white transition-colors">
                      {accountManagerPhone}
                    </a>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-emerald-300" />
                  <div>
                    <p className="text-white font-medium">Email professionnel</p>
                    <a href="mailto:contact@dbcstore.fr" className="text-dbc-bright-green hover:text-white transition-colors">
                      contact@dbcstore.fr
              </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Note importante */}
            <div className="mt-8 text-center">
              <p className="text-emerald-100 text-sm">
                ⏱️ Délai habituel de validation : 24-48h ouvrées<br/>
                📧 Vous recevrez un email dès l'activation de votre compte
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 