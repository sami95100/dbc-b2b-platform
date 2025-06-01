'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DBCLogo from '../../components/DBCLogo';
import OrderImportButton from '../../components/OrderImportButton';
import { supabase, Product } from '../../lib/supabase';
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

// Données de démonstration pour les commandes
const mockOrders: any[] = [];

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [orders, setOrders] = useState(mockOrders);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Fonction pour charger les commandes depuis Supabase
  const loadOrders = async () => {
    setLoading(true);
    try {
      console.log('📦 Chargement des commandes depuis Supabase uniquement...');
      
      // Charger toutes les commandes depuis Supabase
      const { data: supabaseOrders, error } = await supabase
        .from('orders')
        .select(`
          id,
          name,
          status,
          status_label,
          customer_ref,
          created_at,
          updated_at,
          total_amount,
          total_items,
          vat_type
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur chargement Supabase:', error);
        throw error;
      }

      console.log('✅ Commandes Supabase chargées:', supabaseOrders?.length || 0);

      // Convertir au format attendu
      const allOrders = supabaseOrders?.map(order => ({
        id: order.id, // Utiliser l'UUID Supabase
        name: order.name,
        status: order.status,
        status_label: order.status_label,
        createdAt: order.created_at,
        totalAmount: order.total_amount,
        totalItems: order.total_items,
        customerRef: order.customer_ref,
        vatType: order.vat_type,
        source: 'supabase'
      })) || [];

      console.log('📋 Commandes formatées:', allOrders.length);
      setOrders(allOrders);

    } catch (error) {
      console.error('❌ Erreur chargement commandes:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
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

  const deleteOrder = async (orderId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette commande ?')) {
      try {
        // Supprimer d'abord les items de commande
        const { error: itemsError } = await supabase
          .from('order_items')
          .delete()
          .eq('order_id', orderId);

        if (itemsError) throw itemsError;

        // Puis supprimer la commande
        const { error: orderError } = await supabase
          .from('orders')
          .delete()
          .eq('id', orderId);

        if (orderError) throw orderError;

        alert('✅ Commande supprimée avec succès');
        
        // Recharger les commandes
        loadOrders();
        
      } catch (error) {
        console.error('❌ Erreur lors de la suppression:', error);
        alert('❌ Erreur lors de la suppression de la commande');
      }
    }
  };

  const handleImportComplete = (result: any) => {
    if (result.success && result.order) {
      console.log('✅ Import terminé:', result);
      
      // Recharger les commandes depuis Supabase
      loadOrders();
      
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
      router.push(`/orders/${result.order.id}`);
      
    } else if (result.error) {
      console.error('❌ Erreur import:', result.error);
      // L'erreur est déjà gérée dans le composant
    }
  };

  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(order => order.status === statusFilter);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'shipping': return <Truck className="h-4 w-4" />;
      case 'pending_payment': return <AlertCircle className="h-4 w-4" />;
      case 'draft': return <Package className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'shipping': return 'bg-blue-100 text-blue-800';
      case 'pending_payment': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-dbc-dark-green shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <DBCLogo />
                <h1 className="text-xl font-bold text-white">DBC Electronics</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => router.push('/orders')}
                className="relative hover:text-dbc-bright-green transition-colors"
              >
                <ShoppingCart className="h-6 w-6 text-white" />
              </button>
              
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-white" />
                <span className="text-sm text-white">Demo User</span>
              </div>
              
              <button className="text-white hover:text-dbc-bright-green transition-colors">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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

        {/* Titre et filtres */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Mes commandes</h1>
            
            <div className="flex items-center space-x-4">
              <OrderImportButton onImportComplete={handleImportComplete} />
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Filtrer par statut:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-3 py-1 focus:ring-1 focus:ring-dbc-light-green focus:border-transparent"
                >
                  <option value="all">Toutes</option>
                  <option value="draft">Brouillons</option>
                  <option value="pending_payment">En attente de paiement</option>
                  <option value="shipping">En cours de livraison</option>
                  <option value="completed">Terminées</option>
                </select>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            {filteredOrders.length} commande{filteredOrders.length > 1 ? 's' : ''} trouvée{filteredOrders.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Tableau des commandes */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
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
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span>{order.status_label}</span>
                    </span>
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
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => router.push(`/orders/${order.id}`)}
                        className="text-dbc-light-green hover:text-dbc-dark-green text-sm font-medium"
                      >
                        Voir détails →
                      </button>
                      {order.source === 'supabase' && (
                        <button
                          onClick={() => deleteOrder(order.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Supprimer cette commande"
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
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune commande trouvée</h3>
            <p className="text-gray-600 mb-4">Vous n'avez pas encore passé de commande</p>
            <button
              onClick={() => router.push('/catalog')}
              className="bg-dbc-light-green text-white py-2 px-6 rounded-lg hover:bg-green-600 transition-colors"
            >
              Voir le catalogue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}