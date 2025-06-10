'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth, withAuth } from '../../../lib/auth-context';
import AppHeader from '../../../components/AppHeader';
import { supabase, Product } from '../../../lib/supabase';
import { OrdersUtils } from '../../../lib/orders-utils';
import { 
  Search, 
  Filter, 
  Download, 
  ShoppingCart, 
  ChevronDown,
  ChevronUp,
  Check,
  Plus,
  Minus,
  ArrowUpDown,
  FileSpreadsheet,
  Package
} from 'lucide-react';

// Valeurs de filtres basées sur l'analyse du catalogue
const MANUFACTURERS = ['Apple', 'Samsung', 'Xiaomi', 'Google', 'Huawei', 'OnePlus', 'Motorola', 'Honor', 'Oppo', 'Realme', 'Sony', 'LG', 'TCL', 'Nokia', 'Vivo', 'Asus', 'ZTE', 'Nothing', 'Gigaset', 'HTC'];
const APPEARANCES = ['Brand New', 'Grade A+', 'Grade A', 'Grade AB', 'Grade B', 'Grade BC', 'Grade C', 'Grade C+'];
const FUNCTIONALITIES = ['Working', 'Minor Fault'];
const BOXED_OPTIONS = ['Original Box', 'Premium Unboxed', 'Unboxed'];

type SortField = 'sku' | 'product_name' | 'price_dbc' | 'quantity';
type SortDirection = 'asc' | 'desc';

