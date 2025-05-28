'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DBCLogo from '../../../components/DBCLogo';
import { 
  User, 
  LogOut, 
  ShoppingCart,
  Package,
  Calendar,
  Euro,
  ChevronRight,
  ArrowLeft,
  CheckCircle,
  Truck,
  Clock,
  AlertCircle,
  Download,
  FileText,
  Plus,
  Minus,
  Trash2,
  Check
} from 'lucide-react';

// Données des produits pour récupérer les détails
const mockProducts = [
  {
    sku: 'IPH15-128-BLK',
    name: 'iPhone 15 128GB',
    manufacturer: 'Apple',
    appearance: 'Grade A',
    functionality: 'Working',
    color: 'Black',
    boxed: 'Unboxed',
    additional_info: '-',
    price_dbc: 849.99
  },
  {
    sku: 'IPH15P-256-BLU',
    name: 'iPhone 15 Pro 256GB',
    manufacturer: 'Apple',
    appearance: 'Grade A+',
    functionality: 'Working',
    color: 'Blue Titanium',
    boxed: 'Boxed',
    additional_info: 'Original accessories',
    price_dbc: 1299.99
  },
  {
    sku: 'SAM-S24-128-GRY',
    name: 'Samsung Galaxy S24 128GB',
    manufacturer: 'Samsung',
    appearance: 'Grade A',
    functionality: 'Working',
    color: 'Gray',
    boxed: 'Unboxed',
    additional_info: '-',
    price_dbc: 699.99
  },
  {
    sku: 'IPD-AIR-256-SLV',
    name: 'iPad Air 256GB',
    manufacturer: 'Apple',
    appearance: 'Grade A',
    functionality: 'Working',
    color: 'Silver',
    boxed: 'Boxed',
    additional_info: 'WiFi + Cellular',
    price_dbc: 749.99
  },
  {
    sku: 'APW-S9-45-BLK',
    name: 'Apple Watch Series 9 45mm',
    manufacturer: 'Apple',
    appearance: 'Grade A+',
    functionality: 'Working',
    color: 'Black',
    boxed: 'Boxed',
    additional_info: 'Sport Band',
    price_dbc: 449.99
  },
  {
    sku: 'MBP-M3-512-SLV',
    name: 'MacBook Pro M3 512GB',
    manufacturer: 'Apple',
    appearance: 'Grade A',
    functionality: 'Working',
    color: 'Silver',
    boxed: 'Boxed',
    additional_info: '14-inch',
    price_dbc: 2199.99
  },
  {
    sku: 'IPH14-256-RED',
    name: 'iPhone 14 256GB',
    manufacturer: 'Apple',
    appearance: 'Grade B',
    functionality: 'Working',
    color: 'Red',
    boxed: 'Unboxed',
    additional_info: 'Minor scratches',
    price_dbc: 699.99
  },
  {
    sku: 'SAM-S23-512-WHT',
    name: 'Samsung Galaxy S23 512GB',
    manufacturer: 'Samsung',
    appearance: 'Grade A',
    functionality: 'Working',
    color: 'White',
    boxed: 'Boxed',
    additional_info: 'Dual SIM',
    price_dbc: 899.99
  }
];

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editableQuantities, setEditableQuantities] = useState<{[key: string]: number}>({});
  const router = useRouter();

  const loadOrderDetail = () => {
    try {
      const savedOrders = localStorage.getItem('draftOrders');
      if (savedOrders) {
        const draftOrders = JSON.parse(savedOrders);
        const order = draftOrders[params.id];
        
        if (order) {
          // Construire les détails des articles avec les informations complètes
          const items = Object.entries(order.items || {}).map(([sku, quantity]: [string, any]) => {
            const product = mockProducts.find(p => p.sku === sku);
            if (product) {
              return {
                sku: product.sku,
                name: product.name,
                manufacturer: product.manufacturer,
                appearance: product.appearance,
                functionality: product.functionality,
                color: product.color,
                boxed: product.boxed,
                additional_info: product.additional_info,
                quantity: quantity,
                unitPrice: product.price_dbc,
                totalPrice: product.price_dbc * quantity
              };
            }
            return null;
          }).filter(Boolean);

          const totalItems = items.reduce((sum, item: any) => sum + item.quantity, 0);
          const totalAmount = items.reduce((sum, item: any) => sum + item.totalPrice, 0);

          setOrderDetail({
            ...order,
            items,
            totalItems,
            totalAmount,
            customerRef: 'DBC-CLIENT-001',
            vatType: 'Bien d\'occasion - TVA calculée sur la marge, non récupérable'
          });

          // Initialiser les quantités éditables
          const quantities = items.reduce((acc: any, item: any) => {
            acc[item.sku] = item.quantity;
            return acc;
          }, {});
          setEditableQuantities(quantities);
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors du chargement de la commande:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrderDetail();
  }, [params.id]);

  const updateQuantity = (sku: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setEditableQuantities(prev => ({
      ...prev,
      [sku]: newQuantity
    }));

    // Mettre à jour dans localStorage
    try {
      const savedOrders = localStorage.getItem('draftOrders');
      if (savedOrders) {
        const draftOrders = JSON.parse(savedOrders);
        if (draftOrders[params.id]) {
          draftOrders[params.id].items[sku] = newQuantity;
          localStorage.setItem('draftOrders', JSON.stringify(draftOrders));
          
          // Recharger les détails
          loadOrderDetail();
        }
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    }
  };

  const removeItem = (sku: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce produit de la commande ?')) {
      try {
        const savedOrders = localStorage.getItem('draftOrders');
        if (savedOrders) {
          const draftOrders = JSON.parse(savedOrders);
          if (draftOrders[params.id]) {
            delete draftOrders[params.id].items[sku];
            localStorage.setItem('draftOrders', JSON.stringify(draftOrders));
            
            // Recharger les détails
            loadOrderDetail();
          }
        }
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  const validateOrder = () => {
    if (window.confirm('Êtes-vous sûr de vouloir valider cette commande ? Elle passera en statut "En attente de paiement".')) {
      try {
        const savedOrders = localStorage.getItem('draftOrders');
        if (savedOrders) {
          const draftOrders = JSON.parse(savedOrders);
          if (draftOrders[params.id]) {
            // Changer le statut
            draftOrders[params.id].status = 'pending';
            draftOrders[params.id].statusLabel = 'En attente de paiement';
            draftOrders[params.id].canDelete = false;
            
            localStorage.setItem('draftOrders', JSON.stringify(draftOrders));
            
            // Supprimer la commande active si c'est celle-ci
            const currentOrder = localStorage.getItem('currentDraftOrder');
            if (currentOrder === params.id) {
              localStorage.removeItem('currentDraftOrder');
            }
            
            // Recharger les détails
            loadOrderDetail();
            
            alert('Commande validée avec succès !');
          }
        }
      } catch (error) {
        console.error('Erreur lors de la validation:', error);
      }
    }
  };

  const deleteOrder = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette commande brouillon ?')) {
      try {
        const savedOrders = localStorage.getItem('draftOrders');
        if (savedOrders) {
          const draftOrders = JSON.parse(savedOrders);
          delete draftOrders[params.id];
          localStorage.setItem('draftOrders', JSON.stringify(draftOrders));
          
          // Supprimer la commande active si c'est celle-ci
          const currentOrder = localStorage.getItem('currentDraftOrder');
          if (currentOrder === params.id) {
            localStorage.removeItem('currentDraftOrder');
          }
          
          router.push('/orders');
        }
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="h-5 w-5" />;
      case 'shipped': return <Truck className="h-5 w-5" />;
      case 'processing': return <Clock className="h-5 w-5" />;
      case 'pending': return <AlertCircle className="h-5 w-5" />;
      case 'draft': return <Package className="h-5 w-5" />;
      default: return <Package className="h-5 w-5" />;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dbc-light-green mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la commande...</p>
        </div>
      </div>
    );
  }

  if (!orderDetail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Commande introuvable</h3>
          <p className="text-gray-600 mb-4">Cette commande n'existe pas ou a été supprimée</p>
          <button
            onClick={() => router.push('/orders')}
            className="bg-dbc-light-green text-white py-2 px-6 rounded-lg hover:bg-green-600 transition-colors"
          >
            Retour aux commandes
          </button>
        </div>
      </div>
    );
  }

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
          <button
            onClick={() => router.push('/orders')}
            className="text-dbc-light-green hover:text-dbc-dark-green"
          >
            Mes commandes
          </button>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <span className="text-gray-900 font-medium">{orderDetail.id}</span>
        </div>

        {/* Retour */}
        <button
          onClick={() => router.push('/orders')}
          className="flex items-center space-x-2 text-dbc-light-green hover:text-dbc-dark-green mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Retour aux commandes</span>
        </button>

        {/* Informations de la commande */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {orderDetail.name || `Commande ${orderDetail.id}`}
              </h1>
              <div className="flex items-center space-x-4">
                <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(orderDetail.status)}`}>
                  {getStatusIcon(orderDetail.status)}
                  <span>{orderDetail.statusLabel}</span>
                </span>
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-1" />
                  Créée le {new Date(orderDetail.createdAt).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {orderDetail.status === 'draft' && (
                <>
                  <button
                    onClick={deleteOrder}
                    className="flex items-center space-x-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Supprimer</span>
                  </button>
                  <button
                    onClick={validateOrder}
                    className="flex items-center space-x-2 px-4 py-2 bg-dbc-light-green text-white rounded-lg hover:bg-green-600 text-sm"
                  >
                    <Check className="h-4 w-4" />
                    <span>Valider commande</span>
                  </button>
                </>
              )}
              
              {orderDetail.status !== 'draft' && (
                <>
                  <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                    <FileText className="h-4 w-4" />
                    <span>Facture</span>
                  </button>
                  <button className="flex items-center space-x-2 px-4 py-2 bg-dbc-light-green text-white rounded-lg hover:bg-green-600 text-sm">
                    <Download className="h-4 w-4" />
                    <span>Export Excel</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Référence client</p>
              <p className="font-medium">{orderDetail.customerRef}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Régime TVA</p>
              <p className="text-sm text-gray-500 italic">{orderDetail.vatType}</p>
            </div>
          </div>
        </div>

        {/* Tableau des produits */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden mb-6">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Détail des produits</h2>
          </div>
          
          <div className="w-full">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom du produit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marque</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">État</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Couleur</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Emballage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Info</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qté</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Prix unit.</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  {orderDetail.status === 'draft' && (
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orderDetail.items.map((item: any) => (
                  <tr key={item.sku}>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">{item.sku}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.manufacturer}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                        item.appearance === 'Grade A+' ? 'bg-green-100 text-green-800' :
                        item.appearance === 'Grade A' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.appearance.replace('Grade ', '')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
                        {item.functionality}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full border ${
                          item.color.toLowerCase().includes('black') ? 'bg-black' :
                          item.color.toLowerCase().includes('white') ? 'bg-white border-gray-300' :
                          item.color.toLowerCase().includes('blue') ? 'bg-blue-500' :
                          item.color.toLowerCase().includes('red') ? 'bg-red-500' :
                          item.color.toLowerCase().includes('gray') ? 'bg-gray-500' :
                          item.color.toLowerCase().includes('silver') ? 'bg-gray-300' :
                          'bg-gray-400'
                        }`}></div>
                        <span>{item.color}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.boxed}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.additional_info}</td>
                    <td className="px-4 py-3 text-center">
                      {orderDetail.status === 'draft' ? (
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => updateQuantity(item.sku, editableQuantities[item.sku] - 1)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            disabled={editableQuantities[item.sku] <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-sm font-medium w-8 text-center">
                            {editableQuantities[item.sku]}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.sku, editableQuantities[item.sku] + 1)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm font-medium">{item.quantity}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">{item.unitPrice.toFixed(2)}€</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold">
                      {(item.unitPrice * editableQuantities[item.sku]).toFixed(2)}€
                    </td>
                    {orderDetail.status === 'draft' && (
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => removeItem(item.sku)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Supprimer ce produit"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Récapitulatif */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="max-w-xs ml-auto">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total ({orderDetail.totalItems} articles)</span>
                <span className="font-medium">{orderDetail.totalAmount.toFixed(2)}€</span>
              </div>
              <div className="text-xs text-gray-500 italic">
                Bien d'occasion - TVA calculée sur la marge, non récupérable
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-semibold">Total HT</span>
                <span className="font-bold text-lg">{orderDetail.totalAmount.toFixed(2)}€</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 