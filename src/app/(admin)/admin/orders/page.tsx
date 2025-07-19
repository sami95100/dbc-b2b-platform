'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, withAuth } from '../../../../lib/auth-context';
import AppHeader from '@/components/AppHeader';
import OrderImportButton from '@/components/OrderImportButton';
import OrderFilters from '@/components/OrderFilters';
import { supabase, Product } from '../../../../lib/supabase';
import { OrdersUtils } from '../../../../lib/orders-utils';
import { calculateShippingCost } from '../../../../lib/shipping';
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
  Trash2,
  Eye,
  ExternalLink
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
        shippingCost: calculateShippingCost(order.total_items),
        vatType: (() => {
          // Utiliser le vat_type de la base de données d'abord, sinon calculer
          if (order.vat_type) {
            // Mapper les valeurs de la base vers nos valeurs frontend
            if (order.vat_type.includes('autoliquidation')) {
              return 'reverse';
            } else {
              return 'marginal';
            }
          }
          
          // Fallback: calculer depuis les produits
          if (!order.order_items || order.order_items.length === 0) {
            return 'marginal'; // Par défaut
          }

          // Chercher les produits correspondants pour connaître leur vat_type réel
          const productSkus = order.order_items.map((item: any) => item.sku);
          const orderProducts = products.filter(product => productSkus.includes(product.sku));
          
          if (orderProducts.length === 0) {
            return 'marginal'; // Par défaut si pas de produits trouvés
          }

          // Vérifier s'il y a au moins un produit non marginal
          const hasNonMarginal = orderProducts.some(product => 
            product.vat_type !== 'Marginal' && product.vat_type !== 'marginal'
          );
          
          return hasNonMarginal ? 'reverse' : 'marginal';
        })(),
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
    async function loadData() {
      try {
        // Charger d'abord les produits
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true);

        if (error) throw error;
        setProducts(data || []);
        
        // Puis charger les commandes
        await loadOrders();
      } catch (err) {
        console.error('Erreur chargement produits:', err);
        setProducts([]);
        // Charger les commandes même en cas d'erreur produits
        await loadOrders();
      }
    }

    loadData();
  }, []);

  // Fonction pour charger le compte total des commandes
  const loadTotalOrdersCount = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/orders?userId=${user.id}`);
      const result = await response.json();
      
      if (response.ok) {
        setTotalOrdersCount(result.count || 0);
      }
    } catch (error) {
      console.error('Erreur chargement total commandes:', error);
    }
  };

  // Charger les commandes au montage et quand les dépendances changent
  useEffect(() => {
    if (user?.id) {
      loadOrders();
      loadTotalOrdersCount();
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
      // Vérifier si les commandes sont "stale" (modifiées il y a plus de 30 secondes)
      const lastRefresh = localStorage.getItem('ordersLastRefresh');
      if (lastRefresh) {
        const lastRefreshTime = parseInt(lastRefresh);
        const now = Date.now();
        const timeDiff = now - lastRefreshTime;
        
        if (timeDiff > 30000) { // 30 secondes
          console.log('🔄 Commandes stale détectées, rechargement...');
          loadOrders(true);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Même logique que pour le focus
        const lastRefresh = localStorage.getItem('ordersLastRefresh');
        if (lastRefresh) {
          const lastRefreshTime = parseInt(lastRefresh);
          const now = Date.now();
          const timeDiff = now - lastRefreshTime;
          
          if (timeDiff > 30000) { // 30 secondes
            console.log('🔄 Page redevenue visible, commandes stale, rechargement...');
            loadOrders(true);
          }
        }
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
    console.log('🔄 Changement filtres avancés:', filters);
    setAdvancedFilters(filters);
  };

  const handleClearFilters = () => {
    console.log('🔄 Nettoyage des filtres...');
    setStatusFilter('all');
    setAdvancedFilters({
      client: '',
      dateFrom: '',
      dateTo: '',
      quantityMin: '',
      quantityMax: '',
      amountMin: '',
      amountMax: ''
    });
  };

  // Filtres appliqués côté client (pour le debug)
  const filteredOrders = orders.filter(order => {
    // Tous les filtres sont déjà appliqués côté serveur via l'API
    return true;
  });

  const deleteOrder = async (orderId: string, orderName?: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la commande "${orderName || orderId}" ?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      console.log('✅ Commande supprimée avec succès');
      
      // Mettre à jour le state local immédiatement
      setOrders(currentOrders => currentOrders.filter(order => order.id !== orderId));
      
      // Recharger pour s'assurer de la cohérence
      setTimeout(() => {
        loadOrders(true);
      }, 500);
      
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      alert('❌ Erreur lors de la suppression de la commande');
    }
  };

  // Vérifier si une commande est modifiable
  const isOrderEditable = (order: any) => {
    return order.status === 'draft' || order.status === 'pending_payment';
  };

  // Gérer la validation d'une commande
  const validateOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/validate`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la validation');
      }

      console.log('✅ Commande validée avec succès');
      
      // Recharger les commandes
      loadOrders(true);
      
    } catch (error) {
      console.error('❌ Erreur validation:', error);
      alert('❌ Erreur lors de la validation de la commande');
    }
  };

  // Gérer la réception d'une commande importée
  const handleImportComplete = async (result: any) => {
    console.log('📦 Import terminé:', result);
    
    if (result.success) {
      // Recharger les commandes après l'import
      await loadOrders(true);
      
      // Afficher un message de succès
      alert(`✅ Import réussi ! ${result.ordersCount} commande(s) importée(s)`);
    } else {
      alert(`❌ Erreur lors de l'import: ${result.error}`);
    }
  };

  // Gestion des filtres et de l'affichage
  const handleStatusChange = (newStatus: string) => {
    console.log('🔄 Changement statut:', newStatus);
    setStatusFilter(newStatus);
  };

  const handleOrderClick = (orderId: string) => {
    router.push(`/admin/orders/${orderId}`);
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
    return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}&trkqual=${trackingNumber}~FX`;
  };

  // Afficher un loader pendant la vérification d'authentification
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto mb-4"></div>
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
            className="text-gray-700 hover:text-gray-900"
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

        {/* Tableau des commandes - Version Responsive avec style glassmorphism */}
        <div className="bg-white/10 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-4"></div>
                <p className="text-gray-600">Chargement des commandes...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Vue Mobile - Cards (≤1023px) */}
              <div className="lg:hidden space-y-4 p-4">
                {filteredOrders.map((order) => {
                  const getStatusBorder = (status: string) => {
                    switch (status) {
                      case 'completed': 
                        return 'border-l-green-500';
                      case 'shipping': 
                        return 'border-l-blue-500';
                      case 'pending_payment': 
                      case 'validated': 
                        return 'border-l-amber-500';
                      case 'draft': 
                        return 'border-l-gray-400';
                      default: 
                        return 'border-l-gray-400';
                    }
                  };

                  return (
                    <div key={order.id} className={`
                      relative bg-white/10 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl 
                      transition-all duration-300 p-6 hover:scale-[1.02] transform
                      border border-white/20 hover:border-white/40 hover:bg-white/20
                      ${getStatusBorder(order.status)} border-l-4
                    `}>
                      {/* Header - Statut principal et actions */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white/20 backdrop-blur-sm border border-white/20 ${getStatusColor(order.status)} shadow-sm`}>
                            {getStatusIcon(order.status)}
                            <span>{order.status_label}</span>
                          </span>
                          {order.status === 'draft' && (
                            <button
                              onClick={() => deleteOrder(order.id, order.name)}
                              className="p-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-lg transition-all duration-200 shadow-sm border border-red-200"
                              title="Supprimer la commande"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-gray-900">
                            {order.totalAmount?.toFixed(2)} €
                          </div>
                          <div className="text-sm font-semibold text-green-600">
                            +{orderMargins[order.id] !== undefined ? orderMargins[order.id].toFixed(2) : '...'} € marge
                          </div>
                          <div className="text-xs text-gray-800 font-medium">
                            {order.totalItems} article{order.totalItems > 1 ? 's' : ''}
                          </div>
                          {order.shippingCost > 0 && (
                            <div className="text-xs text-gray-700 mt-1">
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                Livraison: {order.shippingCost.toFixed(2)}€
                              </span>
                            </div>
                          )}
                          {/* Badge TVA */}
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-xs text-gray-500">TVA:</span>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                              order.vatType === 'marginal' 
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {order.vatType === 'marginal' ? 'M' : 'R'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Infos client */}
                      <div className="mb-3">
                        {order.client ? (
                          <div className="bg-blue-50/40 backdrop-blur-sm rounded-lg p-3 border border-blue-200/40">
                            <div className="flex items-center space-x-2 mb-1">
                              <User className="h-4 w-4 text-blue-600" />
                              <span className="font-medium text-blue-900">{order.client.company_name}</span>
                            </div>
                            <div className="text-sm text-blue-700">{order.client.contact_name}</div>
                          </div>
                        ) : (
                          <div className="bg-gray-50/40 backdrop-blur-sm rounded-lg p-3 border border-gray-200/40">
                            <span className="text-sm text-gray-500 italic">Client non assigné</span>
                          </div>
                        )}
                      </div>

                      {/* Infos principales */}
                      <div className="space-y-3 mb-5">
                        <div className="flex items-center text-sm text-gray-800">
                          <Calendar className="h-4 w-4 mr-2 text-gray-600" />
                          <span className="font-medium">{new Date(order.createdAt).toLocaleDateString('fr-FR')}</span>
                        </div>
                        
                        {order.tracking_number && (
                          <a
                            href={getFedExTrackingUrl(order.tracking_number)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-sm text-blue-700 bg-blue-50/40 px-3 py-2 rounded-lg backdrop-blur-sm hover:bg-blue-100/50 hover:text-blue-800 transition-all duration-200 cursor-pointer group border border-blue-200/40 hover:border-blue-300/60"
                          >
                            <Truck className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                            <span className="font-medium">Tracking: {order.tracking_number}</span>
                            <ExternalLink className="h-3 w-3 ml-1 opacity-60 group-hover:opacity-100 transition-opacity" />
                          </a>
                        )}

                        <div className="text-xs text-gray-700 font-mono bg-white/40 px-3 py-2 rounded-lg backdrop-blur-sm border border-gray-200/40">
                          {order.name || order.id}
                        </div>
                      </div>

                      {/* Action principale */}
                      <button
                        onClick={() => handleOrderClick(order.id)}
                        className="w-full px-4 py-2 bg-white/20 hover:bg-white/40 text-gray-800 hover:text-gray-900 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm backdrop-blur-md border border-white/30 hover:border-white/50 hover:shadow-md"
                      >
                        <Eye className="h-4 w-4 inline mr-2" />
                        Voir les détails
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Vue Desktop - Tableau Responsive (≥1024px) */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/40 backdrop-blur-sm border-b border-gray-200/40">
                    <tr>
                      {/* Colonnes visibles selon breakpoints */}
                      <th className="hidden xl:table-cell px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Numéro
                      </th>
                      <th className="hidden xl:table-cell px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="hidden xl:table-cell px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Articles
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Montant
                      </th>
                      <th className="hidden 2xl:table-cell px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Marge
                      </th>
                      <th className="hidden xl:table-cell px-4 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        TVA
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/20 backdrop-blur-sm divide-y divide-gray-200/40">
                    {filteredOrders.map((order, index) => {
                      const getRowBackground = (status: string, index: number) => {
                        const baseClass = index % 2 === 0 ? 'bg-white/10' : 'bg-white/20';
                        const hoverClass = 'hover:bg-white/30';
                        const statusAccent = (() => {
                          switch (status) {
                            case 'completed': return 'hover:border-l-green-500';
                            case 'shipping': return 'hover:border-l-blue-500';
                            case 'pending_payment':
                            case 'validated': return 'hover:border-l-amber-500';
                            case 'draft': return 'hover:border-l-gray-400';
                            default: return 'hover:border-l-gray-400';
                          }
                        })();
                        return `${baseClass} ${hoverClass} ${statusAccent} backdrop-blur-sm transition-all duration-200 hover:shadow-lg border-l-2 border-l-transparent hover:border-l-4`;
                      };

                      return (
                        <tr key={order.id} className={getRowBackground(order.status, index)}>
                          {/* Numéro - Visible XL+ */}
                          <td className="hidden xl:table-cell px-4 py-4">
                            <div className="max-w-xs">
                              <div className="text-sm font-medium text-gray-900 truncate">{order.id}</div>
                              {order.name && (
                                <div className="text-xs text-gray-600 truncate">{order.name}</div>
                              )}
                            </div>
                          </td>

                          {/* Client - Visible XL+ */}
                          <td className="hidden xl:table-cell px-4 py-4">
                            <div className="max-w-xs">
                              {order.client ? (
                                <div>
                                  <div className="text-sm font-medium text-gray-900 truncate">{order.client.company_name}</div>
                                  <div className="text-xs text-gray-600 truncate">{order.client.contact_name}</div>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400 italic">Non assigné</span>
                              )}
                            </div>
                          </td>

                          {/* Statut - Toujours visible */}
                          <td className="px-4 py-4">
                            <div className="flex flex-col space-y-1">
                              <span className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-sm border ${getStatusColor(order.status)} w-fit shadow-sm`}>
                                {getStatusIcon(order.status)}
                                <span className="hidden lg:inline">{order.status_label}</span>
                              </span>
                              {order.tracking_number && (
                                <a
                                  href={getFedExTrackingUrl(order.tracking_number)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center space-x-1 text-xs text-blue-700 bg-blue-50/60 px-2 py-1 rounded-lg backdrop-blur-sm hover:bg-blue-100/70 hover:text-blue-800 transition-all duration-200 cursor-pointer group border border-blue-200/60 hover:border-blue-300/70"
                                >
                                  <Truck className="h-3 w-3 group-hover:scale-110 transition-transform" />
                                  <span className="hidden xl:inline">Tracking: </span>
                                  <span className="truncate max-w-20">{order.tracking_number}</span>
                                  <ExternalLink className="h-2 w-2 opacity-60 group-hover:opacity-100 transition-opacity" />
                                </a>
                              )}
                              {/* Infos client sur mobile et tablet */}
                              <div className="xl:hidden">
                                {order.client ? (
                                  <div className="text-xs text-gray-600 truncate max-w-32">
                                    {order.client.company_name}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-400 italic">Non assigné</div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Date - Toujours visible */}
                          <td className="px-4 py-4">
                            <div className="flex items-center text-sm text-gray-900">
                              <Calendar className="h-4 w-4 mr-1 text-gray-500" />
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
                              <Package className="h-4 w-4 mr-1 text-gray-500" />
                              {order.totalItems} article{order.totalItems > 1 ? 's' : ''}
                            </div>
                          </td>

                          {/* Montant - Toujours visible */}
                          <td className="px-4 py-4">
                            <div className="text-sm font-semibold text-gray-900">
                              <div className="flex items-center">
                                <Euro className="h-4 w-4 mr-1 text-gray-500" />
                                {order.totalAmount?.toFixed(2)} €
                              </div>
                              <div className="xl:hidden text-xs text-gray-500 mt-1">
                                {order.totalItems} article{order.totalItems > 1 ? 's' : ''}
                              </div>
                              {/* Marge sur mobile et tablet */}
                              <div className="2xl:hidden text-xs text-green-600 font-semibold mt-1">
                                +{orderMargins[order.id] !== undefined ? orderMargins[order.id].toFixed(2) : '...'} € marge
                              </div>
                              {order.shippingCost > 0 && (
                                <div className="text-xs text-blue-700 mt-1">
                                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                    Livraison: {order.shippingCost.toFixed(2)}€
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Marge - Visible 2XL+ */}
                          <td className="hidden 2xl:table-cell px-4 py-4">
                            <div className="flex items-center text-sm font-semibold text-green-600">
                              <Euro className="h-4 w-4 mr-1 text-green-400" />
                              {orderMargins[order.id] !== undefined ? orderMargins[order.id].toFixed(2) : '...'} €
                            </div>
                          </td>

                          {/* TVA - Visible XL+ */}
                          <td className="hidden xl:table-cell px-4 py-4 text-center">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mx-auto ${
                              order.vatType === 'marginal' 
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {order.vatType === 'marginal' ? 'M' : 'R'}
                            </span>
                          </td>

                          {/* Actions - Toujours visible */}
                          <td className="px-4 py-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleOrderClick(order.id)}
                                className="px-4 py-2 !bg-white/20 hover:!bg-white/40 !text-gray-800 hover:!text-gray-900 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm backdrop-blur-md border border-white/30 hover:border-white/50 hover:shadow-md whitespace-nowrap"
                                style={{ 
                                  background: 'rgba(255, 255, 255, 0.2)', 
                                  color: '#1f2937',
                                  backgroundImage: 'none'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.4)';
                                  e.currentTarget.style.color = '#111827';
                                  e.currentTarget.style.backgroundImage = 'none';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                                  e.currentTarget.style.color = '#1f2937';
                                  e.currentTarget.style.backgroundImage = 'none';
                                }}
                              >
                                <Eye className="h-4 w-4 inline mr-1" />
                                <span className="hidden xl:inline">Détails</span>
                              </button>
                              {order.status === 'draft' && (
                                <button
                                  onClick={() => deleteOrder(order.id, order.name)}
                                  className="p-2 bg-white/20 hover:bg-white/40 text-red-600 hover:text-red-700 rounded-lg transition-all duration-200 backdrop-blur-md border border-red-200/30 hover:border-red-300/50"
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
                ? 'Aucune commande client trouvée' 
                : 'Aucune commande ne correspond à vos filtres.'
              }
            </p>
            <button
              onClick={() => router.push('/admin/catalog')}
              className="!bg-white/20 hover:!bg-white/40 !text-gray-800 hover:!text-gray-900 py-3 px-8 rounded-xl font-semibold shadow-lg backdrop-blur-md border border-white/30 hover:border-white/50 hover:shadow-xl transition-all duration-200"
              style={{ 
                background: 'rgba(255, 255, 255, 0.2)', 
                color: '#1f2937',
                backgroundImage: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.4)';
                e.currentTarget.style.color = '#111827';
                e.currentTarget.style.backgroundImage = 'none';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.color = '#1f2937';
                e.currentTarget.style.backgroundImage = 'none';
              }}
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