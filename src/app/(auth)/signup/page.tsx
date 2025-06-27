'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DBCLogo from '@/components/DBCLogo';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Shield, Award, Package, User, Building, Phone, MapPin } from 'lucide-react';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    company_name: '',
    contact_name: '',
    phone: '',
    address: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validation des champs obligatoires
    if (!formData.email.trim()) newErrors.email = 'Email requis';
    if (!formData.password) newErrors.password = 'Mot de passe requis';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Confirmation requise';
    if (!formData.company_name.trim()) newErrors.company_name = 'Nom de société requis';
    if (!formData.contact_name.trim()) newErrors.contact_name = 'Nom du contact requis';
    if (!formData.phone.trim()) newErrors.phone = 'Téléphone requis';

    // Validation format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Format email invalide';
    }

    // Validation mot de passe
    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Minimum 8 caractères';
    }

    // Validation confirmation mot de passe
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    // Validation téléphone (format basique)
    if (formData.phone && formData.phone.replace(/[\s\-\.\+\(\)]/g, '').length < 10) {
      newErrors.phone = 'Numéro de téléphone invalide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'inscription');
      }

      // Afficher le message de succès
      setSuccess(true);
      
      // Redirection vers la page d'onboarding avec les informations utilisateur
      setTimeout(() => {
        router.push('/pending-validation');
      }, 2000);
      
    } catch (error: any) {
      console.error('Erreur d\'inscription:', error);
      setErrors({ general: error.message || 'Erreur lors de l\'inscription' });
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
        {/* Section gauche - Branding */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-16">
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <DBCLogo size={56} />
              <div>
                <h1 className="text-3xl font-bold text-white">DBC Electronics</h1>
                <p className="text-emerald-200 font-medium">Plateforme B2B Professionnelle</p>
              </div>
            </div>
            
            <h2 className="text-4xl xl:text-5xl font-bold text-white mb-6 leading-tight">
              Rejoignez les leaders du reconditionné
            </h2>
            
            <p className="text-xl text-emerald-100 mb-8 leading-relaxed">
              Créez votre compte professionnel et accédez à notre catalogue exclusif.
            </p>
          </div>

          {/* Avantages */}
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="bg-dbc-bright-green bg-opacity-20 rounded-xl p-3">
                <Shield className="h-6 w-6 text-dbc-bright-green" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Accès immédiat</h3>
                <p className="text-emerald-100 text-sm">Catalogue complet avec prix en temps réel</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-dbc-bright-green bg-opacity-20 rounded-xl p-3">
                <Award className="h-6 w-6 text-dbc-bright-green" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Conditions préférentielles</h3>
                <p className="text-emerald-100 text-sm">Prix professionnels et support dédié</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-dbc-bright-green bg-opacity-20 rounded-xl p-3">
                <Package className="h-6 w-6 text-dbc-bright-green" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Gestion simple</h3>
                <p className="text-emerald-100 text-sm">Interface intuitive pour vos commandes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section droite - Formulaire */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-8">
          <div className="w-full max-w-md">
            {/* Logo mobile */}
            <div className="lg:hidden text-center mb-6">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <DBCLogo size={48} />
                <div>
                  <h1 className="text-2xl font-bold text-white">DBC Electronics</h1>
                  <p className="text-emerald-200">Plateforme B2B</p>
                </div>
              </div>
            </div>

            {/* Carte d'inscription avec style glassmorphisme */}
            <div className="bg-white bg-opacity-20 backdrop-blur-xl rounded-3xl shadow-2xl p-6 lg:p-8 border border-white border-opacity-30">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Créer un compte B2B</h3>
                <p className="text-emerald-100">Accédez à notre plateforme professionnelle</p>
              </div>

              {errors.general && (
                <div className="mb-6 p-4 bg-red-500 bg-opacity-20 border border-red-400 rounded-xl text-red-300 text-sm">
                  {errors.general}
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 bg-green-500 bg-opacity-20 border border-green-400 rounded-xl text-green-300 backdrop-blur-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-green-300 font-medium">Inscription enregistrée avec succès !</p>
                      <p className="text-green-200 text-sm">Redirection vers la page d'attente de validation...</p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Email professionnel *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-300" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full pl-12 pr-4 py-3 bg-white bg-opacity-20 border-2 border-white border-opacity-30 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-opacity-30 transition-all duration-200 text-white placeholder-emerald-200 backdrop-blur-sm ${
                        errors.email ? 'border-red-400 border-opacity-60' : ''
                      }`}
                      placeholder="contact@entreprise.com"
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-sm text-red-300">{errors.email}</p>}
                </div>

                {/* Société */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Nom de la société *
                  </label>
                  <div className="relative">
                    <Building className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-300" />
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => handleInputChange('company_name', e.target.value)}
                      className={`w-full pl-12 pr-4 py-3 bg-white bg-opacity-20 border-2 border-white border-opacity-30 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-opacity-30 transition-all duration-200 text-white placeholder-emerald-200 backdrop-blur-sm ${
                        errors.company_name ? 'border-red-400 border-opacity-60' : ''
                      }`}
                      placeholder="Ma Société SARL"
                    />
                  </div>
                  {errors.company_name && <p className="mt-1 text-sm text-red-300">{errors.company_name}</p>}
                </div>

                {/* Contact */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Nom du contact *
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-300" />
                    <input
                      type="text"
                      value={formData.contact_name}
                      onChange={(e) => handleInputChange('contact_name', e.target.value)}
                      className={`w-full pl-12 pr-4 py-3 bg-white bg-opacity-20 border-2 border-white border-opacity-30 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-opacity-30 transition-all duration-200 text-white placeholder-emerald-200 backdrop-blur-sm ${
                        errors.contact_name ? 'border-red-400 border-opacity-60' : ''
                      }`}
                      placeholder="Jean Dupont"
                    />
                  </div>
                  {errors.contact_name && <p className="mt-1 text-sm text-red-300">{errors.contact_name}</p>}
                </div>

                {/* Téléphone */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Téléphone *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-300" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={`w-full pl-12 pr-4 py-3 bg-white bg-opacity-20 border-2 border-white border-opacity-30 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-opacity-30 transition-all duration-200 text-white placeholder-emerald-200 backdrop-blur-sm ${
                        errors.phone ? 'border-red-400 border-opacity-60' : ''
                      }`}
                      placeholder="+33 1 23 45 67 89"
                    />
                  </div>
                  {errors.phone && <p className="mt-1 text-sm text-red-300">{errors.phone}</p>}
                </div>

                {/* Adresse */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Adresse (optionnel)
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 h-5 w-5 text-emerald-300" />
                    <textarea
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      rows={2}
                      className="w-full pl-12 pr-4 py-3 bg-white bg-opacity-20 border-2 border-white border-opacity-30 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-opacity-30 transition-all duration-200 text-white placeholder-emerald-200 backdrop-blur-sm resize-none"
                      placeholder="123 Rue de la Paix, 75001 Paris"
                    />
                  </div>
                </div>

                {/* Mot de passe */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Mot de passe *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-300" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={`w-full pl-12 pr-12 py-3 bg-white bg-opacity-20 border-2 border-white border-opacity-30 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-opacity-30 transition-all duration-200 text-white placeholder-emerald-200 backdrop-blur-sm ${
                        errors.password ? 'border-red-400 border-opacity-60' : ''
                      }`}
                      placeholder="Minimum 8 caractères"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-emerald-300 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-sm text-red-300">{errors.password}</p>}
                </div>

                {/* Confirmation mot de passe */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Confirmer le mot de passe *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-300" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className={`w-full pl-12 pr-12 py-3 bg-white bg-opacity-20 border-2 border-white border-opacity-30 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-opacity-30 transition-all duration-200 text-white placeholder-emerald-200 backdrop-blur-sm ${
                        errors.confirmPassword ? 'border-red-400 border-opacity-60' : ''
                      }`}
                      placeholder="Répétez le mot de passe"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-emerald-300 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="mt-1 text-sm text-red-300">{errors.confirmPassword}</p>}
                </div>

                {/* Bouton de soumission */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-dbc-bright-green to-emerald-400 text-dbc-dark-green py-4 px-6 rounded-xl hover:from-emerald-300 hover:to-emerald-500 hover:text-white focus:ring-2 focus:ring-dbc-bright-green focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-bold shadow-2xl backdrop-blur-sm"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-dbc-dark-green"></div>
                  ) : (
                    <>
                      <span>Créer mon compte</span>
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </form>

              {/* Lien vers connexion */}
              <div className="mt-6 text-center">
                <p className="text-emerald-100">
                  Déjà un compte ?{' '}
                  <button
                    onClick={() => router.push('/login')}
                    className="text-dbc-bright-green font-semibold hover:text-white transition-colors"
                  >
                    Se connecter
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 