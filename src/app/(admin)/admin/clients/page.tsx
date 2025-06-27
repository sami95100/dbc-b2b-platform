'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, withAuth } from '../../../../lib/auth-context';
import { supabase } from '../../../../lib/supabase';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  MessageCircle,
  Building,
  Mail,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  company_name: string;
  contact_name: string;
  phone: string;
  address?: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function ClientsManagement() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'pending' | 'active'>('pending');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Charger les utilisateurs en attente
      const { data: pending, error: pendingError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'client')
        .eq('is_active', false)
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;

      // Charger les utilisateurs actifs
      const { data: active, error: activeError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'client')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (activeError) throw activeError;

      setPendingUsers(pending || []);
      setActiveUsers(active || []);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId: string) => {
    if (processingIds.has(userId)) return;
    
    setProcessingIds(prev => new Set(prev).add(userId));
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // Déplacer l'utilisateur de pending vers active
      const approvedUser = pendingUsers.find(u => u.id === userId);
      if (approvedUser) {
        setPendingUsers(prev => prev.filter(u => u.id !== userId));
        setActiveUsers(prev => [{...approvedUser, is_active: true}, ...prev]);
      }

      console.log('✅ Utilisateur approuvé:', userId);
    } catch (error) {
      console.error('❌ Erreur lors de l\'approbation:', error);
      alert('Erreur lors de l\'approbation de l\'utilisateur');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (processingIds.has(userId)) return;
    
    if (!confirm('Êtes-vous sûr de vouloir rejeter cette inscription ? Cette action supprimera définitivement le compte.')) {
      return;
    }
    
    setProcessingIds(prev => new Set(prev).add(userId));
    
    try {
      // Supprimer l'utilisateur de la table users
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (deleteError) throw deleteError;

      // Retirer l'utilisateur de la liste
      setPendingUsers(prev => prev.filter(u => u.id !== userId));

      console.log('✅ Utilisateur rejeté et supprimé:', userId);
    } catch (error) {
      console.error('❌ Erreur lors du rejet:', error);
      alert('Erreur lors du rejet de l\'utilisateur');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (processingIds.has(userId)) return;
    
    if (!confirm('Êtes-vous sûr de vouloir désactiver ce compte ?')) {
      return;
    }
    
    setProcessingIds(prev => new Set(prev).add(userId));
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // Déplacer l'utilisateur d'active vers pending
      const deactivatedUser = activeUsers.find(u => u.id === userId);
      if (deactivatedUser) {
        setActiveUsers(prev => prev.filter(u => u.id !== userId));
        setPendingUsers(prev => [{...deactivatedUser, is_active: false}, ...prev]);
      }

      console.log('✅ Utilisateur désactivé:', userId);
    } catch (error) {
      console.error('❌ Erreur lors de la désactivation:', error);
      alert('Erreur lors de la désactivation de l\'utilisateur');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const getWhatsAppLink = (user: User) => {
    const phone = "0768644427";
    const message = encodeURIComponent(
      `Bonjour ${user.contact_name},\n\n` +
      `Votre inscription sur la plateforme DBC Electronics a été validée ! ✅\n\n` +
      `Vous pouvez maintenant vous connecter et accéder à notre catalogue complet.\n\n` +
      `Informations de votre compte :\n` +
      `• Société : ${user.company_name}\n` +
      `• Email : ${user.email}\n\n` +
      `Lien de connexion : https://dbc-electronics.com/login\n\n` +
      `Bienvenue dans la famille DBC Electronics ! 🎉`
    );
    
    return `https://wa.me/33${phone.substring(1)}?text=${message}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const UserCard = ({ user, isPending }: { user: User; isPending: boolean }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isPending ? 'bg-yellow-100' : 'bg-green-100'
          }`}>
            {isPending ? (
              <Clock className="h-5 w-5 text-yellow-600" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{user.contact_name}</h3>
            <p className="text-gray-600">{user.company_name}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isPending && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
              En attente
            </span>
          )}
          {!isPending && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
              Actif
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Mail className="h-4 w-4" />
          <span>{user.email}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Phone className="h-4 w-4" />
          <span>{user.phone}</span>
        </div>
        {user.address && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>{user.address}</span>
          </div>
        )}
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>Inscrit le {formatDate(user.created_at)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        {isPending ? (
          <div className="flex space-x-2">
            <button
              onClick={() => handleApproveUser(user.id)}
              disabled={processingIds.has(user.id)}
              className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {processingIds.has(user.id) ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="h-4 w-4" />
              )}
              <span>Approuver</span>
            </button>
            <button
              onClick={() => handleRejectUser(user.id)}
              disabled={processingIds.has(user.id)}
              className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {processingIds.has(user.id) ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <UserX className="h-4 w-4" />
              )}
              <span>Rejeter</span>
            </button>
          </div>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={() => window.open(getWhatsAppLink(user), '_blank')}
              className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={() => handleDeactivateUser(user.id)}
              disabled={processingIds.has(user.id)}
              className="flex items-center space-x-1 px-3 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {processingIds.has(user.id) ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span>Désactiver</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-dbc-dark-green mx-auto mb-2" />
          <p className="text-gray-600">Chargement des clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                ← Dashboard
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Gestion des clients</h1>
            </div>
            <button
              onClick={loadUsers}
              className="flex items-center space-x-2 px-4 py-2 bg-dbc-dark-green text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Actualiser</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">En attente</p>
                <p className="text-2xl font-bold text-gray-900">{pendingUsers.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Clients actifs</p>
                <p className="text-2xl font-bold text-gray-900">{activeUsers.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total clients</p>
                <p className="text-2xl font-bold text-gray-900">{pendingUsers.length + activeUsers.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('pending')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'pending'
                    ? 'border-dbc-dark-green text-dbc-dark-green'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Inscriptions en attente ({pendingUsers.length})
                {pendingUsers.length > 0 && (
                  <span className="ml-2 bg-yellow-100 text-yellow-800 py-0.5 px-2 rounded-full text-xs">
                    Nouveau
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('active')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'active'
                    ? 'border-dbc-dark-green text-dbc-dark-green'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Clients actifs ({activeUsers.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'pending' && (
              <div>
                {pendingUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Aucune inscription en attente
                    </h3>
                    <p className="text-gray-600">
                      Toutes les demandes d'inscription ont été traitées.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {pendingUsers.map((user) => (
                      <UserCard key={user.id} user={user} isPending={true} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'active' && (
              <div>
                {activeUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Aucun client actif
                    </h3>
                    <p className="text-gray-600">
                      Approuvez les inscriptions en attente pour voir les clients ici.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {activeUsers.map((user) => (
                      <UserCard key={user.id} user={user} isPending={false} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(ClientsManagement, 'admin'); 