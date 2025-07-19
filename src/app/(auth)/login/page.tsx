'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DBCLogo from '@/components/DBCLogo';
import { supabase } from '../../../lib/supabase';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Shield, TrendingDown, Award, MapPin, Package, Zap } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Vérifier que les champs sont remplis
      if (!email || !password) {
        setError('Veuillez remplir tous les champs');
        return;
      }

      // Vérifier le format email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setError('Veuillez entrer une adresse email valide');
        return;
      }

      setSuccess('Connexion en cours...');

      // Authentification avec Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (authError) {
        console.error('❌ Erreur Supabase Auth:', authError);
        
        // Messages d'erreur personnalisés selon le type d'erreur
        if (authError.message.includes('Invalid login credentials') || 
            authError.message.includes('invalid_credentials')) {
          setError('Email ou mot de passe incorrect. Vérifiez vos identifiants.');
          return;
        }
        if (authError.message.includes('Email not confirmed')) {
          setError('Veuillez confirmer votre email avant de vous connecter.');
          return;
        }
        if (authError.message.includes('Too many requests')) {
          setError('Trop de tentatives de connexion. Veuillez patienter quelques minutes.');
          return;
        }
        
        setError(`Erreur de connexion: ${authError.message}`);
        return;
      }

      if (!authData.user) {
        setError('Erreur inattendue lors de la connexion');
        return;
      }

      setSuccess('Vérification du profil...');

      // Vérifier que l'utilisateur a un profil et qu'il est actif
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, role, is_active, company_name, contact_name, email')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        console.error('❌ Erreur profil:', profileError);
        setError('Impossible de charger votre profil utilisateur. Contactez le support.');
        return;
      }

      if (!profile) {
        setError('Aucun profil trouvé pour cet utilisateur. Contactez le support.');
        return;
      }

      if (!profile.is_active) {
        // Rediriger vers la page d'attente de validation
        setSuccess('Redirection vers la page d\'attente...');
        setTimeout(() => {
          router.push('/pending-validation');
        }, 1000);
        return;
      }

      // Connexion réussie - redirection selon le rôle
      console.log('✅ Connexion réussie:', profile);
      setSuccess('Connexion réussie ! Redirection...');
      const redirectPath = profile.role === 'admin' ? '/admin' : '/catalog';
      setTimeout(() => {
        router.push(redirectPath);
      }, 1000);
      
    } catch (error: any) {
      console.error('❌ Erreur inattendue:', error);
      setError(error.message || 'Une erreur inattendue s\'est produite. Veuillez réessayer.');
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
        <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8">
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
            <div className="bg-white bg-opacity-20 backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8 border border-white border-opacity-30">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Connexion</h3>
                <p className="text-emerald-100">Accédez à votre espace professionnel</p>
              </div>

              {/* Affichage des erreurs */}
              {error && (
                <div className="mb-6 p-4 bg-red-500 bg-opacity-40 border-2 border-red-400 rounded-xl text-red-50 text-sm font-semibold shadow-lg backdrop-blur-sm animate-pulse">
                  <div className="flex items-center space-x-2">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-200" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>{error}</div>
                  </div>
                </div>
              )}

              {/* Affichage des succès */}
              {success && (
                <div className="mb-6 p-4 bg-green-500 bg-opacity-40 border-2 border-green-400 rounded-xl text-green-50 text-sm font-semibold shadow-lg backdrop-blur-sm">
                  <div className="flex items-center space-x-2">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-200" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>{success}</div>
                  </div>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
                    Email professionnel
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-4 bg-white bg-opacity-80 border-2 border-emerald-300 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-white focus:bg-opacity-90 transition-all duration-200 text-gray-900 placeholder-gray-500 font-medium text-base"
                      placeholder="votre@entreprise.com"
                      required
                      autoComplete="email"
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-white mb-2">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-4 pr-14 bg-white bg-opacity-80 border-2 border-emerald-300 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-white focus:bg-opacity-90 transition-all duration-200 text-gray-900 placeholder-gray-500 font-medium text-base"
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      onFocus={(e) => e.target.select()}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowPassword(!showPassword);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-800 active:text-gray-900 transition-colors p-1.5 rounded-lg hover:bg-gray-100 hover:bg-opacity-50 cursor-pointer z-20 touch-manipulation"
                      title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 text-dbc-bright-green bg-white bg-opacity-80 border-2 border-emerald-300 rounded focus:ring-dbc-bright-green focus:ring-2 focus:ring-offset-0 checked:bg-dbc-bright-green checked:border-dbc-bright-green cursor-pointer"
                      style={{ borderRadius: '4px' }}
                    />
                    <span className="ml-3 text-emerald-100">Se souvenir de moi</span>
                  </label>
                  <a href="#" className="text-dbc-bright-green hover:text-white font-medium transition-colors">
                    Mot de passe oublié ?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-dbc-bright-green to-emerald-400 text-dbc-dark-green py-4 px-6 rounded-xl hover:from-emerald-300 hover:to-emerald-500 hover:text-white focus:ring-2 focus:ring-dbc-bright-green focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-bold shadow-2xl backdrop-blur-sm text-lg"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-dbc-dark-green"></div>
                      <span>Connexion en cours...</span>
                    </>
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