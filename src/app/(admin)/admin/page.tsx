'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, withAuth } from '../../../lib/auth-context';
import { supabase } from '../../../lib/supabase';
import {
  BarChart3,
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  Euro,
  Eye,
  Plus,
  ArrowRight,
  DollarSign,
  FileText,
  CheckCircle,
  ChevronDown,
  Bell,
  Clock,
  AlertCircle
} from 'lucide-react';

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number; // Commandes payées seulement
  totalMargin: number; // Marge totale réelle (vente - achat)
  totalClients: number;
  draftRevenue: number; // Commandes en brouillon
  validatedRevenue: number; // Commandes validées (pending_payment, shipping, etc.)
  recentOrders: OrderWithMargin[];
  topSellingModels: any[]; // Modèles les plus vendus par product_name avec marge
  // Nouvelles notifications
  pendingOrdersCount: number; // Commandes en attente de traitement
  draftOrdersCount: number; // Commandes en brouillon
  recentDraftOrders: OrderWithMargin[]; // Dernières commandes brouillons
  recentPendingOrders: OrderWithMargin[]; // Dernières commandes en attente
  pendingUsersCount: number; // Ajout du nombre d'utilisateurs en attente
}

interface OrderWithMargin {
  id: string;
  name: string;
  status: string;
  created_at: string;
  total_amount: number;
  margin: number;
  users?: {
    company_name: string;
  }[];
}

