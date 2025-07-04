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
  Trash2,
  ExternalLink
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

  // Fonction pour générer l'URL de tracking FedEx
  const getFedExTrackingUrl = (trackingNumber: string) => {
    // Format: https://www.fedex.com/fedextrack/?trknbr=TRACKING_NUMBER&trkqual=TRACKING_NUMBER~FX
    return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}&trkqual=${trackingNumber}~FX`;
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

        {/* Tableau des commandes - Version Responsive */}
        <div className="bg-white/40 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dbc-light-green mx-auto mb-4"></div>
                <p className="text-gray-600">Chargement de vos commandes...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Vue Mobile - Cards (≤1023px) */}
              <div className="lg:hidden space-y-6 p-4">
                {filteredOrders.map((order) => {
                  const getGlassBackground = (status: string) => {
                    switch (status) {
                      case 'completed': 
                        return 'bg-gradient-to-br from-green-50/70 via-white/80 to-emerald-50/70 border-green-200/50';
                      case 'shipping': 
                        return 'bg-gradient-to-br from-blue-50/70 via-white/80 to-sky-50/70 border-blue-200/50';
                      case 'pending_payment': 
                      case 'validated': 
                        return 'bg-gradient-to-br from-amber-50/70 via-white/80 to-yellow-50/70 border-amber-200/50';
                      case 'draft': 
                        return 'bg-gradient-to-br from-gray-50/70 via-white/80 to-slate-50/70 border-gray-200/50';
                      default: 
                        return 'bg-gradient-to-br from-gray-50/70 via-white/80 to-slate-50/70 border-gray-200/50';
                    }
                  };

                  return (
                    <div key={order.id} className={`${getGlassBackground(order.status)} border backdrop-blur-md rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-5 hover:scale-[1.01] transform`}>
                      {/* Header - Statut principal */}
                      <div className="flex items-center justify-between mb-4">
                        <span className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium backdrop-blur-sm border ${getStatusColor(order.status)} shadow-sm`}>
                          {getStatusIcon(order.status)}
                          <span>{order.status_label}</span>
                        </span>
                        <div className="text-right">
                          <div className="text-xl font-bold text-gray-900">
                            {order.totalAmount?.toFixed(2)} €
                          </div>
                          <div className="text-xs text-gray-500 font-medium">
                            {order.totalItems} article{order.totalItems > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>

                      {/* Infos principales */}
                      <div className="space-y-3 mb-5">
                        <div className="flex items-center text-sm text-gray-700">
                          <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="font-medium">{new Date(order.createdAt).toLocaleDateString('fr-FR')}</span>
                        </div>
                        
                        {order.tracking_number && (
                          <a
                            href={getFedExTrackingUrl(order.tracking_number)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-sm text-blue-700 bg-blue-50/50 px-3 py-1.5 rounded-lg backdrop-blur-sm hover:bg-blue-100/60 hover:text-blue-800 transition-all duration-200 cursor-pointer group border border-blue-200/50 hover:border-blue-300/60"
                          >
                            <Truck className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                            <span className="font-medium">Tracking: {order.tracking_number}</span>
                            <ExternalLink className="h-3 w-3 ml-1 opacity-60 group-hover:opacity-100 transition-opacity" />
                          </a>
                        )}

                        <div className="text-xs text-gray-600 font-mono bg-white/50 px-3 py-2 rounded-lg backdrop-blur-sm border border-gray-200/50">
                          {order.name || order.id}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col space-y-3">
                        <button
                          onClick={() => handleOrderClick(order.id)}
                          className="w-full px-6 py-3 bg-white/40 hover:bg-white/60 text-gray-800 hover:text-gray-900 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm backdrop-blur-md border border-white/50 hover:border-white/80 hover:shadow-md"
                        >
                          <Eye className="h-4 w-4 inline mr-2" />
                          Voir les détails
                        </button>
                        {order.status === 'draft' && (
                          <button
                            onClick={() => deleteOrder(order.id, order.name || order.id)}
                            className="w-full px-6 py-3 bg-red-50/50 hover:bg-red-100/70 text-red-600 hover:text-red-700 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm backdrop-blur-md border border-red-200/50 hover:border-red-300/50"
                          >
                            <Trash2 className="h-4 w-4 inline mr-2" />
                            Supprimer la commande
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Vue Desktop - Tableau Responsive (≥1024px) */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-white/80 via-gray-50/80 to-white/80 backdrop-blur-sm border-b border-gray-200/50">
                    <tr>
                      {/* Colonnes visibles selon breakpoints */}
                      <th className="hidden xl:table-cell px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Numéro
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="hidden xl:table-cell px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Articles
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Montant
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gradient-to-b from-white/90 to-white/70 backdrop-blur-sm divide-y divide-gray-200/50">
                    {filteredOrders.map((order, index) => {
                      const getRowBackground = (status: string, index: number) => {
                        const baseClass = index % 2 === 0 ? 'bg-white/30' : 'bg-gray-50/30';
                        const hoverClass = 'hover:bg-white/60';
                        const statusGlow = (() => {
                          switch (status) {
                            case 'completed': return 'hover:shadow-green-100/50';
                            case 'shipping': return 'hover:shadow-blue-100/50';
                            case 'pending_payment':
                            case 'validated': return 'hover:shadow-amber-100/50';
                            case 'draft': return 'hover:shadow-gray-100/50';
                            default: return 'hover:shadow-gray-100/50';
                          }
                        })();
                        return `${baseClass} ${hoverClass} ${statusGlow} backdrop-blur-sm transition-all duration-200 hover:shadow-lg`;
                      };

                      return (
                        <tr key={order.id} className={getRowBackground(order.status, index)}>
                          {/* Numéro - Visible XL+ */}
                          <td className="hidden xl:table-cell px-4 py-4">
                            <div className="max-w-xs">
                              <div className="text-sm font-medium text-gray-900 truncate">{order.id}</div>
                              {order.name && (
                                <div className="text-xs text-gray-500 truncate">{order.name}</div>
                              )}
                            </div>
                          </td>

                          {/* Statut - Toujours visible */}
                          <td className="px-4 py-4">
                            <div className="flex flex-col space-y-1">
                              <span className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-medium backdrop-blur-sm border ${getStatusColor(order.status)} w-fit shadow-sm`}>
                                {getStatusIcon(order.status)}
                                <span className="hidden lg:inline">{order.status_label}</span>
                              </span>
                              {order.tracking_number && (
                                <a
                                  href={getFedExTrackingUrl(order.tracking_number)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center space-x-1 text-xs text-blue-700 bg-blue-50/50 px-2 py-1 rounded-lg backdrop-blur-sm hover:bg-blue-100/60 hover:text-blue-800 transition-all duration-200 cursor-pointer group border border-blue-200/50 hover:border-blue-300/60"
                                >
                                  <Truck className="h-3 w-3 group-hover:scale-110 transition-transform" />
                                  <span className="hidden xl:inline">Tracking: </span>
                                  <span className="truncate max-w-20">{order.tracking_number}</span>
                                  <ExternalLink className="h-2 w-2 opacity-60 group-hover:opacity-100 transition-opacity" />
                                </a>
                              )}
                            </div>
                          </td>

                          {/* Date - Toujours visible */}
                          <td className="px-4 py-4">
                            <div className="flex items-center text-sm text-gray-900">
                              <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                              <span className="hidden xl:inline">
                                {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                              </span>
                              <span className="xl:hidden">
                                {new Date(order.createdAt).toLocaleDateString('fr-FR', { 
                                  day: '2-digit', 
                                  month: '2-digit' 
                                })}
                              </span>
                            </div>
                          </td>

                          {/* Articles - Visible XL+ */}
                          <td className="hidden xl:table-cell px-4 py-4">
                            <div className="flex items-center text-sm text-gray-900">
                              <Package className="h-4 w-4 mr-1 text-gray-400" />
                              {order.totalItems} article{order.totalItems > 1 ? 's' : ''}
                            </div>
                          </td>

                          {/* Montant - Toujours visible */}
                          <td className="px-4 py-4">
                            <div className="text-sm font-semibold text-gray-900">
                              <div className="flex items-center">
                                <Euro className="h-4 w-4 mr-1 text-gray-400" />
                                {order.totalAmount?.toFixed(2)} €
                              </div>
                              <div className="xl:hidden text-xs text-gray-500 mt-1">
                                {order.totalItems} article{order.totalItems > 1 ? 's' : ''}
                              </div>
                            </div>
                          </td>

                          {/* Actions - Toujours visible */}
                          <td className="px-4 py-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleOrderClick(order.id)}
                                className="px-4 py-2 bg-white/50 hover:bg-white/70 text-gray-800 hover:text-gray-900 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm backdrop-blur-md border border-white/60 hover:border-white/80 hover:shadow-md whitespace-nowrap"
                              >
                                <Eye className="h-4 w-4 inline mr-1" />
                                <span className="hidden xl:inline">Détails</span>
                              </button>
                              {order.status === 'draft' && (
                                <button
                                  onClick={() => deleteOrder(order.id, order.name || order.id)}
                                  className="p-2 bg-red-50/50 hover:bg-red-100/70 text-red-600 hover:text-red-700 rounded-lg transition-all duration-200 backdrop-blur-md border border-red-200/50 hover:border-red-300/50"
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
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
              className="bg-white/50 hover:bg-white/70 text-gray-800 hover:text-gray-900 py-3 px-8 rounded-xl font-semibold shadow-lg backdrop-blur-md border border-white/60 hover:border-white/80 hover:shadow-xl transition-all duration-200"
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