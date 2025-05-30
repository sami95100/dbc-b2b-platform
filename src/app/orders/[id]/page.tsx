'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DBCLogo from '../../../components/DBCLogo';
import { supabase, Product, orderService } from '../../../lib/supabase';
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
  Check,
  FileSpreadsheet
} from 'lucide-react';

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editableQuantities, setEditableQuantities] = useState<{[key: string]: number}>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [validating, setValidating] = useState(false);
  const router = useRouter();

  // Charger les produits depuis Supabase
  useEffect(() => {
    async function loadProducts() {
      try {
        console.log('📦 Chargement des produits pour la commande...');
        
        // Charger TOUS les produits par batch
        let allProducts: Product[] = [];
        const batchSize = 1000;
        let hasMore = true;
        let currentBatch = 0;
        
        while (hasMore) {
          const from = currentBatch * batchSize;
          const to = from + batchSize - 1;
          
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .range(from, to);
          
          if (error) throw error;
          
          if (data && data.length > 0) {
            allProducts = [...allProducts, ...data];
            console.log(`✅ Batch ${currentBatch + 1}: ${data.length} produits (total: ${allProducts.length})`);
            
            if (data.length < batchSize) {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
          
          currentBatch++;
          
          // Sécurité
          if (currentBatch > 50) {
            console.warn('⚠️ Arrêt sécurité après 50 batchs');
            break;
          }
        }
        
        console.log('✅ Total produits chargés:', allProducts.length);
        setProducts(allProducts);
        setProductsLoaded(true);
      } catch (err) {
        console.error('Erreur chargement produits:', err);
        setProducts([]);
        setProductsLoaded(true);
      }
    }
    
    loadProducts();
  }, []);

  const loadOrderDetail = () => {
    try {
      const savedOrders = localStorage.getItem('draftOrders');
      if (savedOrders) {
        const draftOrders = JSON.parse(savedOrders);
        const order = draftOrders[params.id];
        
        if (order) {
          console.log('📋 Commande trouvée:', order);
          
          // Si les produits ne sont pas encore chargés, on attend
          if (!productsLoaded || products.length === 0) {
            console.log('⏳ En attente du chargement des produits...');
            return;
          }
          
          // Construire les détails des articles avec les informations complètes
          const items = Object.entries(order.items || {}).map(([sku, quantity]: [string, any]) => {
            const product = products.find(p => p.sku === sku);
            if (product) {
              // Extraire le manufacturer depuis le nom du produit
              const manufacturer = ['Apple', 'Samsung', 'Xiaomi', 'Google', 'Huawei', 'OnePlus', 'Motorola', 'Honor', 'Oppo', 'Realme', 'Sony', 'LG', 'TCL', 'Nokia', 'Vivo', 'Asus', 'ZTE', 'Nothing', 'Gigaset', 'HTC']
                .find(m => product.product_name.toLowerCase().includes(m.toLowerCase())) || 'Unknown';
              
              return {
                sku: product.sku,
                name: product.product_name,
                manufacturer: manufacturer,
                appearance: product.appearance,
                functionality: product.functionality,
                color: product.color,
                boxed: product.boxed,
                additional_info: product.additional_info || '-',
                quantity: quantity,
                unitPrice: product.price_dbc,
                totalPrice: product.price_dbc * quantity
              };
            }
            console.warn('⚠️ Produit non trouvé:', sku);
            return null;
          }).filter(Boolean);

          console.log('📦 Items trouvés:', items.length);

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
        } else {
          console.log('❌ Commande non trouvée dans localStorage');
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors du chargement de la commande:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productsLoaded) {
      loadOrderDetail();
    }
  }, [params.id, productsLoaded, products]);

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
    if (!orderDetail) return;

    const newItems = orderDetail.items.filter((item: any) => item.sku !== sku);
    const newEditableQuantities = { ...editableQuantities };
    delete newEditableQuantities[sku];

    const updatedOrder = {
      ...orderDetail,
      items: newItems,
      totalItems: newItems.reduce((sum: number, item: any) => sum + editableQuantities[item.sku], 0),
      totalAmount: newItems.reduce((sum: number, item: any) => sum + (item.unitPrice * editableQuantities[item.sku]), 0)
    };

    setOrderDetail(updatedOrder);
    setEditableQuantities(newEditableQuantities);

    // Mettre à jour localStorage
    const savedOrders = localStorage.getItem('draftOrders');
    if (savedOrders) {
      const draftOrders = JSON.parse(savedOrders);
      const updatedItems = { ...draftOrders[params.id].items };
      delete updatedItems[sku];
      
      draftOrders[params.id] = {
        ...draftOrders[params.id],
        items: updatedItems
      };
      
      localStorage.setItem('draftOrders', JSON.stringify(draftOrders));
    }
  };

  const validateOrder = async () => {
    if (!orderDetail || orderDetail.items.length === 0) {
      alert('Aucun produit dans la commande à valider');
      return;
    }

    setValidating(true);
    
    try {
      console.log('🔄 Validation de la commande:', params.id);
      console.log('📦 Items à valider:', orderDetail.items.length);
      
      // Vérifier la connexion Supabase
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl || supabaseUrl.includes('fake-project')) {
        console.warn('⚠️ Supabase non configuré - Mode démonstration');
        
        // Simuler une validation réussie en mode démo
        setTimeout(() => {
          const updatedOrder = {
            ...orderDetail,
            status: 'pending',
            statusLabel: 'En attente'
          };
          setOrderDetail(updatedOrder);

          // Mettre à jour localStorage
          const savedOrders = localStorage.getItem('draftOrders');
          if (savedOrders) {
            const draftOrders = JSON.parse(savedOrders);
            draftOrders[params.id] = {
              ...draftOrders[params.id],
              status: 'pending',
              statusLabel: 'En attente'
            };
            localStorage.setItem('draftOrders', JSON.stringify(draftOrders));
            
            // Supprimer de la commande active
            const currentOrder = localStorage.getItem('currentDraftOrder');
            if (currentOrder === params.id) {
              localStorage.removeItem('currentDraftOrder');
            }
          }
          
          alert('✅ Commande validée avec succès ! (Mode démonstration - les données ne sont pas envoyées à une vraie base de données)');
          setValidating(false);
        }, 1500);
        
        return;
      }
      
      // Vérifier que tous les produits sont encore disponibles
      for (const item of orderDetail.items) {
        const { data: product, error } = await supabase
          .from('products')
          .select('quantity')
          .eq('sku', item.sku)
          .single();

        if (error) {
          throw new Error(`Erreur lors de la vérification du stock pour ${item.sku}: ${error.message}`);
        }

        if (!product || product.quantity < (editableQuantities[item.sku] || item.quantity)) {
          throw new Error(`Stock insuffisant pour ${item.sku} (demandé: ${editableQuantities[item.sku] || item.quantity}, disponible: ${product ? product.quantity : 0})`);
        }
      }
      
      // Préparer les données pour Supabase
      const orderItems = orderDetail.items.map((item: { sku: string; name: string; quantity: number; unitPrice: number }) => ({
        sku: item.sku,
        quantity: editableQuantities[item.sku] || item.quantity,
        product_name: item.name,
        unit_price: item.unitPrice
      }));

      // Valider via le service
      await orderService.validateOrder(params.id, orderItems);

      // Mettre à jour le statut local
      const updatedOrder = {
        ...orderDetail,
        status: 'pending',
        statusLabel: 'En attente'
      };
      setOrderDetail(updatedOrder);

      // Mettre à jour localStorage
      const savedOrders = localStorage.getItem('draftOrders');
      if (savedOrders) {
        const draftOrders = JSON.parse(savedOrders);
        draftOrders[params.id] = {
          ...draftOrders[params.id],
          status: 'pending',
          statusLabel: 'En attente'
        };
        localStorage.setItem('draftOrders', JSON.stringify(draftOrders));
        
        // Supprimer de la commande active
        const currentOrder = localStorage.getItem('currentDraftOrder');
        if (currentOrder === params.id) {
          localStorage.removeItem('currentDraftOrder');
        }
      }

      alert('✅ Commande validée avec succès ! Le stock a été mis à jour.');
      router.push('/orders'); // Rediriger vers la liste des commandes

    } catch (error) {
      console.error('❌ Erreur validation:', error);
      
      // Message d'erreur plus détaillé
      let errorMessage = '❌ Erreur lors de la validation de la commande';
      if (error instanceof Error) {
        if (error.message.includes('not authenticated')) {
          errorMessage += '\n\nProblème d\'authentification avec Supabase. Veuillez vous reconnecter.';
        } else if (error.message.includes('network')) {
          errorMessage += '\n\nProblème de connexion réseau. Vérifiez votre connexion internet.';
        } else if (error.message.includes('Stock insuffisant')) {
          errorMessage += '\n\n' + error.message + '\nLe stock a peut-être été mis à jour par un autre utilisateur.';
        } else {
          errorMessage += '\n\n' + error.message;
        }
      }
      
      alert(errorMessage);
    } finally {
      setValidating(false);
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

  const exportToExcel = () => {
    if (!orderDetail) return;

    try {
      // Import dynamique de xlsx
      import('xlsx').then((XLSX) => {
        // Créer les données pour Excel
        const worksheetData = [
          // Headers
          ['SKU', 'Nom du produit', 'Marque', 'Grade', 'État', 'Couleur', 'Emballage', 'Info', 'Quantité', 'Prix unitaire', 'Total'],
          // Données
          ...orderDetail.items.map((item: any) => [
            item.sku,
            item.name,
            item.manufacturer,
            item.appearance,
            item.functionality,
            item.color,
            item.boxed,
            item.additional_info,
            editableQuantities[item.sku] || item.quantity,
            item.unitPrice,
            (item.unitPrice * (editableQuantities[item.sku] || item.quantity))
          ])
        ];

        // Ajouter une ligne de total
        const totalQty = orderDetail.items.reduce((sum: number, item: any) => sum + (editableQuantities[item.sku] || item.quantity), 0);
        const totalAmount = orderDetail.items.reduce((sum: number, item: any) => sum + (item.unitPrice * (editableQuantities[item.sku] || item.quantity)), 0);
        
        worksheetData.push(['', '', '', '', '', '', '', 'TOTAL:', totalQty, '', totalAmount.toFixed(2)]);

        // Créer le workbook et worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

        // Styling des headers (optionnel - certaines versions le supportent)
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:K1');
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
          if (!worksheet[cellAddress]) continue;
          worksheet[cellAddress].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: 'CCCCCC' } }
          };
        }

        // Ajuster la largeur des colonnes
        worksheet['!cols'] = [
          { width: 15 }, // SKU
          { width: 30 }, // Nom du produit
          { width: 15 }, // Marque
          { width: 10 }, // Grade
          { width: 10 }, // État
          { width: 10 }, // Couleur
          { width: 15 }, // Emballage
          { width: 20 }, // Info
          { width: 8 },  // Quantité
          { width: 12 }, // Prix unitaire
          { width: 12 }  // Total
        ];

        // Ajouter le worksheet au workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Commande');

        // Créer le nom de fichier
        const fileName = `commande_${params.id}_${new Date().toISOString().split('T')[0]}.xlsx`;

        // Télécharger le fichier
        XLSX.writeFile(workbook, fileName);

        console.log('📊 Export Excel XLSX terminé');
      });
    } catch (error) {
      console.error('❌ Erreur export Excel:', error);
      alert('❌ Erreur lors de l\'export Excel');
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
                  <div className="flex space-x-3">
                    <button
                      onClick={validateOrder}
                      disabled={validating}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {validating ? (
                        <>
                          <Clock className="h-4 w-4 animate-spin" />
                          <span>Validation...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          <span>Valider la commande</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={exportToExcel}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>Export Excel</span>
                    </button>
                  </div>
                </>
              )}
              
              {orderDetail.status !== 'draft' && (
                <>
                  <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                    <FileText className="h-4 w-4" />
                    <span>Facture</span>
                  </button>
                  <div className="flex space-x-3">
                    <button
                      onClick={exportToExcel}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>Export Excel</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-800 mb-1 font-medium">Référence client</p>
              <p className="font-medium text-gray-900">{orderDetail.customerRef}</p>
            </div>
            <div>
              <p className="text-sm text-gray-800 mb-1 font-medium">Régime TVA</p>
              <p className="text-sm text-gray-700">{orderDetail.vatType}</p>
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
                    <td className="px-4 py-3 text-sm text-gray-800">{item.additional_info}</td>
                    <td className="px-4 py-3 text-center">
                      {orderDetail.status === 'draft' ? (
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => updateQuantity(item.sku, editableQuantities[item.sku] - 1)}
                            className="p-1 text-gray-600 hover:text-gray-800"
                            disabled={editableQuantities[item.sku] <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-sm font-medium w-8 text-center text-gray-900">
                            {editableQuantities[item.sku]}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.sku, editableQuantities[item.sku] + 1)}
                            className="p-1 text-gray-600 hover:text-gray-800"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-gray-900">{item.quantity}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{item.unitPrice.toFixed(2)}€</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
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
                <span className="text-gray-800">Total ({orderDetail.totalItems} articles)</span>
                <span className="font-medium text-gray-900">{orderDetail.totalAmount.toFixed(2)}€</span>
              </div>
              <div className="text-xs text-gray-700">
                Bien d'occasion - TVA calculée sur la marge, non récupérable
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-semibold text-gray-900">Total HT</span>
                <span className="font-bold text-lg text-gray-900">{orderDetail.totalAmount.toFixed(2)}€</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 