function AdminDashboard() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalRevenue: 0,
    totalMargin: 0,
    totalClients: 0,
    draftRevenue: 0,
    validatedRevenue: 0,
    recentOrders: [],
    topSellingModels: [],
    pendingOrdersCount: 0,
    draftOrdersCount: 0,
    recentDraftOrders: [],
    recentPendingOrders: [],
    pendingUsersCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'quantity' | 'margin' | 'revenue'>('quantity');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    setLoading(true);
    try {
      // Charger les statistiques en parallèle
      const [ordersRes, draftOrdersRes, clientsRes, marginRes, topModelsRes, debugDataRes, pendingUsersRes] = await Promise.all([
        // Statistiques des commandes (hors brouillons)
        supabase
          .from('orders')
          .select('id, total_amount, status, created_at, name, users!inner(company_name)')
          .neq('status', 'draft')
          .order('created_at', { ascending: false }),
        
        // Commandes en brouillon séparément
        supabase
          .from('orders')
          .select('id, total_amount, status, created_at, name, users!inner(company_name)')
          .eq('status', 'draft')
          .order('created_at', { ascending: false }),
        
        // Statistiques des clients
        supabase
          .from('users')
          .select('id, company_name, email, created_at')
          .eq('role', 'client')
          .eq('is_active', true),

        // Marge totale réelle (directement calculée en SQL)
        supabase
          .rpc('get_total_margin_completed_orders'),

        // Top 20 des modèles les plus vendus avec marges (pour permettre le tri)
        supabase
          .rpc('get_top_selling_models_completed_orders', { limit_count: 20 }),

        // Fonction de debug
        supabase
          .rpc('debug_margin_data'),

        // Utilisateurs en attente de validation
        supabase
          .from('users')
          .select('id', { count: 'exact' })
          .eq('role', 'client')
          .eq('is_active', false)
      ]);

      // Traiter les commandes
      const orders = ordersRes.data || [];
      const draftOrders = draftOrdersRes.data || [];
      const totalOrders = orders.length;
      
      // Calculer les revenus par statut
      const completedOrders = orders.filter(order => order.status === 'completed');
      const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      
      const draftRevenue = draftOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      
      const validatedOrders = orders.filter(order => 
        ['pending_payment', 'shipping', 'processing'].includes(order.status)
      );
      const validatedRevenue = validatedOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      
      // Notifications pour nouvelles commandes
      const pendingOrdersCount = validatedOrders.length;
      const draftOrdersCount = draftOrders.length;
      
      // Récupérer les 5 commandes les plus récentes et calculer leur marge
      const recentOrdersBase = orders.slice(0, 5);
      
      // Récupérer les commandes récentes pour notifications
      const recentDraftOrdersBase = draftOrders.slice(0, 3);
      const recentPendingOrdersBase = validatedOrders.slice(0, 3);
      
      // Calculer la marge pour chaque commande récente
      const recentOrdersWithMargin = await Promise.all(
        recentOrdersBase.map(async (order) => {
          try {
            const marginRes = await supabase
              .rpc('get_order_margin_by_id', { order_uuid: order.id });
            
            return {
              ...order,
              margin: marginRes.data || 0
            };
          } catch (error) {
            console.error(`❌ Erreur calcul marge commande ${order.id}:`, error);
            return {
              ...order,
              margin: 0
            };
          }
        })
      );

      // Récupérer la marge totale calculée côté serveur
      const totalMargin = marginRes.data || 0;
      console.log(`📈 Marge totale (calculée en SQL): ${totalMargin}€`);

      // DEBUG: Vérification des données brutes
      console.log('🔍 DEBUG - Réponse marginRes:', marginRes);
      console.log('🔍 DEBUG - Réponse topModelsRes:', topModelsRes);
      console.log('🔍 DEBUG - Données d\'analyse:', debugDataRes.data);
      
      // Ajout d'une requête debug pour vérifier le nombre de produits dans order_item_imei
      const itemsDebugRes = await supabase
        .from('order_item_imei')
        .select('*, order_items!inner(*, orders!inner(status))')
        .eq('order_items.orders.status', 'completed');
      
      console.log(`🔍 DEBUG - Nombre de produits order_item_imei avec commandes completed: ${itemsDebugRes.data?.length || 0}`);
      if (itemsDebugRes.data && itemsDebugRes.data.length > 0) {
        const sampleProducts = itemsDebugRes.data.slice(0, 5);
        console.log('🔍 DEBUG - Échantillon de produits:', sampleProducts.map((p: any) => ({
          product_name: p.product_name,
          dbc_price: p.dbc_price,
          supplier_price: p.supplier_price,
          margin: p.dbc_price - p.supplier_price,
          order_status: p.order_items?.orders?.status
        })));
        
        // Calcul manuel de la marge totale
        const manualMargin = itemsDebugRes.data.reduce((sum: number, item: any) => 
          sum + (item.dbc_price - item.supplier_price), 0);
        console.log(`🔍 DEBUG - Marge calculée manuellement: ${manualMargin}€`);
        
        // Statistiques détaillées
        const totalCa = itemsDebugRes.data.reduce((sum: number, item: any) => sum + item.dbc_price, 0);
        const totalCost = itemsDebugRes.data.reduce((sum: number, item: any) => sum + item.supplier_price, 0);
        console.log(`🔍 DEBUG - CA total calculé manuellement: ${totalCa}€`);
        console.log(`🔍 DEBUG - Coût total calculé manuellement: ${totalCost}€`);
      }

      // Récupérer les modèles les plus vendus calculés côté serveur
      const topSellingModels = (topModelsRes.data || []).map((model: any) => ({
        modelName: model.modelname || model.modelName || 'Produit inconnu',
        totalQuantity: parseInt(model.totalquantity || model.totalQuantity || 0),
        totalRevenue: parseFloat(model.totalrevenue || model.totalRevenue || 0),
        totalMargin: parseFloat(model.totalmargin || model.totalMargin || 0)
      }));
      console.log('🎯 Top 5 modèles (calculés en SQL):', topSellingModels);

      // Traiter les clients
      const clients = clientsRes.data || [];
      const totalClients = clients.length;

      // Calculer les marges pour les commandes de notification (optionnel, on peut laisser à 0 pour l'instant)
      const recentDraftOrdersWithMargin = recentDraftOrdersBase.map(order => ({
        ...order,
        margin: 0 // Les brouillons n'ont pas encore de marge calculée
      }));
      
      const recentPendingOrdersWithMargin = recentPendingOrdersBase.map(order => ({
        ...order,
        margin: 0 // Sera calculé si nécessaire
      }));

      // Récupérer le nombre d'utilisateurs en attente
      const pendingUsersCount = pendingUsersRes.count || 0;
      console.log(`👥 Utilisateurs en attente de validation: ${pendingUsersCount}`);

      setStats({
        totalOrders,
        totalRevenue,
        totalMargin,
        totalClients,
        draftRevenue,
        validatedRevenue,
        recentOrders: recentOrdersWithMargin,
        topSellingModels,
        pendingOrdersCount,
        draftOrdersCount,
        recentDraftOrders: recentDraftOrdersWithMargin,
        recentPendingOrders: recentPendingOrdersWithMargin,
        pendingUsersCount
      });

    } catch (error) {
      console.error('❌ Erreur chargement statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      await signOut();
    }
  };

  // Fonction pour trier les modèles selon le critère sélectionné et prendre les 5 premiers
  const sortedModels = [...stats.topSellingModels].sort((a, b) => {
    switch (sortBy) {
      case 'quantity':
        return (b.totalQuantity || 0) - (a.totalQuantity || 0);
      case 'margin':
        return (b.totalMargin || 0) - (a.totalMargin || 0);
      case 'revenue':
        return (b.totalRevenue || 0) - (a.totalRevenue || 0);
      default:
        return 0;
    }
  }).slice(0, 5); // Prendre seulement les 5 premiers après tri

  const getSortLabel = () => {
    switch (sortBy) {
      case 'quantity': return 'Quantité';
      case 'margin': return 'Marge';
      case 'revenue': return 'CA';
      default: return 'Quantité';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dbc-light-green mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50">
      {/* Header Admin */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Tableau de bord Administrateur</h1>
              <p className="text-gray-600">Bienvenue, {user?.contact_name}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Cartes de statistiques principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Commandes</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalOrders}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">CA Payé</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalRevenue.toFixed(0)} €</p>
                <p className="text-xs text-gray-500 mt-1">Commandes terminées</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Marge Réelle</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalMargin.toFixed(0)} €</p>
                <p className="text-xs text-gray-500 mt-1">Vente client - Achat réel</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Clients actifs</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalClients}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Section Notifications */}
        {(stats.pendingOrdersCount > 0 || stats.draftOrdersCount > 0 || stats.pendingUsersCount > 0) && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <Bell className="h-5 w-5 mr-2 text-orange-500" />
              Notifications
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Inscriptions en attente */}
              {stats.pendingUsersCount > 0 && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="bg-purple-100 p-2 rounded-lg mr-3">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-purple-800">Nouvelles inscriptions</h3>
                        <p className="text-sm text-purple-600">{stats.pendingUsersCount} client(s) à valider</p>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push('/admin/clients')}
                      className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
                    >
                      Valider
                    </button>
                  </div>
                  <div className="bg-white bg-opacity-60 rounded-lg p-3">
                    <p className="text-sm text-purple-700 font-medium">Priorité haute</p>
                    <p className="text-xs text-purple-600">Valider rapidement pour fidéliser les nouveaux clients</p>
                  </div>
                </div>
              )}
              {/* Commandes en brouillon */}
              {stats.draftOrdersCount > 0 && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="bg-yellow-100 p-2 rounded-lg mr-3">
                        <FileText className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-yellow-800">Brouillons en attente</h3>
                        <p className="text-sm text-yellow-600">{stats.draftOrdersCount} commande(s) à finaliser</p>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push('/admin/orders?status=draft')}
                      className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium"
                    >
                      Voir tout
                    </button>
                  </div>
                  {stats.recentDraftOrders.length > 0 && (
                    <div className="space-y-2">
                      {stats.recentDraftOrders.slice(0, 2).map((order, index) => (
                        <div 
                          key={index} 
                          onClick={() => router.push(`/admin/orders/${order.id}`)}
                          className="bg-white bg-opacity-60 rounded-lg p-3 cursor-pointer hover:bg-opacity-80 transition-all"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-gray-800 text-sm">{order.name}</p>
                              <p className="text-xs text-gray-600">{order.users?.[0]?.company_name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-800">{order.total_amount?.toFixed(2)} €</p>
                              <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Commandes en attente de traitement */}
              {stats.pendingOrdersCount > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="bg-blue-100 p-2 rounded-lg mr-3">
                        <Clock className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-blue-800">Commandes à traiter</h3>
                        <p className="text-sm text-blue-600">{stats.pendingOrdersCount} commande(s) en attente</p>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push('/admin/orders?status=pending_payment')}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                    >
                      Traiter
                    </button>
                  </div>
                  {stats.recentPendingOrders.length > 0 && (
                    <div className="space-y-2">
                      {stats.recentPendingOrders.slice(0, 2).map((order, index) => (
                        <div 
                          key={index} 
                          onClick={() => router.push(`/admin/orders/${order.id}`)}
                          className="bg-white bg-opacity-60 rounded-lg p-3 cursor-pointer hover:bg-opacity-80 transition-all"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-gray-800 text-sm">{order.name}</p>
                              <p className="text-xs text-gray-600">{order.users?.[0]?.company_name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-800">{order.total_amount?.toFixed(2)} €</p>
                              <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cartes de revenus séparés */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">CA Brouillons</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.draftRevenue.toFixed(0)} €</p>
                <p className="text-xs text-gray-500 mt-1">Commandes en brouillon</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <FileText className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">CA Validé</p>
                <p className="text-2xl font-bold text-blue-600">{stats.validatedRevenue.toFixed(0)} €</p>
                <p className="text-xs text-gray-500 mt-1">En attente/expédition</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Euro className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation rapide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => router.push('/admin/catalog')}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Gestion Catalogue</h3>
            <p className="text-gray-600 text-sm">Gérer les produits, stocks et prix</p>
          </button>

          <button
            onClick={() => router.push('/admin/orders')}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-green-600" />
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Commandes Clients</h3>
            <p className="text-gray-600 text-sm">Traiter et suivre les commandes</p>
          </button>

          <button
            onClick={() => router.push('/admin/clients')}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Gestion Clients</h3>
            <p className="text-gray-600 text-sm">Voir et gérer les comptes clients</p>
          </button>
        </div>

        {/* Sections d'informations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Commandes récentes */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Commandes Récentes</h3>
              <button
                onClick={() => router.push('/admin/orders')}
                className="text-dbc-light-green hover:text-dbc-dark-green text-sm font-medium"
              >
                Voir tout
              </button>
            </div>
            <div className="space-y-4">
              {stats.recentOrders.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucune commande récente</p>
              ) : (
                stats.recentOrders.map((order, index) => (
                  <div 
                    key={index} 
                    onClick={() => router.push(`/admin/orders/${order.id}`)}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 rounded-lg px-2 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 hover:text-dbc-dark-green transition-colors">{order.name}</p>
                      <p className="text-sm text-gray-500">
                        {order.users?.[0]?.company_name} • {new Date(order.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="font-medium text-gray-800">{order.total_amount?.toFixed(2)} €</p>
                          <p className="text-sm text-green-600 font-medium">
                            Marge: {order.margin?.toFixed(2) || '0.00'} €
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'shipping' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Modèles les plus vendus */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold text-gray-800">Modèles les Plus Vendus</h3>
                <div className="relative">
                  <button
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 px-3 py-1 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <span>Trier par {getSortLabel()}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {showSortDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setSortBy('quantity');
                            setShowSortDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                            sortBy === 'quantity' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          Quantité vendue
                        </button>
                        <button
                          onClick={() => {
                            setSortBy('margin');
                            setShowSortDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                            sortBy === 'margin' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          Marge générée
                        </button>
                        <button
                          onClick={() => {
                            setSortBy('revenue');
                            setShowSortDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                            sortBy === 'revenue' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          Chiffre d'affaires
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => router.push('/admin/metrics')}
                className="text-dbc-light-green hover:text-dbc-dark-green text-sm font-medium flex items-center space-x-1"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Voir Metrics</span>
              </button>
            </div>
            <div className="space-y-4">
              {sortedModels.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucune vente enregistrée</p>
              ) : (
                sortedModels.map((model, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-dbc-light-green to-dbc-dark-green rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{model.modelName}</p>
                        <div className="flex items-center space-x-3 text-sm text-gray-500">
                          <span>CA: {(model.totalRevenue || 0).toFixed(0)} €</span>
                          <span>•</span>
                          <span className="text-green-600 font-medium">
                            Marge: {(model.totalMargin || 0).toFixed(0)} €
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        {model.totalQuantity || 0} vendus
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Protéger la page pour les admins uniquement
export default withAuth(AdminDashboard, 'admin'); 