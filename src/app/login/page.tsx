'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DBCLogo from '../../components/DBCLogo';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Shield, TrendingDown, Award, MapPin, Package, Zap } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // TODO: Intégrer l'authentification Supabase
      router.push('/catalog');
    } catch (error) {
      console.error('Erreur de connexion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dbc-dark-green via-emerald-800 to-dbc-light-green relative overflow-hidden">
      {/* Motifs de fond décoratifs */}
      <div className="absolute inset-0">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-white opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 -right-4 w-96 h-96 bg-dbc-bright-green opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-400 opacity-5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Section gauche - Branding et chiffres clés */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-16">
          {/* Logo et titre */}
          <div className="mb-12">
            <div className="flex items-center space-x-4 mb-6">
              <DBCLogo size={56} />
              <div>
                <h1 className="text-3xl font-bold text-white">DBC Electronics</h1>
                <p className="text-emerald-200 font-medium">Plateforme B2B Professionnelle</p>
              </div>
            </div>
            
            <h2 className="text-4xl xl:text-5xl font-bold text-white mb-6 leading-tight">
              La référence européenne du reconditionné B2B
            </h2>
            
            <p className="text-xl text-emerald-100 mb-8 leading-relaxed">
              Rejoignez la plateforme de confiance des professionnels de l'électronique. 
              Garanties, stock européen et prix brokeur USA/Japon.
            </p>
          </div>

          {/* Chiffres clés en grille */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6 border border-white border-opacity-20">
              <div className="flex items-center space-x-3 mb-3">
                <Package className="h-8 w-8 text-dbc-bright-green" />
                <span className="text-3xl font-bold text-white">15K+</span>
              </div>
              <p className="text-emerald-100 font-medium">Smartphones Apple & Samsung</p>
              <p className="text-emerald-200 text-sm">Stock permanent disponible</p>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6 border border-white border-opacity-20">
              <div className="flex items-center space-x-3 mb-3">
                <TrendingDown className="h-8 w-8 text-dbc-bright-green" />
                <span className="text-3xl font-bold text-white">2%</span>
              </div>
              <p className="text-emerald-100 font-medium">Taux de SAV</p>
              <p className="text-emerald-200 text-sm">Qualité garantie</p>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6 border border-white border-opacity-20">
              <div className="flex items-center space-x-3 mb-3">
                <Award className="h-8 w-8 text-dbc-bright-green" />
                <span className="text-3xl font-bold text-white">Prix</span>
              </div>
              <p className="text-emerald-100 font-medium">Brokeur USA/Japon</p>
              <p className="text-emerald-200 text-sm">Compétitivité internationale</p>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6 border border-white border-opacity-20">
              <div className="flex items-center space-x-3 mb-3">
                <MapPin className="h-8 w-8 text-dbc-bright-green" />
                <span className="text-3xl font-bold text-white">FR/EU</span>
              </div>
              <p className="text-emerald-100 font-medium">Entrepôts France & Europe</p>
              <p className="text-emerald-200 text-sm">Livraison rapide</p>
            </div>
          </div>

          {/* Avantages principaux */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-dbc-bright-green rounded-full"></div>
              <span className="text-emerald-100">Garantie et possibilités RMA incluses</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-dbc-bright-green rounded-full"></div>
              <span className="text-emerald-100">50% du stock en TVA sur marge</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-dbc-bright-green rounded-full"></div>
              <span className="text-emerald-100">Support technique dédié 24/7</span>
            </div>
          </div>
        </div>

        {/* Section droite - Formulaire de connexion */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Logo mobile */}
            <div className="lg:hidden text-center mb-8">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <DBCLogo size={48} />
                <div>
                  <h1 className="text-2xl font-bold text-white">DBC Electronics</h1>
                  <p className="text-emerald-200">Plateforme B2B</p>
                </div>
              </div>
            </div>

            {/* Carte de connexion */}
            <div className="bg-white bg-opacity-20 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white border-opacity-30">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Connexion</h3>
                <p className="text-emerald-100">Accédez à votre espace professionnel</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
                    Email professionnel
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-300" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white bg-opacity-20 border-2 border-white border-opacity-30 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-opacity-30 transition-all duration-200 text-white placeholder-emerald-200 backdrop-blur-sm"
                      placeholder="votre@entreprise.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-white mb-2">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-300" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-4 bg-white bg-opacity-20 border-2 border-white border-opacity-30 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-opacity-30 transition-all duration-200 text-white placeholder-emerald-200 backdrop-blur-sm"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-emerald-300 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-dbc-bright-green focus:ring-dbc-bright-green border-emerald-300 rounded bg-white bg-opacity-20"
                    />
                    <span className="ml-2 text-emerald-100">Se souvenir de moi</span>
                  </label>
                  <a href="#" className="text-dbc-bright-green hover:text-white font-medium transition-colors">
                    Mot de passe oublié ?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-dbc-bright-green to-emerald-400 text-dbc-dark-green py-4 px-6 rounded-xl hover:from-emerald-300 hover:to-emerald-500 hover:text-white focus:ring-2 focus:ring-dbc-bright-green focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-bold shadow-2xl backdrop-blur-sm"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-dbc-dark-green"></div>
                  ) : (
                    <>
                      <span>Accéder à la plateforme</span>
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </form>

              {/* Contact pour nouveaux clients */}
              <div className="mt-8 p-6 bg-dbc-dark-green bg-opacity-60 backdrop-blur-xl rounded-2xl text-white border border-white border-opacity-20">
                <div className="flex items-center space-x-3 mb-3">
                  <Shield className="h-6 w-6 text-dbc-bright-green" />
                  <h4 className="font-bold">Nouveau client ?</h4>
                </div>
                <p className="text-sm text-emerald-100 mb-4">
                  Obtenez vos accès professionnels et découvrez nos conditions préférentielles.
                </p>
                <div>
                  <a 
                    href="/signup" 
                    className="w-full block bg-dbc-bright-green text-dbc-dark-green px-6 py-3 rounded-xl text-center font-bold hover:bg-emerald-300 transition-colors"
                  >
                    S'inscrire maintenant
                  </a>
                </div>
              </div>
            </div>

            {/* Statistiques mobiles */}
            <div className="lg:hidden mt-8 grid grid-cols-2 gap-4 text-center">
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl font-bold text-white">15K+</div>
                <div className="text-emerald-200 text-sm">Smartphones</div>
              </div>
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl font-bold text-white">2%</div>
                <div className="text-emerald-200 text-sm">Taux SAV</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 