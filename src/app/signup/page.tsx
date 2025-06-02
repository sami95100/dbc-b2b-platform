'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DBCLogo from '../../components/DBCLogo';
import { supabase } from '../../lib/supabase';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Shield, Award, Package, User, Building, Phone, Globe, MapPin, CreditCard } from 'lucide-react';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: '',
    company_name: '',
    siret_number: '',
    vat_number: '',
    billing_street: '',
    billing_city: '',
    billing_postal_code: '',
    billing_country: 'France',
    shipping_street: '',
    shipping_city: '',
    shipping_postal_code: '',
    shipping_country: 'France',
    use_billing_as_shipping: true,
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Si la case "use_billing_as_shipping" est cochée, copier les données de facturation vers livraison
      if (field === 'use_billing_as_shipping' && value === true) {
        newData.shipping_street = prev.billing_street;
        newData.shipping_city = prev.billing_city;
        newData.shipping_postal_code = prev.billing_postal_code;
        newData.shipping_country = prev.billing_country;
      }
      
      // Si on modifie une adresse de facturation et que use_billing_as_shipping est vrai, synchroniser
      if (prev.use_billing_as_shipping && ['billing_street', 'billing_city', 'billing_postal_code', 'billing_country'].includes(field)) {
        if (field === 'billing_street') newData.shipping_street = value as string;
        if (field === 'billing_city') newData.shipping_city = value as string;
        if (field === 'billing_postal_code') newData.shipping_postal_code = value as string;
        if (field === 'billing_country') newData.shipping_country = value as string;
      }
      
      return newData;
    });
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validation des champs obligatoires
    if (!formData.first_name.trim()) newErrors.first_name = 'Prénom requis';
    if (!formData.last_name.trim()) newErrors.last_name = 'Nom requis';
    if (!formData.email.trim()) newErrors.email = 'Email requis';
    if (!formData.password) newErrors.password = 'Mot de passe requis';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Confirmation requise';
    if (!formData.company_name.trim()) newErrors.company_name = 'Nom de société requis';
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

    // Validation SIRET (optionnel mais si rempli doit être valide)
    if (formData.siret_number && formData.siret_number.replace(/\s/g, '').length !== 14) {
      newErrors.siret_number = 'SIRET doit contenir 14 chiffres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // 1. Créer le compte utilisateur avec Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/catalog`
        }
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Erreur lors de la création du compte');
      }

      // 2. Insérer le profil utilisateur dans user_profils
      const profileData = {
        id: authData.user.id, // Lier au user créé dans auth.users
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        company_name: formData.company_name,
        siret_number: formData.siret_number || null,
        vat_number: formData.vat_number || null,
        billing_street: formData.billing_street,
        billing_city: formData.billing_city,
        billing_postal_code: formData.billing_postal_code,
        billing_country: formData.billing_country,
        shipping_street: formData.shipping_street,
        shipping_city: formData.shipping_city,
        shipping_postal_code: formData.shipping_postal_code,
        shipping_country: formData.shipping_country,
        use_billing_as_shipping: formData.use_billing_as_shipping,
        role: 'client',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: profileError } = await supabase
        .from('user_profils')
        .insert([profileData]);

      if (profileError) {
        throw new Error(profileError.message);
      }

      // 3. Redirection vers confirmation d'email
      router.push('/signup/confirm-email?email=' + encodeURIComponent(formData.email));
      
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
        {/* Section gauche - Branding et chiffres clés */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-16">
          {/* Logo et titre */}
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
              Prix préférentiels, garanties et support dédié.
            </p>
          </div>

          {/* Avantages de l'inscription */}
          <div className="space-y-6 mb-8">
            <div className="flex items-start space-x-4">
              <div className="bg-dbc-bright-green bg-opacity-20 rounded-xl p-3">
                <Shield className="h-6 w-6 text-dbc-bright-green" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Accès immédiat</h3>
                <p className="text-emerald-100 text-sm">Catalogue complet avec 15K+ smartphones et prix en temps réel</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-dbc-bright-green bg-opacity-20 rounded-xl p-3">
                <Award className="h-6 w-6 text-dbc-bright-green" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Conditions préférentielles</h3>
                <p className="text-emerald-100 text-sm">Prix brokeur internationaux et 50% du stock en TVA sur marge</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-dbc-bright-green bg-opacity-20 rounded-xl p-3">
                <Package className="h-6 w-6 text-dbc-bright-green" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Support professionnel</h3>
                <p className="text-emerald-100 text-sm">Équipe dédiée, garanties RMA et seulement 2% de taux SAV</p>
              </div>
            </div>
          </div>

          {/* Lien vers connexion */}
          <div className="text-center">
            <p className="text-emerald-200">Déjà client ?</p>
            <a href="/login" className="text-dbc-bright-green hover:text-white font-semibold transition-colors">
              Se connecter →
            </a>
          </div>
        </div>

        {/* Section droite - Formulaire d'inscription */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-lg">
            {/* Logo mobile */}
            <div className="lg:hidden text-center mb-8">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <DBCLogo size={48} />
                <div>
                  <h1 className="text-2xl font-bold text-white">DBC Electronics</h1>
                  <p className="text-emerald-200">Inscription Professionnelle</p>
                </div>
              </div>
            </div>

            {/* Carte d'inscription */}
            <div className="bg-white bg-opacity-20 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white border-opacity-30 max-h-[90vh] overflow-y-auto">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Inscription</h3>
                <p className="text-emerald-100 text-sm">Créez votre compte professionnel</p>
              </div>

              {/* Erreur générale */}
              {errors.general && (
                <div className="mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-400 rounded-xl text-red-300 text-sm">
                  {errors.general}
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                {/* Informations personnelles */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Prénom *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-300" />
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => handleInputChange('first_name', e.target.value)}
                        className="w-full pl-10 pr-3 py-3 bg-white bg-opacity-20 border-2 border-white border-opacity-30 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-opacity-30 transition-all duration-200 text-white placeholder-emerald-200 backdrop-blur-sm text-sm"
                        placeholder="John"
                        required
                      />
                    </div>
                    {errors.first_name && <p className="text-red-300 text-xs mt-1">{errors.first_name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Nom *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-300" />
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => handleInputChange('last_name', e.target.value)}
                        className="w-full pl-10 pr-3 py-3 bg-white bg-opacity-20 border-2 border-white border-opacity-30 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-opacity-30 transition-all duration-200 text-white placeholder-emerald-200 backdrop-blur-sm text-sm"
                        placeholder="Doe"
                        required
                      />
                    </div>
                    {errors.last_name && <p className="text-red-300 text-xs mt-1">{errors.last_name}</p>}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Email professionnel *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-300" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full pl-10 pr-3 py-3 bg-white bg-opacity-20 border-2 border-white border-opacity-30 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-opacity-30 transition-all duration-200 text-white placeholder-emerald-200 backdrop-blur-sm text-sm"
                      placeholder="john@entreprise.com"
                      required
                    />
                  </div>
                  {errors.email && <p className="text-red-300 text-xs mt-1">{errors.email}</p>}
                </div>

                {/* Mots de passe */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Mot de passe *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-300" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="w-full pl-10 pr-10 py-3 bg-white bg-opacity-20 border-2 border-white border-opacity-30 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-opacity-30 transition-all duration-200 text-white placeholder-emerald-200 backdrop-blur-sm text-sm"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-emerald-300 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-300 text-xs mt-1">{errors.password}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Confirmer *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-300" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className="w-full pl-10 pr-10 py-3 bg-white bg-opacity-20 border-2 border-white border-opacity-30 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-opacity-30 transition-all duration-200 text-white placeholder-emerald-200 backdrop-blur-sm text-sm"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-emerald-300 hover:text-white transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-red-300 text-xs mt-1">{errors.confirmPassword}</p>}
                  </div>
                </div>

                {/* Informations société */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Nom de la société *
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-300" />
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => handleInputChange('company_name', e.target.value)}
                      className="w-full pl-10 pr-3 py-3 bg-white bg-opacity-20 border-2 border-white border-opacity-30 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-opacity-30 transition-all duration-200 text-white placeholder-emerald-200 backdrop-blur-sm text-sm"
                      placeholder="MonEntreprise SARL"
                      required
                    />
                  </div>
                  {errors.company_name && <p className="text-red-300 text-xs mt-1">{errors.company_name}</p>}
                </div>

                {/* Téléphone, SIRET et TVA */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Téléphone *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-300" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full pl-10 pr-3 py-3 bg-white bg-opacity-20 border-2 border-white border-opacity-30 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-opacity-30 transition-all duration-200 text-white placeholder-emerald-200 backdrop-blur-sm text-sm"
                        placeholder="+33 1 23..."
                        required
                      />
                    </div>
                    {errors.phone && <p className="text-red-300 text-xs mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      SIRET
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-300" />
                      <input
                        type="text"
                        value={formData.siret_number}
                        onChange={(e) => handleInputChange('siret_number', e.target.value)}
                        className="w-full pl-10 pr-3 py-3 bg-white bg-opacity-20 border-2 border-white border-opacity-30 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-opacity-30 transition-all duration-200 text-white placeholder-emerald-200 backdrop-blur-sm text-sm"
                        placeholder="12345..."
                      />
                    </div>
                    {errors.siret_number && <p className="text-red-300 text-xs mt-1">{errors.siret_number}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      TVA
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-300" />
                      <input
                        type="text"
                        value={formData.vat_number}
                        onChange={(e) => handleInputChange('vat_number', e.target.value)}
                        className="w-full pl-10 pr-3 py-3 bg-white bg-opacity-20 border-2 border-white border-opacity-30 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-opacity-30 transition-all duration-200 text-white placeholder-emerald-200 backdrop-blur-sm text-sm"
                        placeholder="FR123..."
                      />
                    </div>
                  </div>
                </div>

                {/* Adresse de facturation */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-dbc-bright-green flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Adresse de facturation
                  </h4>
                  
                  <div>
                    <input
                      type="text"
                      value={formData.billing_street}
                      onChange={(e) => handleInputChange('billing_street', e.target.value)}
                      className="w-full px-3 py-3 bg-white bg-opacity-20 border-2 border-white border-opacity-30 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-opacity-30 transition-all duration-200 text-white placeholder-emerald-200 backdrop-blur-sm text-sm"
                      placeholder="123 Rue de la République"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <input
                        type="text"
                        value={formData.billing_city}
                        onChange={(e) => handleInputChange('billing_city', e.target.value)}
                        className="w-full px-3 py-3 bg-white bg-opacity-20 border-2 border-white border-opacity-30 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-opacity-30 transition-all duration-200 text-white placeholder-emerald-200 backdrop-blur-sm text-sm"
                        placeholder="Ville"
                      />
                    </div>

                    <div>
                      <input
                        type="text"
                        value={formData.billing_postal_code}
                        onChange={(e) => handleInputChange('billing_postal_code', e.target.value)}
                        className="w-full px-3 py-3 bg-white bg-opacity-20 border-2 border-white border-opacity-30 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-opacity-30 transition-all duration-200 text-white placeholder-emerald-200 backdrop-blur-sm text-sm"
                        placeholder="75001"
                      />
                    </div>

                    <div>
                      <select
                        value={formData.billing_country}
                        onChange={(e) => handleInputChange('billing_country', e.target.value)}
                        className="w-full px-3 py-3 bg-white bg-opacity-20 border-2 border-white border-opacity-30 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-opacity-30 transition-all duration-200 text-white backdrop-blur-sm text-sm"
                      >
                        <option value="France" className="bg-dbc-dark-green text-white">France</option>
                        <option value="Belgique" className="bg-dbc-dark-green text-white">Belgique</option>
                        <option value="Suisse" className="bg-dbc-dark-green text-white">Suisse</option>
                        <option value="Luxembourg" className="bg-dbc-dark-green text-white">Luxembourg</option>
                        <option value="Espagne" className="bg-dbc-dark-green text-white">Espagne</option>
                        <option value="Italie" className="bg-dbc-dark-green text-white">Italie</option>
                        <option value="Allemagne" className="bg-dbc-dark-green text-white">Allemagne</option>
                        <option value="Autre" className="bg-dbc-dark-green text-white">Autre</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Option utiliser adresse facturation pour livraison */}
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="use_billing_as_shipping"
                    checked={formData.use_billing_as_shipping}
                    onChange={(e) => handleInputChange('use_billing_as_shipping', e.target.checked)}
                    className="h-4 w-4 text-dbc-bright-green focus:ring-dbc-bright-green border-emerald-300 rounded bg-white bg-opacity-20"
                  />
                  <label htmlFor="use_billing_as_shipping" className="text-emerald-100 text-sm">
                    Utiliser l'adresse de facturation pour la livraison
                  </label>
                </div>

                {/* Adresse de livraison (conditionnelle) */}
                {!formData.use_billing_as_shipping && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-dbc-bright-green flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      Adresse de livraison
                    </h4>
                    
                    <div>
                      <input
                        type="text"
                        value={formData.shipping_street}
                        onChange={(e) => handleInputChange('shipping_street', e.target.value)}
                        className="w-full px-3 py-3 bg-white bg-opacity-20 border-2 border-white border-opacity-30 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-opacity-30 transition-all duration-200 text-white placeholder-emerald-200 backdrop-blur-sm text-sm"
                        placeholder="123 Rue de Livraison"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <input
                          type="text"
                          value={formData.shipping_city}
                          onChange={(e) => handleInputChange('shipping_city', e.target.value)}
                          className="w-full px-3 py-3 bg-white bg-opacity-20 border-2 border-white border-opacity-30 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-opacity-30 transition-all duration-200 text-white placeholder-emerald-200 backdrop-blur-sm text-sm"
                          placeholder="Ville"
                        />
                      </div>

                      <div>
                        <input
                          type="text"
                          value={formData.shipping_postal_code}
                          onChange={(e) => handleInputChange('shipping_postal_code', e.target.value)}
                          className="w-full px-3 py-3 bg-white bg-opacity-20 border-2 border-white border-opacity-30 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-opacity-30 transition-all duration-200 text-white placeholder-emerald-200 backdrop-blur-sm text-sm"
                          placeholder="75001"
                        />
                      </div>

                      <div>
                        <select
                          value={formData.shipping_country}
                          onChange={(e) => handleInputChange('shipping_country', e.target.value)}
                          className="w-full px-3 py-3 bg-white bg-opacity-20 border-2 border-white border-opacity-30 rounded-xl focus:ring-2 focus:ring-dbc-bright-green focus:border-dbc-bright-green focus:bg-opacity-30 transition-all duration-200 text-white backdrop-blur-sm text-sm"
                        >
                          <option value="France" className="bg-dbc-dark-green text-white">France</option>
                          <option value="Belgique" className="bg-dbc-dark-green text-white">Belgique</option>
                          <option value="Suisse" className="bg-dbc-dark-green text-white">Suisse</option>
                          <option value="Luxembourg" className="bg-dbc-dark-green text-white">Luxembourg</option>
                          <option value="Espagne" className="bg-dbc-dark-green text-white">Espagne</option>
                          <option value="Italie" className="bg-dbc-dark-green text-white">Italie</option>
                          <option value="Allemagne" className="bg-dbc-dark-green text-white">Allemagne</option>
                          <option value="Autre" className="bg-dbc-dark-green text-white">Autre</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bouton d'inscription */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-dbc-bright-green to-emerald-400 text-dbc-dark-green py-4 px-6 rounded-xl hover:from-emerald-300 hover:to-emerald-500 hover:text-white focus:ring-2 focus:ring-dbc-bright-green focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-bold shadow-2xl backdrop-blur-sm mt-6"
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

                {/* Mentions légales */}
                <p className="text-emerald-200 text-xs text-center mt-4">
                  En créant votre compte, vous acceptez nos{' '}
                  <a href="#" className="text-dbc-bright-green hover:text-white underline">
                    conditions générales
                  </a>{' '}
                  et notre{' '}
                  <a href="#" className="text-dbc-bright-green hover:text-white underline">
                    politique de confidentialité
                  </a>
                </p>
              </form>
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