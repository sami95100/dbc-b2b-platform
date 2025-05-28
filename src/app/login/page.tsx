'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DBCLogo from '../../components/DBCLogo';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulation de login pour demo
    setTimeout(() => {
      setIsLoading(false);
      router.push('/catalog');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="flex min-h-screen">
        {/* Left side - Branding DBC */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-dbc-dark-green to-dbc-light-green p-12 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10 flex flex-col justify-center max-w-md">
            <div className="mb-8">
              {/* Logo DBC stylisé */}
              <div className="flex items-center space-x-3 mb-6">
                <DBCLogo size={48} />
                <div>
                  <h1 className="text-3xl font-bold">DBC Electronics</h1>
                  <p className="text-sm text-green-100">B2B Platform</p>
                </div>
              </div>
              <p className="text-xl text-green-100">
                Votre plateforme de commande professionnelle
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold">1</span>
                </div>
                <div>
                  <h3 className="font-semibold">Catalogue complet</h3>
                  <p className="text-green-100 text-sm">Accédez à tous nos produits avec prix actualisés</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold">2</span>
                </div>
                <div>
                  <h3 className="font-semibold">Commande simplifiée</h3>
                  <p className="text-green-100 text-sm">Fini les échanges WhatsApp, commandez en quelques clics</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold">3</span>
                </div>
                <div>
                  <h3 className="font-semibold">Suivi en temps réel</h3>
                  <p className="text-green-100 text-sm">Suivez vos commandes et historique</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="lg:hidden mb-6">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <DBCLogo size={40} />
                  <h1 className="text-2xl font-bold text-dbc-dark-green">DBC Electronics</h1>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Connexion</h2>
              <p className="text-gray-600">Accédez à votre espace professionnel</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dbc-light-green focus:border-transparent transition-colors"
                    placeholder="votre@entreprise.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dbc-light-green focus:border-transparent transition-colors"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-dbc-light-green focus:ring-dbc-light-green border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600">Se souvenir de moi</span>
                </label>
                <a href="#" className="text-sm text-dbc-light-green hover:text-dbc-dark-green">
                  Mot de passe oublié ?
                </a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-dbc-light-green text-white py-3 px-4 rounded-lg hover:bg-green-600 focus:ring-2 focus:ring-dbc-light-green focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <span>Se connecter</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Pas encore de compte ?{' '}
                <a href="#" className="text-dbc-light-green hover:text-dbc-dark-green font-medium">
                  Contactez-nous
                </a>
              </p>
            </div>

            {/* Demo credentials */}
            <div className="mt-6 p-4 bg-dbc-bright-green/10 border border-dbc-bright-green/20 rounded-lg">
              <p className="text-sm text-dbc-dark-green font-medium mb-2">🚀 Mode Démo</p>
              <p className="text-xs text-dbc-dark-green/80">
                Utilisez n'importe quel email/mot de passe pour tester l'interface
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 