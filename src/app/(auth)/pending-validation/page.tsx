'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DBCLogo from '@/components/DBCLogo';
import { MessageCircle, Clock, Shield, Phone, Mail, ArrowRight, LogOut } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function PendingValidationPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState<string>('');
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const accountManagerPhone = "0768644427";
  const accountManagerWhatsApp = `https://wa.me/33${accountManagerPhone.substring(1)}`;

  useEffect(() => {
    loadUserInfo();
    
    // Auto-refresh toutes les 30 secondes pour vérifier si le compte est validé
    const autoRefreshInterval = setInterval(() => {
      console.log('🔄 Vérification automatique du statut du compte...');
      loadUserInfo();
    }, 30000); // 30 secondes

    // Cleanup de l'interval
    return () => clearInterval(autoRefreshInterval);
  }, []);

  // Calculer le temps écoulé depuis l'inscription
  useEffect(() => {
    if (userInfo?.created_at) {
      const updateTimeElapsed = () => {
        const createdAt = new Date(userInfo.created_at);
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - createdAt.getTime()) / 60000);
        
        if (diffInMinutes < 1) {
          setTimeElapsed('à l\'instant');
        } else if (diffInMinutes < 60) {
          setTimeElapsed(`il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`);
        } else {
          const hours = Math.floor(diffInMinutes / 60);
          setTimeElapsed(`il y a ${hours} heure${hours > 1 ? 's' : ''}`);
        }
      };

      updateTimeElapsed();
      const timeInterval = setInterval(updateTimeElapsed, 60000); // Mise à jour chaque minute

      return () => clearInterval(timeInterval);
    }
  }, [userInfo]);

  const loadUserInfo = async () => {
    try {
      setIsRefreshing(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: userProfileData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Erreur lors de la récupération du profil utilisateur:', error);
        } else {
          setUserInfo(userProfileData);
          setLastCheck(new Date());
          
          // Si le compte est maintenant actif, rediriger vers le catalogue
          if (userProfileData.is_active) {
            console.log('✅ Compte validé ! Redirection...');
            const redirectPath = userProfileData.role === 'admin' ? '/admin' : '/catalog';
            router.push(redirectPath);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des infos utilisateur:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleWhatsAppContact = () => {
    if (!userInfo) return;
    
    const message = encodeURIComponent(
      `Bonjour ! Mon compte B2B sur la plateforme DBC Electronics est en attente de validation.\n\n` +
      `Informations de mon entreprise :\n` +
      `• Société : ${userInfo.company_name}\n` +
      `• Contact : ${userInfo.contact_name}\n` +
      `• Email : ${userInfo.email}\n\n` +
      `Pourriez-vous valider mon inscription pour que je puisse accéder au catalogue ? Merci !`
    );
    
    window.open(`${accountManagerWhatsApp}?text=${message}`, '_blank');
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dbc-dark-green via-emerald-800 to-dbc-light-green flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Chargement...</p>
        </div>
      </div>
    );
  }

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
            {userInfo && (
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white border-opacity-20">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-dbc-bright-green" />
                  Votre demande d'accès
                </h3>
                <div className="space-y-2 text-emerald-100">
                  <p><span className="font-medium">Société :</span> {userInfo.company_name}</p>
                  <p><span className="font-medium">Contact :</span> {userInfo.contact_name}</p>
                  <p><span className="font-medium">Email :</span> {userInfo.email}</p>
                  <p><span className="font-medium">Inscription :</span> {timeElapsed}</p>
                </div>
              </div>
            )}

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

            {/* Bouton de rafraîchissement automatique */}
            <div className="mb-6">
              <button
                onClick={loadUserInfo}
                disabled={isRefreshing}
                className="w-full bg-white bg-opacity-20 backdrop-blur-sm border-2 border-white border-opacity-30 text-white py-3 px-6 rounded-xl hover:bg-opacity-30 focus:ring-2 focus:ring-dbc-bright-green transition-all duration-200 flex items-center justify-center space-x-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRefreshing ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Vérification en cours...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-5 w-5" />
                    <span>Actualiser le statut</span>
                  </>
                )}
              </button>
              <div className="text-center text-emerald-200 text-xs mt-2 space-y-1">
                <p>💡 Cette page se rafraîchit automatiquement toutes les 30 secondes</p>
                <p>🕐 Dernière vérification : {lastCheck.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
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