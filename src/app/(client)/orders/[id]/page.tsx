'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth, withAuth } from '../../../../lib/auth-context';
import { 
  ArrowLeft, 
  Package, 
  Calendar, 
  Truck, 
  AlertCircle
} from 'lucide-react';

interface OrderItem {
  id: string;
  sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  name: string;
  status: string;
  status_label: string;
  created_at: string;
  updated_at: string;
  total_amount: number;
  total_items: number;
  customer_ref: string;
  vat_type: string;
  tracking_number?: string;
  order_items: OrderItem[];
}

function ClientOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les détails de la commande
  useEffect(() => {
    const loadOrderDetails = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        const result = await response.json();

        if (response.ok) {
          setOrder(result.order);
        } else {
          setError(result.error || 'Erreur lors du chargement de la commande');
        }
      } catch (err) {
        console.error('Erreur:', err);
        setError('Erreur lors du chargement de la commande');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      loadOrderDetails();
    }
  }, [orderId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending_payment': return 'bg-yellow-100 text-yellow-800';
      case 'validated': return 'bg-blue-100 text-blue-800';
      case 'shipping': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dbc-light-green mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la commande...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Commande introuvable</h1>
          <p className="text-gray-600 mb-4">{error || 'Cette commande n\'existe pas ou vous n\'avez pas les droits pour la consulter.'}</p>
          <button
            onClick={() => router.push('/orders')}
            className="px-4 py-2 bg-dbc-dark-green text-white rounded-lg hover:bg-opacity-90 transition-colors"
          >
            Retour à mes commandes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/orders')}
              className="p-2 bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-xl hover:bg-opacity-90 hover:shadow-lg transition-all duration-200"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-dbc-dark-green">{order.name}</h1>
              <p className="text-gray-600">Référence: {order.customer_ref}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
              {order.status_label}
            </span>
          </div>
        </div>

        <div className="space-y-6">
          {/* Résumé de la commande */}
          <div className="bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-xl p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-dbc-dark-green mb-4 flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Résumé de la commande
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Nombre d'articles</p>
                <p className="font-semibold text-lg">{order.total_items}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Montant total</p>
                <p className="font-semibold text-lg text-dbc-dark-green">{order.total_amount.toFixed(2)}€</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Commandé le</p>
                <p className="font-semibold">{formatDate(order.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Dernière MAJ</p>
                <p className="font-semibold">{formatDate(order.updated_at)}</p>
              </div>
            </div>

            {/* Numéro de suivi si disponible */}
            {order.tracking_number && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <Truck className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Numéro de suivi</p>
                    <p className="font-mono font-semibold text-blue-800">{order.tracking_number}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Articles de la commande */}
          <div className="bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-xl p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-dbc-dark-green mb-4">
              Articles commandés ({order.order_items.length})
            </h2>
            
            <div className="space-y-3">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.product_name}</p>
                    <p className="text-sm text-gray-600 font-mono">SKU: {item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {item.quantity} × {item.unit_price.toFixed(2)}€
                    </p>
                    <p className="text-lg font-bold text-dbc-dark-green">
                      {item.total_price.toFixed(2)}€
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="border-t border-gray-200 mt-6 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Total de la commande:</span>
                <span className="text-2xl font-bold text-dbc-dark-green">
                  {order.total_amount.toFixed(2)}€
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{order.vat_type}</p>
            </div>
          </div>

          {/* Chronologie simple */}
          <div className="bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-xl p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-dbc-dark-green mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Informations de la commande
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Date de création</p>
                <p className="font-medium">{formatDate(order.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Dernière modification</p>
                <p className="font-medium">{formatDate(order.updated_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Statut actuel</p>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                  {order.status_label}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Type de TVA</p>
                <p className="font-medium text-xs">{order.vat_type}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(ClientOrderDetailPage, 'client'); 