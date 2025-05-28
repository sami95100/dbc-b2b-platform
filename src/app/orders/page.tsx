'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DBCLogo from '../../components/DBCLogo';
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
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [orders, setOrders] = useState(mockOrders);
  const router = useRouter();

  // Charger les commandes brouillon depuis localStorage
  useEffect(() => {
    const loadDraftOrders = () => {
      try {
        const savedOrders = localStorage.getItem('draftOrders');
        if (savedOrders) {
          const draftOrders = JSON.parse(savedOrders);
          const ordersArray = Object.values(draftOrders).map((order: any) => {
            // Calculer le nombre d'articles et le montant total
            const items = order.items || {};
            const itemCount = Object.values(items).reduce((sum: number, qty: any) => sum + qty, 0);
            
            // Pour calculer le montant, on a besoin des prix des produits
            // On va utiliser les prix du catalogue mock
            const mockProducts = [
              { sku: 'IPH15-128-BLK', price: 849.99 },
              { sku: 'IPH15P-256-BLU', price: 1299.99 },
              { sku: 'SAM-S24-128-GRY', price: 699.99 },
              { sku: 'IPD-AIR-256-SLV', price: 749.99 },
              { sku: 'APW-S9-45-BLK', price: 449.99 },
              { sku: 'MBP-M3-512-SLV', price: 2199.99 },
              { sku: 'IPH14-256-RED', price: 699.99 },
              { sku: 'SAM-S23-512-WHT', price: 899.99 }
            ];
            
            const totalAmount = Object.entries(items).reduce((sum: number, [sku, qty]: [string, any]) => {
              const product = mockProducts.find(p => p.sku === sku);
              return sum + (product ? product.price * qty : 0);
            }, 0);

            return {
              ...order,
              itemCount,
              totalAmount,
              canDelete: true
            };
          });
          setOrders(ordersArray);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des commandes:', error);
      }
    };

    loadDraftOrders();
    
    // Écouter les changements dans localStorage
    const handleStorageChange = () => {
      loadDraftOrders();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Vérifier périodiquement les changements (pour les changements dans la même fenêtre)
    const interval = setInterval(loadDraftOrders, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const deleteOrder = (orderId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette commande brouillon ?')) {
      try {
        const savedOrders = localStorage.getItem('draftOrders');
        if (savedOrders) {
          const draftOrders = JSON.parse(savedOrders);
          delete draftOrders[orderId];
          localStorage.setItem('draftOrders', JSON.stringify(draftOrders));
          
          // Mettre à jour l'état local
          setOrders(prev => prev.filter(order => order.id !== orderId));
        }
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  const filteredOrders = selectedStatus === 'all' 
    ? orders 
    : orders.filter(order => order.status === selectedStatus);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'processing': return <Clock className="h-4 w-4" />;
      case 'pending': return <AlertCircle className="h-4 w-4" />;
      case 'draft': return <Package className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'draft': return 'bg-orange-100 text-orange-800';
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
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Filtrer par statut:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-sm border border-gray-300 rounded px-3 py-1 focus:ring-1 focus:ring-dbc-light-green focus:border-transparent"
              >
                <option value="all">Toutes</option>
                <option value="draft">Brouillons</option>
                <option value="pending">En attente</option>
                <option value="processing">En traitement</option>
                <option value="shipped">Expédiées</option>
                <option value="delivered">Livrées</option>
              </select>
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
                      <span>{order.statusLabel}</span>
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
                      {order.itemCount} article{order.itemCount > 1 ? 's' : ''}
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
                      {order.canDelete && (
                        <button
                          onClick={() => deleteOrder(order.id)}
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