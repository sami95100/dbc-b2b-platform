'use client';

import { useSearchParams } from 'next/navigation';
import DBCLogo from '@/components/DBCLogo';
import { Mail, CheckCircle, ArrowRight } from 'lucide-react';

export default function ConfirmEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-dbc-dark-green via-emerald-800 to-dbc-light-green relative overflow-hidden">
      {/* Motifs de fond décoratifs */}
      <div className="absolute inset-0">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-white opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 -right-4 w-96 h-96 bg-dbc-bright-green opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-400 opacity-5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Carte de confirmation */}
          <div className="bg-white bg-opacity-20 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white border-opacity-30 text-center">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <DBCLogo size={64} />
            </div>

            {/* Icône de succès */}
            <div className="flex justify-center mb-6">
              <div className="bg-dbc-bright-green bg-opacity-20 rounded-full p-4">
                <Mail className="h-12 w-12 text-dbc-bright-green" />
              </div>
            </div>

            {/* Titre */}
            <h1 className="text-2xl font-bold text-white mb-4">
              Vérifiez votre email
            </h1>

            {/* Message */}
            <p className="text-emerald-100 mb-6">
              Nous avons envoyé un lien de confirmation à :
            </p>
            
            <div className="bg-dbc-dark-green bg-opacity-60 rounded-xl p-4 mb-6">
              <p className="text-dbc-bright-green font-semibold">{email}</p>
            </div>

            <p className="text-emerald-200 text-sm mb-8">
              Cliquez sur le lien dans l'email pour activer votre compte et accéder à la plateforme.
            </p>

            {/* Instructions */}
            <div className="space-y-3 mb-8">
              <div className="flex items-center space-x-3 text-emerald-100 text-sm">
                <CheckCircle className="h-4 w-4 text-dbc-bright-green flex-shrink-0" />
                <span>Vérifiez votre boîte de réception</span>
              </div>
              <div className="flex items-center space-x-3 text-emerald-100 text-sm">
                <CheckCircle className="h-4 w-4 text-dbc-bright-green flex-shrink-0" />
                <span>Regardez dans les spams si nécessaire</span>
              </div>
              <div className="flex items-center space-x-3 text-emerald-100 text-sm">
                <CheckCircle className="h-4 w-4 text-dbc-bright-green flex-shrink-0" />
                <span>Le lien expire dans 24h</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <a
                href="/login"
                className="w-full bg-gradient-to-r from-dbc-bright-green to-emerald-400 text-dbc-dark-green py-3 px-6 rounded-xl hover:from-emerald-300 hover:to-emerald-500 hover:text-white focus:ring-2 focus:ring-dbc-bright-green focus:ring-offset-2 transition-all duration-200 flex items-center justify-center space-x-2 font-bold shadow-2xl backdrop-blur-sm"
              >
                <span>Retour à la connexion</span>
                <ArrowRight className="h-5 w-5" />
              </a>

              <button
                onClick={() => window.location.reload()}
                className="w-full text-emerald-200 hover:text-white py-2 text-sm transition-colors"
              >
                Je n'ai pas reçu l'email
              </button>
            </div>
          </div>

          {/* Information supplémentaire */}
          <div className="mt-6 text-center">
            <p className="text-emerald-200 text-sm">
              Besoin d'aide ? Contactez notre support à{' '}
              <a href="mailto:support@dbc-electronics.com" className="text-dbc-bright-green hover:text-white underline">
                support@dbc-electronics.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 