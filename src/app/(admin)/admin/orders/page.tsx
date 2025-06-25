'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, withAuth } from '../../../../lib/auth-context';
import AppHeader from '@/components/AppHeader';
import OrderImportButton from '@/components/OrderImportButton';
import OrderFilters from '@/components/OrderFilters';
import { supabase, Product } from '../../../../lib/supabase';
import { OrdersUtils } from '../../../../lib/orders-utils';
import {
  User,
  LogOut,
  ShoppingCart,
  Package,
  Calendar,
  Euro,
  ChevronRight,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
  Trash2
} from 'lucide-react';

// Page des commandes - Gestion des commandes client

function AdminOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signOut } = useAuth();

  const [statusFilter, setStatusFilter] = useState('all');
  const [orders, setOrders] = useState<any[]>([]);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0); // Comptage total des commandes
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true); // Démarrer avec loading=true
  const [orderMargins, setOrderMargins] = useState<Record<string, number>>({}); // Cache des marges par commande
  const [advancedFilters, setAdvancedFilters] = useState({
    client: '',
    dateFrom: '',
    dateTo: '',
    quantityMin: '',
    quantityMax: '',
    amountMin: '',
    amountMax: ''
  });

    // Fonction pour charger les marges des commandes
  const loadOrderMargins = async (orderIds: string[]) => {
    if (orderIds.length === 0) return;

    try {
      console.log('📊 Chargement marges pour', orderIds.length, 'commandes...');
      
      // Charger les marges en parallèle pour toutes les commandes
      const marginPromises = orderIds.map(async (orderId) => {
        try {
          const { data: margin, error } = await supabase
            .rpc('get_order_margin_by_id', { order_uuid: orderId });
          
          if (error) {
            console.error(`❌ Erreur calcul marge commande ${orderId}:`, error);
            return { orderId, margin: 0 };
          }
          
          return { orderId, margin: margin || 0 };
        } catch (error) {
          console.error(`❌ Erreur calcul marge commande ${orderId}:`, error);
          return { orderId, margin: 0 };
        }
      });

      const marginResults = await Promise.all(marginPromises);
      
      // Convertir en objet pour un accès rapide
      const marginsMap = marginResults.reduce((acc, { orderId, margin }) => {
        acc[orderId] = margin;
        return acc;
      }, {} as Record<string, number>);

      console.log('✅ Marges chargées:', marginsMap);
      setOrderMargins(marginsMap);
      
    } catch (error) {
      console.error('❌ Erreur chargement marges:', error);
    }
  };

  // Fonction pour charger les commandes via l'API
  const loadOrders = async (forceRefresh = false) => {
    setLoading(true);
    try {
      // Utiliser l'userId du contexte
      if (!user?.id) {
        console.log('⏳ Attente de l\'userId...');
        return;
      }

      console.log('📦 Chargement des commandes via API...', forceRefresh ? '(cache désactivé)' : '');
      
      // Désactiver le cache si demandé
      const fetchOptions: RequestInit = forceRefresh ? {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      } : {};
      
      // Construire l'URL avec les filtres
      const urlParams = new URLSearchParams({
        userId: user.id,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(advancedFilters.client && { client: advancedFilters.client }),
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

      console.log('🔍 URL de l\'API appelée:', apiUrl);
      console.log('💾 Réponse brute de l\'API:', result);

      if (!response.ok) {
        console.error('❌ Erreur API orders:', result.error);
        throw new Error(result.error || 'Erreur de chargement');
      }

      console.log('✅ Commandes chargées via API:', result.count);

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
      const allOrders = result.orders?.map((order: any) => ({
        id: order.id, // Utiliser l'UUID Supabase
        name: order.name,
        status: order.status,
        status_label: getCorrectStatusLabel(order.status), // Forcer le bon label selon le statut
        createdAt: order.created_at,
        totalAmount: order.total_amount,
        totalItems: order.total_items,
        customerRef: order.customer_ref,
        vatType: order.vat_type,
        items: order.order_items || [],
        source: 'api',
        // Ajouter les informations du client
        client: order.users ? {
          id: order.users.id,
          company_name: order.users.company_name,
          contact_name: order.users.contact_name,
          email: order.users.email
        } : null,
        tracking_number: order.tracking_number
      })) || [];

      console.log('📋 Commandes formatées:', allOrders.length);
      console.log('📋 IDs des commandes:', allOrders.map((o: any) => o.id));
      
      // Nettoyer le localStorage des commandes fantômes en utilisant l'utilitaire
      const validOrderIds = allOrders.map((order: any) => order.id);
      OrdersUtils.cleanupOrphanedOrders(validOrderIds);
      
      // Marquer les commandes comme fraîches
      OrdersUtils.markOrdersAsFresh();
      
      setOrders(allOrders);
      console.log('✅ State mis à jour avec', allOrders.length, 'commandes');

      // Charger les marges pour toutes les commandes
      const orderIds = allOrders.map((order: any) => order.id);
      if (orderIds.length > 0) {
        loadOrderMargins(orderIds);
      }

    } catch (error) {
      console.error('❌ Erreur chargement commandes:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour forcer un rechargement complet (en cas de problème de cache)
  const forceCompleteRefresh = async () => {
    console.log('🔄 FORCE COMPLETE REFRESH - Vidage de tous les caches...');
    
    // Vider le state immédiatement
    setOrders([]);
    setLoading(true);
    
    // Attendre un court délai pour que l'interface se vide
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Recharger avec cache désactivé
    await loadOrders(true);
    
    console.log('✅ Rechargement complet terminé');
  };

  // Charger les produits depuis Supabase
  useEffect(() => {
    async function loadProducts() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true);

        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error('Erreur chargement produits:', err);
        // Utiliser les données de démo en cas d'erreur
        setProducts([]);
      }
    }

    loadProducts();
  }, []);

  useEffect(() => {
    loadOrders();
  }, []);

  // Fonction pour charger le compte total des commandes
  const loadTotalOrdersCount = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/orders?userId=${user.id}`);
      const result = await response.json();
      if (result.success) {
        setTotalOrdersCount(result.count || 0);
      }
    } catch (error) {
      console.error('❌ Erreur chargement compte total:', error);
    }
  };

  // Fonction pour gérer les changements de filtres avancés
  const handleAdvancedFiltersChange = useCallback((filters: typeof advancedFilters) => {
    setAdvancedFilters(filters);
  }, []);

  // Fonction pour effacer tous les filtres
  const handleClearFilters = useCallback(() => {
    setAdvancedFilters({
      client: '',
      dateFrom: '',
      dateTo: '',
      quantityMin: '',
      quantityMax: '',
      amountMin: '',
      amountMax: ''
    });
  }, []);

  // Charger les commandes et le compte total quand userId est disponible
  useEffect(() => {
    if (user?.id) {
      loadOrders();
      loadTotalOrdersCount();
    }
  }, [user?.id]);

  // Recharger quand les filtres changent
  useEffect(() => {
    if (user?.id) {
      loadOrders();
    }
  }, [statusFilter, advancedFilters]);

  // Écouter les changements du localStorage pour détecter les nouvelles commandes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Recharger les commandes quand le localStorage change
      if (e.key === 'draftOrders' || e.key === 'currentDraftOrder') {
        console.log('📱 Changement détecté dans le localStorage - rechargement FORCÉ des commandes');
        loadOrders(true); // Forcer sans cache car changement détecté
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Écouter les changements de paramètres URL pour recharger
  useEffect(() => {
    const refreshParam = searchParams.get('refresh');
    if (refreshParam) {
      console.log('🔄 Paramètre refresh détecté, rechargement FORCÉ des commandes...');
      loadOrders(true); // Forcer le refresh sans cache
      
      // Nettoyer l'URL en supprimant le paramètre refresh
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  // Rafraîchir automatiquement quand on revient sur la page
  useEffect(() => {
    const handleFocus = () => {
      // Vérifier si on doit forcer le refresh
      const shouldRefresh = OrdersUtils.shouldRefreshOrders();
      if (shouldRefresh) {
        console.log('👀 Page des commandes refocalisée - REFRESH FORCÉ détecté');
        loadOrders(true);
      } else {
        console.log('👀 Page des commandes refocalisée - rechargement normal');
        loadOrders();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Vérifier si on doit forcer le refresh
        const shouldRefresh = OrdersUtils.shouldRefreshOrders();
        if (shouldRefresh) {
          console.log('👀 Page des commandes redevenue visible - REFRESH FORCÉ détecté');
          loadOrders(true);
        } else {
          console.log('👀 Page des commandes redevenue visible - rechargement normal');
          loadOrders();
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Polling automatique pour détecter les nouvelles commandes (toutes les 30 secondes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) {
        // Vérifier si on doit forcer le refresh
        const shouldRefresh = OrdersUtils.shouldRefreshOrders();
        if (shouldRefresh) {
          console.log('🔄 Polling automatique - REFRESH FORCÉ détecté');
          loadOrders(true);
        } else {
          console.log('🔄 Polling automatique - vérification normale');
          loadOrders();
        }
      }
    }, 30000); // 30 secondes

    return () => clearInterval(interval);
  }, []);

  const deleteOrder = async (orderId: string, orderName?: string) => {
    // Trouver la commande dans la liste pour avoir plus d'infos
    const orderToDelete = orders.find(order => order.id === orderId);
    
    if (!orderToDelete) {
      alert('❌ Commande non trouvée');
      return;
    }

    if (orderToDelete.status !== 'draft') {
      alert('❌ Seules les commandes en brouillon peuvent être supprimées');
      return;
    }

    const displayName = orderName || orderToDelete.name || 'Commande sans nom';
    const confirmMessage = `Êtes-vous sûr de vouloir supprimer définitivement la commande "${displayName}" ?\n\nCette action est irréversible.`;
    
    if (window.confirm(confirmMessage)) {
      try {
        console.log('🗑️ Début suppression commande:', orderId);
        console.log('📋 Détails:', orderToDelete);

        const response = await fetch(`/api/orders/${orderId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log('📡 Réponse HTTP:', response.status, response.statusText);

        if (!response.ok) {
          let errorMessage = 'Erreur de suppression';
          try {
            const result = await response.json();
            errorMessage = result.error || errorMessage;
            console.error('❌ Erreur API:', result);
          } catch (parseError) {
            console.error('❌ Erreur parsing réponse:', parseError);
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('✅ Réponse suppression:', result);

        // Nettoyer immédiatement le localStorage
        console.log('🧹 Nettoyage localStorage...');
        const savedOrders = localStorage.getItem('draftOrders');
        if (savedOrders) {
          try {
            const draftOrders = JSON.parse(savedOrders);
            if (draftOrders[orderId]) {
              delete draftOrders[orderId];
              localStorage.setItem('draftOrders', JSON.stringify(draftOrders));
              console.log('✅ Commande supprimée de draftOrders');
            }
          } catch (error) {
            console.warn('⚠️ Erreur nettoyage draftOrders:', error);
          }
        }

        const currentOrder = localStorage.getItem('currentDraftOrder');
        if (currentOrder === orderId) {
          localStorage.removeItem('currentDraftOrder');
          console.log('✅ currentDraftOrder supprimé');
        }

        // Supprimer immédiatement de la liste affichée (feedback instantané)
        console.log('🗑️ Suppression immédiate de la liste affichée...');
        setOrders(prevOrders => {
          const newOrders = prevOrders.filter(order => order.id !== orderId);
          console.log('📋 Liste mise à jour:', prevOrders.length, '->', newOrders.length, 'commandes');
          return newOrders;
        });

        // Marquer les commandes comme obsolètes
        OrdersUtils.markOrdersAsStale();

        // Forcer un rechargement complet pour confirmation
        await forceCompleteRefresh();

        alert(`✅ Commande "${displayName}" supprimée avec succès`);

      } catch (error) {
        console.error('❌ Erreur suppression:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        alert(`❌ Erreur lors de la suppression de la commande:\n\n${errorMessage}`);
        
        // En cas d'erreur, forcer un rechargement complet pour avoir l'état réel
        await forceCompleteRefresh();
      }
    }
  };

  const handleImportComplete = async (result: any) => {
    if (result.success && result.order) {
      console.log('✅ Import terminé:', result);

      // Marquer les commandes comme obsolètes
      OrdersUtils.markOrdersAsStale();

      // Forcer un rechargement complet pour voir la nouvelle commande
      await forceCompleteRefresh();

      // Message de succès avec détails
      const message = [
        `${result.message}`,
        `Commande "${result.orderName}" créée avec ${result.totalItems} articles.`,
        `Total: ${result.totalAmount?.toFixed(2)}€`
      ];

      if (result.productsCreated > 0) {
        message.push(`${result.productsCreated} nouveaux produits ajoutés au catalogue.`);
      }

      if (result.productsUpdated > 0) {
        message.push(`${result.productsUpdated} produits mis à jour (stock initialisé).`);
      }

      alert(message.join('\n\n'));

      // Rediriger vers les détails de la commande (utiliser l'UUID Supabase)
      router.push(`/admin/orders/${result.order.id}`);

    } else if (result.error) {
      console.error('❌ Erreur import:', result.error);
      // L'erreur est déjà gérée dans le composant
    }
  };

  // Les commandes sont déjà filtrées côté serveur
  const filteredOrders = orders;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'shipping': return <Truck className="h-4 w-4" />;
      case 'validated': return <AlertCircle className="h-4 w-4" />;
      case 'draft': return <Package className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'shipping': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'pending_payment': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'validated': return 'bg-yellow-100 text-yellow-800'; // Support ancien statut
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
      <AppHeader
        cartItemsCount={0}
        onCartClick={() => router.push('/admin/orders')}
        onLogoClick={() => router.push('/admin')}
      />

      <div className="max-w-[2000px] mx-auto px-8 py-6">
        {/* Navigation */}
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={() => router.push('/admin')}
            className="text-dbc-light-green hover:text-dbc-dark-green"
          >
            Admin
          </button>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <span className="text-gray-900 font-medium">Commandes clients</span>
        </div>

        {/* Composant de filtres avancés */}
        <OrderFilters
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onFiltersChange={handleAdvancedFiltersChange}
          onClearFilters={handleClearFilters}
          totalOrders={totalOrdersCount}
          filteredCount={filteredOrders.length}
        />

        {/* Bouton d'import */}
        <div className="mb-6 flex justify-end">
          <OrderImportButton onImportComplete={handleImportComplete} />
        </div>

        {/* Tableau des commandes */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dbc-light-green mx-auto mb-4"></div>
                <p className="text-gray-600">Chargement des commandes...</p>
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
                    Client
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
                    Marge
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
                      {order.client ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">{order.client.company_name}</div>
                          <div className="text-xs text-gray-500">{order.client.contact_name}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Non assigné</span>
                      )}
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
                        {order.totalAmount.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm font-semibold text-green-600">
                        <Euro className="h-4 w-4 mr-1 text-green-400" />
                        {orderMargins[order.id] !== undefined ? orderMargins[order.id].toFixed(2) : '...'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => router.push(`/admin/orders/${order.id}`)}
                          className="px-3 py-1 bg-gradient-to-r from-dbc-bright-green to-emerald-400 text-dbc-dark-green hover:from-emerald-300 hover:to-emerald-500 hover:text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm backdrop-blur-sm"
                        >
                          Voir détails →
                        </button>
                        {order.status === 'draft' && (
                          <button
                            onClick={() => deleteOrder(order.id, order.name)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Supprimer cette commande brouillon"
                          >
                            <Trash2 className="h-4 w-4" />
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
            <p className="text-gray-600 mb-4">Vous n'avez pas encore passé de commande</p>
            <button
              onClick={() => router.push('/admin/catalog')}
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

export default withAuth(AdminOrdersPage, 'admin');