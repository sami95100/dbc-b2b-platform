'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, withAuth } from '../../../lib/auth-context';
import AppHeader from '@/components/AppHeader';
import { supabase, Product } from '../../../lib/supabase';
import { OrdersUtils } from '../../../lib/orders-utils';
import {
  ShoppingCart,
  Package,
  Calendar,
  Euro,
  ChevronRight,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
  Eye
} from 'lucide-react';

function ClientOrdersPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [statusFilter, setStatusFilter] = useState('all');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancedFilters, setAdvancedFilters] = useState({
    dateFrom: '',
    dateTo: '',
    quantityMin: '',
    quantityMax: '',
    amountMin: '',
    amountMax: ''
  });

  // Fonction pour charger les commandes du client connecté
  const loadOrders = async (forceRefresh = false) => {
    if (!user?.id) {
      console.log('⏳ Attente de l\'userId...');
      return;
    }

    setLoading(true);
    try {
      console.log('📦 Chargement des commandes client via API...');
      
      const fetchOptions: RequestInit = forceRefresh ? {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      } : {};
      
      // Construire l'URL avec les filtres - le client ne voit que ses commandes
      const urlParams = new URLSearchParams({
        userId: user.id,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(advancedFilters.dateFrom && { dateFrom: advancedFilters.dateFrom }),
        ...(advancedFilters.dateTo && { dateTo: advancedFilters.dateTo }),
        ...(advancedFilters.quantityMin && { quantityMin: advancedFilters.quantityMin }),
        ...(advancedFilters.quantityMax && { quantityMax: advancedFilters.quantityMax }),
        ...(advancedFilters.amountMin && { amountMin: advancedFilters.amountMin }),
        ...(advancedFilters.amountMax && { amountMax: advancedFilters.amountMax }),
        ...(forceRefresh && { nocache: Date.now().toString() })
      });
      
      const apiUrl = `/api/orders?${urlParams.toString()}`;
      
      const response = await fetch(apiUrl, fetchOptions);
      const result = await response.json();

      if (!response.ok) {
        console.error('❌ Erreur API orders:', result.error);
        throw new Error(result.error || 'Erreur de chargement');
      }

      console.log('✅ Commandes client chargées:', result.count);

      // Fonction pour garantir les bons labels de statut
      const getCorrectStatusLabel = (status: string) => {
        switch (status) {
          case 'draft': return 'Brouillon';
          case 'pending_payment': return 'En attente de paiement';
          case 'validated': return 'Validée';
          case 'shipping': return 'En cours de livraison';
          case 'completed': return 'Terminée';
          case 'cancelled': return 'Annulée';
          default: return status;
        }
      };

      // Convertir au format attendu
      const clientOrders = result.orders?.map((order: any) => ({
        id: order.id,
        name: order.name,
        status: order.status,
        status_label: getCorrectStatusLabel(order.status),
        createdAt: order.created_at,
        totalAmount: order.total_amount,
        totalItems: order.total_items,
        customerRef: order.customer_ref,
        vatType: order.vat_type,
        items: order.order_items || [],
        source: 'api',
        tracking_number: order.tracking_number
      })) || [];

      console.log('📋 Commandes client formatées:', clientOrders.length);
      
      // Nettoyer le localStorage des commandes fantômes
      const validOrderIds = clientOrders.map((order: any) => order.id);
      OrdersUtils.cleanupOrphanedOrders(validOrderIds);
      
      // Marquer les commandes comme fraîches
      OrdersUtils.markOrdersAsFresh();
      
      setOrders(clientOrders);

    } catch (error) {
      console.error('❌ Erreur chargement commandes client:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Charger les commandes au montage et quand les dépendances changent
  useEffect(() => {
    if (user?.id) {
      loadOrders();
    }
  }, [user?.id, statusFilter, advancedFilters]);

  // Synchronisation avec les modifications localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'draftOrders' || e.key === 'currentDraftOrder') {
        console.log('🔄 Changement localStorage détecté, rechargement...');
        loadOrders(true);
      }
    };

    const handleFocus = () => {
      console.log('🔄 Retour focus fenêtre, rechargement...');
      loadOrders(true);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Page redevenue visible, rechargement...');
        loadOrders(true);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, statusFilter, advancedFilters]);

  const handleOrderClick = (orderId: string) => {
    router.push(`/orders/${orderId}`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'shipping': return <Truck className="h-5 w-5 text-blue-600" />;
      case 'pending_payment': 
      case 'validated': return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'draft': return <AlertCircle className="h-5 w-5 text-gray-600" />;
      default: return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'shipping': return 'bg-blue-100 text-blue-800';
      case 'pending_payment': 
      case 'validated': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      await signOut();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dbc-light-green mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de vos commandes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50">
      <AppHeader 
        onCartClick={() => router.push('/catalog')}
        onLogout={handleLogout}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Mes Commandes</h1>
            <p className="text-gray-600">
              {user?.company_name} - {orders.length} commande(s)
            </p>
          </div>
          
          <button
            onClick={() => router.push('/catalog')}
            className="bg-dbc-light-green text-white px-6 py-3 rounded-lg hover:bg-dbc-dark-green transition-colors flex items-center"
          >
            <Package className="h-5 w-5 mr-2" />
            Catalogue
          </button>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dbc-light-green focus:border-transparent"
              >
                <option value="all">Tous les statuts</option>
                <option value="draft">Brouillon</option>
                <option value="pending_payment">En attente de paiement</option>
                <option value="validated">Validée</option>
                <option value="shipping">En livraison</option>
                <option value="completed">Terminée</option>
                <option value="cancelled">Annulée</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de début
              </label>
              <input
                type="date"
                value={advancedFilters.dateFrom}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dbc-light-green focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de fin
              </label>
              <input
                type="date"
                value={advancedFilters.dateTo}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dbc-light-green focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant minimum
              </label>
              <input
                type="number"
                value={advancedFilters.amountMin}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, amountMin: e.target.value }))}
                placeholder="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dbc-light-green focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Liste des commandes */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {orders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Aucune commande trouvée</h3>
              <p className="text-gray-500 mb-6">
                {statusFilter === 'all' 
                  ? 'Vous n\'avez pas encore de commandes.' 
                  : 'Aucune commande ne correspond à vos filtres.'
                }
              </p>
              <button
                onClick={() => router.push('/catalog')}
                className="bg-dbc-light-green text-white px-6 py-3 rounded-lg hover:bg-dbc-dark-green transition-colors flex items-center mx-auto"
              >
                <Package className="h-5 w-5 mr-2" />
                Parcourir le catalogue
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commande
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Articles
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {order.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.customerRef && `Réf: ${order.customerRef}`}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {getStatusIcon(order.status)}
                          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {order.status_label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center">
                          <Package className="h-4 w-4 text-gray-400 mr-2" />
                          {order.totalItems} article(s)
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center">
                          <Euro className="h-4 w-4 text-gray-400 mr-2" />
                          {order.totalAmount?.toFixed(2)} €
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleOrderClick(order.id)}
                          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Voir détails
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Protéger la page pour les clients uniquement
export default withAuth(ClientOrdersPage, 'client'); 