function ClientCatalogPage() {
  const { user, signOut } = useAuth();
  
  // États des filtres avec valeurs par défaut
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedManufacturers, setSelectedManufacturers] = useState<string[]>(['Apple']);
  const [selectedAppearances, setSelectedAppearances] = useState<string[]>(['Grade C', 'Grade BC']);
  const [selectedFunctionalities, setSelectedFunctionalities] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedBoxedOptions, setSelectedBoxedOptions] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [quantityMin, setQuantityMin] = useState('');
  const [quantityMax, setQuantityMax] = useState('');
  const [includeZeroStock, setIncludeZeroStock] = useState(false);
  
  // États de tri et pagination
  const [sortField, setSortField] = useState<SortField>('product_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  
  // États des commandes
  const [quantities, setQuantities] = useState<{[key: string]: string | number}>({});
  const [currentDraftOrder, setCurrentDraftOrder] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('currentDraftOrder');
    }
    return null;
  });
  const [showOrderNamePopup, setShowOrderNamePopup] = useState(false);
  const [orderName, setOrderName] = useState('');
  const [draftOrders, setDraftOrders] = useState<{[key: string]: any}>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('draftOrders');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Erreur parsing draftOrders:', e);
        }
      }
    }
    return {};
  });
  
  // États des produits
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingOrder, setCreatingOrder] = useState(false);
  
  // États des dropdowns
  const [dropdownOpen, setDropdownOpen] = useState<{[key: string]: boolean}>({
    manufacturer: false,
    appearance: false,
    functionality: false,
    boxed: false,
    color: false,
    export: false
  });

  // Charger les produits
  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      setError(null);
      
      try {
        console.log('📦 Chargement des produits via Supabase...');
        
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .order('product_name', { ascending: true });

        if (productsError) {
          console.error('❌ Erreur chargement produits:', productsError);
          throw new Error(productsError.message);
        }

        console.log('✅ Produits chargés:', productsData?.length || 0);
        setProducts(productsData || []);
        
      } catch (error) {
        console.error('❌ Erreur générale chargement produits:', error);
        setError(error instanceof Error ? error.message : 'Erreur de chargement');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  // Initialiser les commandes brouillon
  useEffect(() => {
    const initializeOrders = async () => {
      await syncDraftOrdersWithSupabase();
      
      if (!currentDraftOrder && Object.keys(draftOrders).length === 0) {
        console.log('🆕 Aucune commande brouillon - prêt pour en créer une nouvelle');
      } else {
        console.log('📋 Commandes brouillon existantes:', Object.keys(draftOrders).length);
      }
    };

    if (typeof window !== 'undefined') {
      initializeOrders();
    }
  }, []);

  const syncDraftOrdersWithSupabase = async () => {
    try {
      const response = await fetch('/api/orders/draft', {
        method: 'GET'
      });
      
      if (response.ok) {
        const result = await response.json();
        const supabaseDrafts = result.draftOrders || [];
        
        if (supabaseDrafts.length > 0) {
          console.log('🔄 Synchronisation avec commandes Supabase:', supabaseDrafts.length);
          
          const syncedDraftOrders: {[key: string]: any} = {};
          
          for (const draft of supabaseDrafts) {
            syncedDraftOrders[draft.id] = {
              id: draft.id,
              name: draft.name,
              status: 'draft',
              status_label: 'Brouillon',
              createdAt: draft.created_at,
              items: draft.items || {},
              supabaseId: draft.id,
              source: 'supabase',
              total_amount: draft.total_amount,
              total_items: draft.total_items
            };
          }
          
          setDraftOrders(syncedDraftOrders);
          localStorage.setItem('draftOrders', JSON.stringify(syncedDraftOrders));
          
          if (!currentDraftOrder && Object.keys(syncedDraftOrders).length > 0) {
            const firstDraftId = Object.keys(syncedDraftOrders)[0];
            setCurrentDraftOrder(firstDraftId);
            localStorage.setItem('currentDraftOrder', firstDraftId);
          }
        }
      }
    } catch (error) {
      console.error('❌ Erreur sync commandes brouillon:', error);
    }
  };

  // Logique de filtrage des produits
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products.filter(product => {
      // Filtre par terme de recherche
      if (searchTerm && !product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !product.sku.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Filtre par fabricant
      if (selectedManufacturers.length > 0) {
        const hasManufacturer = selectedManufacturers.some(manufacturer =>
          product.product_name.toLowerCase().includes(manufacturer.toLowerCase())
        );
        if (!hasManufacturer) return false;
      }

      // Filtre par apparence
      if (selectedAppearances.length > 0) {
        const hasAppearance = selectedAppearances.some(appearance =>
          product.product_name.toLowerCase().includes(appearance.toLowerCase())
        );
        if (!hasAppearance) return false;
      }

      // Filtre par fonctionnalité
      if (selectedFunctionalities.length > 0) {
        const hasFunctionality = selectedFunctionalities.some(functionality =>
          product.product_name.toLowerCase().includes(functionality.toLowerCase())
        );
        if (!hasFunctionality) return false;
      }

      // Filtre par prix
      if (priceMin && product.price_dbc < parseFloat(priceMin)) return false;
      if (priceMax && product.price_dbc > parseFloat(priceMax)) return false;

      // Filtre par quantité
      if (quantityMin && product.quantity < parseInt(quantityMin)) return false;
      if (quantityMax && product.quantity > parseInt(quantityMax)) return false;

      // Filtre stock zéro
      if (!includeZeroStock && product.quantity === 0) return false;

      return true;
    });

    // Tri
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [products, searchTerm, selectedManufacturers, selectedAppearances, selectedFunctionalities, 
      selectedColors, selectedBoxedOptions, priceMin, priceMax, quantityMin, quantityMax, 
      includeZeroStock, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredAndSortedProducts.slice(startIndex, endIndex);

  const updateQuantity = async (sku: string, value: string) => {
    const numValue = parseInt(value) || 0;
    
    if (numValue < 0) return;
    
    const product = products.find(p => p.sku === sku);
    if (!product) return;
    
    if (numValue > product.quantity) {
      alert(`Quantité maximum disponible: ${product.quantity}`);
      return;
    }
    
    const newQuantities = { ...quantities, [sku]: numValue };
    setQuantities(newQuantities);
    
    if (currentDraftOrder && draftOrders[currentDraftOrder]) {
      const updatedOrder = { ...draftOrders[currentDraftOrder] };
      if (!updatedOrder.items) updatedOrder.items = {};
      
      if (numValue > 0) {
        updatedOrder.items[sku] = numValue;
      } else {
        delete updatedOrder.items[sku];
      }
      
      const newDraftOrders = { ...draftOrders, [currentDraftOrder]: updatedOrder };
      setDraftOrders(newDraftOrders);
      localStorage.setItem('draftOrders', JSON.stringify(newDraftOrders));
    }
  };

  const createNewOrder = async () => {
    if (!orderName.trim()) {
      alert('Veuillez saisir un nom pour la commande');
      return;
    }

    setCreatingOrder(true);
    
    try {
      // Créer une nouvelle commande brouillon
      const newOrderId = `draft_${Date.now()}`;
      const newOrder = {
        id: newOrderId,
        name: orderName.trim(),
        status: 'draft',
        status_label: 'Brouillon',
        createdAt: new Date().toISOString(),
        items: {},
        source: 'local'
      };

      const newDraftOrders = { ...draftOrders, [newOrderId]: newOrder };
      setDraftOrders(newDraftOrders);
      setCurrentDraftOrder(newOrderId);
      
      localStorage.setItem('draftOrders', JSON.stringify(newDraftOrders));
      localStorage.setItem('currentDraftOrder', newOrderId);
      
      // Reset
      setOrderName('');
      setShowOrderNamePopup(false);
      setQuantities({});
      
      console.log('✅ Nouvelle commande créée:', newOrderId);
      
    } catch (error) {
      console.error('❌ Erreur création commande:', error);
      alert('Erreur lors de la création de la commande');
    } finally {
      setCreatingOrder(false);
    }
  };

  const getTotalCartItems = () => {
    return Object.values(quantities).reduce((sum: number, qty) => sum + (Number(qty) || 0), 0);
  };

  const getTotalCartAmount = () => {
    return Object.entries(quantities).reduce((sum, [sku, qty]) => {
      const product = products.find(p => p.sku === sku);
      return sum + (product ? product.price_dbc * (Number(qty) || 0) : 0);
    }, 0);
  };

  const handleLogout = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      await signOut();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dbc-light-green mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du catalogue...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Erreur de chargement</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-dbc-light-green text-white px-6 py-2 rounded-lg hover:bg-dbc-dark-green transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50">
      <AppHeader 
        cartItemsCount={getTotalCartItems()}
        currentOrder={currentDraftOrder ? {
          name: draftOrders[currentDraftOrder]?.name || 'Commande',
          totalItems: getTotalCartItems(),
          totalAmount: getTotalCartAmount()
        } : undefined}
        onCartClick={() => window.location.href = '/orders'}
        onLogout={handleLogout}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Catalogue Produits</h1>
            <p className="text-gray-600">
              {user?.company_name} - {filteredAndSortedProducts.length} produit(s) trouvé(s)
            </p>
          </div>
          
          {!currentDraftOrder && (
            <button
              onClick={() => setShowOrderNamePopup(true)}
              className="bg-dbc-light-green text-white px-6 py-3 rounded-lg hover:bg-dbc-dark-green transition-colors flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nouvelle Commande
            </button>
          )}
        </div>

        {/* Filtres de recherche */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recherche
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher par nom ou SKU..."
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-dbc-light-green focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prix minimum
              </label>
              <input
                type="number"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="0"
                className="px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-dbc-light-green focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prix maximum
              </label>
              <input
                type="number"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="∞"
                className="px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-dbc-light-green focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeZeroStock}
                onChange={(e) => setIncludeZeroStock(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Inclure les produits en rupture de stock</span>
            </label>
          </div>
        </div>

        {/* Liste des produits */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {paginatedProducts.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Aucun produit trouvé</h3>
              <p className="text-gray-500">Essayez de modifier vos filtres de recherche</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prix
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantité
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedProducts.map((product) => (
                    <tr key={product.sku} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {product.product_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            SKU: {product.sku}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {product.price_dbc.toFixed(2)} €
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          product.quantity > 10 
                            ? 'bg-green-100 text-green-800' 
                            : product.quantity > 0 
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}>
                          {product.quantity} unités
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {product.quantity > 0 && currentDraftOrder ? (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                const currentQty = Number(quantities[product.sku]) || 0;
                                if (currentQty > 0) {
                                  updateQuantity(product.sku, (currentQty - 1).toString());
                                }
                              }}
                              className="p-1 rounded border border-gray-300 hover:bg-gray-100"
                              disabled={!quantities[product.sku] || Number(quantities[product.sku]) <= 0}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              max={product.quantity}
                              value={quantities[product.sku] || ''}
                              onChange={(e) => updateQuantity(product.sku, e.target.value)}
                              className="w-16 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-dbc-light-green focus:border-transparent"
                            />
                            <button
                              onClick={() => {
                                const currentQty = Number(quantities[product.sku]) || 0;
                                if (currentQty < product.quantity) {
                                  updateQuantity(product.sku, (currentQty + 1).toString());
                                }
                              }}
                              className="p-1 rounded border border-gray-300 hover:bg-gray-100"
                              disabled={Number(quantities[product.sku]) >= product.quantity}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">
                            {product.quantity === 0 ? 'Rupture' : 'Créer une commande'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Précédent
              </button>
              <span className="px-4 py-2 bg-dbc-light-green text-white rounded-lg">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Popup de création de commande */}
      {showOrderNamePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Nouvelle Commande</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de la commande
              </label>
              <input
                type="text"
                value={orderName}
                onChange={(e) => setOrderName(e.target.value)}
                placeholder="Ex: Commande iPhone Décembre 2024"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dbc-light-green focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && createNewOrder()}
                autoFocus
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowOrderNamePopup(false);
                  setOrderName('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={createNewOrder}
                disabled={creatingOrder || !orderName.trim()}
                className="bg-dbc-light-green text-white px-6 py-2 rounded-lg hover:bg-dbc-dark-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingOrder ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Protéger la page pour les clients uniquement
export default withAuth(ClientCatalogPage, 'client'); 