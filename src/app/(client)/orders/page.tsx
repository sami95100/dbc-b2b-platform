'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, withAuth } from '../../../lib/auth-context';
import AppHeader from '@/components/AppHeader';
import OrderFilters from '@/components/OrderFilters';
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
  Eye,
  Trash2
} from 'lucide-react';

function ClientOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signOut } = useAuth();

  const [statusFilter, setStatusFilter] = useState('all');
  const [orders, setOrders] = useState<any[]>([]);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);
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
      setTotalOrdersCount(clientOrders.length);

    } catch (error) {
      console.error('❌ Erreur chargement commandes client:', error);
      setOrders([]);
      setTotalOrdersCount(0);
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

  // Gestion des filtres avancés
  const handleAdvancedFiltersChange = (filters: any) => {
    setAdvancedFilters(filters);
  };

  const handleClearFilters = () => {
    setStatusFilter('all');
    setAdvancedFilters({
      dateFrom: '',
      dateTo: '',
      quantityMin: '',
      quantityMax: '',
      amountMin: '',
      amountMax: ''
    });
  };

  // Filtres appliqués côté client
  const filteredOrders = orders.filter(order => {
    // Tous les filtres sont déjà appliqués côté serveur via l'API
    return true;
  });

  const handleOrderClick = (orderId: string) => {
    router.push(`/orders/${orderId}`);
  };

  const deleteOrder = async (orderId: string, orderName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la commande "${orderName}" ?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      alert('✅ Commande supprimée avec succès !');
      // Recharger la liste des commandes
      loadOrders(true);
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      alert('❌ Erreur lors de la suppression');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'shipping': return <Truck className="h-4 w-4 text-blue-600" />;
      case 'pending_payment': 
      case 'validated': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'draft': return <AlertCircle className="h-4 w-4 text-gray-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
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

  // Afficher un loader pendant la vérification d'authentification
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dbc-light-green mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50">
      {/* Header */}
      <AppHeader />

      <div className="max-w-[2000px] mx-auto px-8 py-6">
        {/* Navigation */}
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={() => router.push('/catalog')}
            className="text-dbc-light-green hover:text-dbc-dark-green"
          >
            Catalogue
          </button>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <span className="text-gray-900 font-medium">Mes commandes</span>
        </div>

        {/* Composant de filtres avancés - version client sans filtre client */}
        <OrderFilters
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onFiltersChange={handleAdvancedFiltersChange}
          onClearFilters={handleClearFilters}
          totalOrders={totalOrdersCount}
          filteredCount={filteredOrders.length}
          hideClientFilter={true}
        />

        {/* Tableau des commandes */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dbc-light-green mx-auto mb-4"></div>
                <p className="text-gray-600">Chargement de vos commandes...</p>
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Numéro de commande
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date de création
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre de produits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{order.id}</span>
                        {order.name && (
                          <div className="text-xs text-gray-500">{order.name}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)} w-fit`}>
                          {getStatusIcon(order.status)}
                          <span>{order.status_label}</span>
                        </span>
                        {order.tracking_number && (
                          <div className="flex items-center space-x-1 text-xs text-blue-600">
                            <Truck className="h-3 w-3" />
                            <span>Tracking: {order.tracking_number}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                        {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Package className="h-4 w-4 mr-1 text-gray-400" />
                        {order.totalItems} article{order.totalItems > 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm font-semibold text-gray-900">
                        <Euro className="h-4 w-4 mr-1 text-gray-400" />
                        {order.totalAmount?.toFixed(2)} €
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleOrderClick(order.id)}
                          className="px-3 py-1 bg-gradient-to-r from-dbc-bright-green to-emerald-400 text-dbc-dark-green hover:from-emerald-300 hover:to-emerald-500 hover:text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm backdrop-blur-sm"
                        >
                          <Eye className="h-4 w-4 inline mr-1" />
                          Voir détails
                        </button>
                        {order.status === 'draft' && (
                          <button
                            onClick={() => deleteOrder(order.id, order.name || order.id)}
                            className="px-3 py-1 bg-white border border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm"
                          >
                            <Trash2 className="h-4 w-4 inline mr-1" />
                            Supprimer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune commande trouvée</h3>
            <p className="text-gray-600 mb-4">
              {statusFilter === 'all' 
                ? 'Vous n\'avez pas encore passé de commande' 
                : 'Aucune commande ne correspond à vos filtres.'
              }
            </p>
            <button
              onClick={() => router.push('/catalog')}
              className="bg-gradient-to-r from-dbc-bright-green to-emerald-400 text-dbc-dark-green py-2 px-6 rounded-xl hover:from-emerald-300 hover:to-emerald-500 hover:text-white font-semibold shadow-lg backdrop-blur-sm transition-all duration-200"
            >
              Voir le catalogue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default withAuth(ClientOrdersPage, 'client'); 