'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DBCLogo from '../../components/DBCLogo';
import { 
  Search, 
  Filter, 
  Download, 
  ShoppingCart, 
  User, 
  LogOut, 
  ChevronDown,
  ChevronUp,
  Check,
  Plus,
  ArrowUpDown,
  FileSpreadsheet,
  Package
} from 'lucide-react';

// Données de démonstration étendues pour le tableau
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
    stock: 15,
    price_dbc: 849.99,
    price_foxway: 765.75,
    condition: 'Neuf',
    category: 'iPhone'
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
    stock: 8,
    price_dbc: 1299.99,
    price_foxway: 1171.17,
    condition: 'Neuf',
    category: 'iPhone'
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
    stock: 22,
    price_dbc: 699.99,
    price_foxway: 630.63,
    condition: 'Neuf',
    category: 'Samsung'
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
    stock: 12,
    price_dbc: 749.99,
    price_foxway: 675.67,
    condition: 'Neuf',
    category: 'iPad'
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
    stock: 18,
    price_dbc: 449.99,
    price_foxway: 405.40,
    condition: 'Neuf',
    category: 'Apple Watch'
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
    stock: 5,
    price_dbc: 2199.99,
    price_foxway: 1981.98,
    condition: 'Neuf',
    category: 'MacBook'
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
    stock: 25,
    price_dbc: 699.99,
    price_foxway: 630.63,
    condition: 'Reconditionné',
    category: 'iPhone'
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
    stock: 14,
    price_dbc: 899.99,
    price_foxway: 810.81,
    condition: 'Neuf',
    category: 'Samsung'
  }
];

type SortField = 'sku' | 'name' | 'manufacturer' | 'price_dbc' | 'stock';
type SortDirection = 'asc' | 'desc';

export default function CatalogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedManufacturer, setSelectedManufacturer] = useState('');
  const [selectedAppearance, setSelectedAppearance] = useState('');
  const [selectedFunctionality, setSelectedFunctionality] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedBoxed, setSelectedBoxed] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [stockMin, setStockMin] = useState('');
  const [stockMax, setStockMax] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [cart, setCart] = useState<{[key: string]: number}>({});
  const [quantities, setQuantities] = useState<{[key: string]: string | number}>({});
  const [currentDraftOrder, setCurrentDraftOrder] = useState<string | null>(null);
  const [showOrderNamePopup, setShowOrderNamePopup] = useState(false);
  const [orderName, setOrderName] = useState('');
  const [draftOrders, setDraftOrders] = useState<{[key: string]: any}>({});
  const [selectedProducts, setSelectedProducts] = useState<{[key: string]: boolean}>({});
  const router = useRouter();

  // Charger les commandes brouillon depuis localStorage au démarrage
  useEffect(() => {
    try {
      const savedOrders = localStorage.getItem('draftOrders');
      const savedCurrentOrder = localStorage.getItem('currentDraftOrder');
      
      if (savedOrders) {
        const orders = JSON.parse(savedOrders);
        setDraftOrders(orders);
        
        // Charger les quantités depuis la commande active
        if (savedCurrentOrder && orders[savedCurrentOrder]) {
          setCurrentDraftOrder(savedCurrentOrder);
          const currentOrderItems = orders[savedCurrentOrder].items || {};
          setQuantities(currentOrderItems);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    }
  }, []);

  // Sauvegarder dans localStorage à chaque modification
  useEffect(() => {
    try {
      localStorage.setItem('draftOrders', JSON.stringify(draftOrders));
      if (currentDraftOrder) {
        localStorage.setItem('currentDraftOrder', currentDraftOrder);
      } else {
        localStorage.removeItem('currentDraftOrder');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  }, [draftOrders, currentDraftOrder]);

  // Filtres uniques
  const manufacturers = Array.from(new Set(mockProducts.map(p => p.manufacturer)));
  const appearances = Array.from(new Set(mockProducts.map(p => p.appearance)));
  const functionalities = Array.from(new Set(mockProducts.map(p => p.functionality)));
  const colors = Array.from(new Set(mockProducts.map(p => p.color)));
  const boxedOptions = Array.from(new Set(mockProducts.map(p => p.boxed)));

  // Filtrage et tri
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = mockProducts.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesManufacturer = !selectedManufacturer || product.manufacturer === selectedManufacturer;
      const matchesAppearance = !selectedAppearance || product.appearance === selectedAppearance;
      const matchesFunctionality = !selectedFunctionality || product.functionality === selectedFunctionality;
      const matchesColor = !selectedColor || product.color === selectedColor;
      const matchesBoxed = !selectedBoxed || product.boxed === selectedBoxed;
      const matchesPriceMin = !priceMin || product.price_dbc >= parseFloat(priceMin);
      const matchesPriceMax = !priceMax || product.price_dbc <= parseFloat(priceMax);
      const matchesStockMin = !stockMin || product.stock >= parseInt(stockMin);
      const matchesStockMax = !stockMax || product.stock <= parseInt(stockMax);
      
      return matchesSearch && matchesManufacturer && matchesAppearance && 
             matchesFunctionality && matchesColor && matchesBoxed &&
             matchesPriceMin && matchesPriceMax && matchesStockMin && matchesStockMax;
    });

    // Tri
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [searchTerm, selectedManufacturer, selectedAppearance, selectedFunctionality, 
      selectedColor, selectedBoxed, priceMin, priceMax, stockMin, stockMax, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage);
  const paginatedProducts = filteredAndSortedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Checkbox = ajouter tout le stock disponible
  const toggleProductSelection = (sku: string) => {
    const product = mockProducts.find(p => p.sku === sku);
    if (product) {
      setSelectedProducts(prev => ({ ...prev, [sku]: true }));
      addToCartWithQuantity(sku, product.stock, true); // true = remplacer par tout le stock
    }
  };

  const selectAllProducts = () => {
    const newSelected: {[key: string]: boolean} = {};
    paginatedProducts.forEach(product => {
      newSelected[product.sku] = true;
      addToCartWithQuantity(product.sku, product.stock, true); // true = remplacer par tout le stock
    });
    setSelectedProducts(prev => ({ ...prev, ...newSelected }));
  };

  const updateQuantity = (sku: string, value: string) => {
    if (value === '' || (parseInt(value) >= 1)) {
      setQuantities(prev => ({ ...prev, [sku]: value === '' ? '' : parseInt(value) }));
    }
  };

  const addToCart = (sku: string) => {
    const quantity = quantities[sku];
    const finalQuantity = (quantity === '' || quantity === undefined) ? 1 : (typeof quantity === 'string' ? parseInt(quantity) || 1 : quantity);
    addToCartWithQuantity(sku, finalQuantity, false);
  };

  const addToCartWithQuantity = (sku: string, quantity: number, replace: boolean = false) => {
    // Si pas de commande brouillon active, ouvrir la popup
    if (!currentDraftOrder) {
      setShowOrderNamePopup(true);
      // Stocker temporairement le produit à ajouter
      sessionStorage.setItem('pendingProduct', JSON.stringify({ sku, quantity, replace }));
      return;
    }

    // Ajouter à la commande brouillon existante
    const currentQuantity = draftOrders[currentDraftOrder]?.items?.[sku] || 0;
    const newQuantity = replace ? quantity : currentQuantity + quantity;
    
    const newDraftOrders = {
      ...draftOrders,
      [currentDraftOrder]: {
        ...draftOrders[currentDraftOrder],
        items: {
          ...draftOrders[currentDraftOrder]?.items,
          [sku]: newQuantity
        }
      }
    };
    
    setDraftOrders(newDraftOrders);

    // Mettre à jour les quantités affichées pour refléter ce qui est dans la commande
    setQuantities(prev => ({
      ...prev,
      [sku]: newQuantity
    }));

    // Décocher la case si elle était cochée
    setSelectedProducts(prev => ({ ...prev, [sku]: false }));
  };

  const createNewOrder = () => {
    const orderId = `DRAFT-${Date.now()}`;
    const finalOrderName = orderName.trim() || `Commande ${new Date().toLocaleDateString('fr-FR')}`;
    
    const newOrder = {
      id: orderId,
      name: finalOrderName,
      status: 'draft',
      statusLabel: 'Brouillon',
      createdAt: new Date().toISOString(),
      items: {}
    };

    const newDraftOrders = { ...draftOrders, [orderId]: newOrder };
    setDraftOrders(newDraftOrders);
    setCurrentDraftOrder(orderId);
    setShowOrderNamePopup(false);
    setOrderName('');

    // Ajouter le produit en attente s'il y en a un
    const pendingProduct = sessionStorage.getItem('pendingProduct');
    if (pendingProduct) {
      const { sku, quantity, replace } = JSON.parse(pendingProduct);
      newDraftOrders[orderId].items = { [sku]: quantity };
      setDraftOrders(newDraftOrders);
      setQuantities(prev => ({ ...prev, [sku]: quantity }));
      sessionStorage.removeItem('pendingProduct');
      // Décocher la case
      setSelectedProducts(prev => ({ ...prev, [sku]: false }));
    }
  };

  const exportToExcel = () => {
    const dataToExport = filteredAndSortedProducts;
    
    // Simulation d'export Excel
    console.log('Export Excel:', dataToExport);
    alert(`Export de ${dataToExport.length} produits en cours...`);
  };

  const getTotalCartItems = () => {
    if (!currentDraftOrder || !draftOrders[currentDraftOrder]) return 0;
    return Object.values(draftOrders[currentDraftOrder].items || {}).reduce((sum: number, qty: any) => sum + qty, 0);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedManufacturer('');
    setSelectedAppearance('');
    setSelectedFunctionality('');
    setSelectedColor('');
    setSelectedBoxed('');
    setPriceMin('');
    setPriceMax('');
    setStockMin('');
    setStockMax('');
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec branding DBC */}
      <header className="bg-dbc-dark-green shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              {/* Logo DBC stylisé */}
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
                {getTotalCartItems() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-dbc-light-green text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {getTotalCartItems()}
                  </span>
                )}
              </button>

              {/* Affichage commande active */}
              {currentDraftOrder && draftOrders[currentDraftOrder] && (
                <div className="text-white text-sm">
                  <span className="text-dbc-bright-green">Commande:</span> {draftOrders[currentDraftOrder].name}
                </div>
              )}
              
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
        {/* Barre d'outils principale */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            {/* Recherche globale */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, SKU, marque..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dbc-light-green focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={resetFilters}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                Réinitialiser
              </button>
              
              <button
                onClick={exportToExcel}
                className="flex items-center space-x-2 px-4 py-2 bg-dbc-light-green text-white rounded-lg hover:bg-green-600 text-sm"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>

          {/* Filtres avancés */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Marque</label>
              <select
                value={selectedManufacturer}
                onChange={(e) => setSelectedManufacturer(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-dbc-light-green focus:border-transparent"
              >
                <option value="">Toutes</option>
                {manufacturers.map(manufacturer => (
                  <option key={manufacturer} value={manufacturer}>{manufacturer}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Apparence</label>
              <select
                value={selectedAppearance}
                onChange={(e) => setSelectedAppearance(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-dbc-light-green focus:border-transparent"
              >
                <option value="">Toutes</option>
                {appearances.map(appearance => (
                  <option key={appearance} value={appearance}>{appearance}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fonctionnalité</label>
              <select
                value={selectedFunctionality}
                onChange={(e) => setSelectedFunctionality(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-dbc-light-green focus:border-transparent"
              >
                <option value="">Toutes</option>
                {functionalities.map(functionality => (
                  <option key={functionality} value={functionality}>{functionality}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Couleur</label>
              <select
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-dbc-light-green focus:border-transparent"
              >
                <option value="">Toutes</option>
                {colors.map(color => (
                  <option key={color} value={color}>{color}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Prix min</label>
              <input
                type="number"
                placeholder="0"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-dbc-light-green focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Prix max</label>
              <input
                type="number"
                placeholder="9999"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-dbc-light-green focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Résultats et pagination */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <p className="text-sm text-gray-600">
              {filteredAndSortedProducts.length} produit{filteredAndSortedProducts.length > 1 ? 's' : ''} trouvé{filteredAndSortedProducts.length > 1 ? 's' : ''}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Afficher:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-gray-600">par page</span>
          </div>
        </div>

        {/* Tableau des produits */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="w-full">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="w-10 px-2 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={selectAllProducts}
                      className="rounded border-gray-300 text-dbc-light-green focus:ring-dbc-light-green"
                      title="Ajouter tout le stock de tous les produits de cette page"
                    />
                  </th>
                  <th 
                    className="w-24 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('sku')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>SKU</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th 
                    className="w-40 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Produit</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th 
                    className="w-20 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('manufacturer')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Marque</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="w-20 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                  <th className="w-24 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">État</th>
                  <th className="w-20 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Couleur</th>
                  <th className="w-20 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Emb.</th>
                  <th className="w-32 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Info</th>
                  <th 
                    className="w-16 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('stock')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Stock</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th 
                    className="w-20 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('price_dbc')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Prix</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="w-16 px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qté</th>
                  <th className="w-24 px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedProducts.map((product) => (
                  <tr key={product.sku} className="hover:bg-gray-50">
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={selectedProducts[product.sku] || false}
                        onChange={() => toggleProductSelection(product.sku)}
                        className="rounded border-gray-300 text-dbc-light-green focus:ring-dbc-light-green"
                        title={`Ajouter tout le stock (${product.stock}) de ce produit à la commande`}
                      />
                    </td>
                    <td className="px-2 py-2 text-xs font-mono text-gray-900 truncate" title={product.sku}>
                      {product.sku}
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-900 font-medium truncate" title={product.name}>
                      {product.name}
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-900">{product.manufacturer}</td>
                    <td className="px-2 py-2">
                      <span className={`inline-flex px-1 py-0.5 text-xs font-medium rounded ${
                        product.appearance === 'Grade A+' ? 'bg-green-100 text-green-800' :
                        product.appearance === 'Grade A' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {product.appearance.replace('Grade ', '')}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <span className="inline-flex px-1 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800">
                        {product.functionality}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-900">
                      <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 rounded-full border ${
                          product.color.toLowerCase().includes('black') ? 'bg-black' :
                          product.color.toLowerCase().includes('white') ? 'bg-white border-gray-300' :
                          product.color.toLowerCase().includes('blue') ? 'bg-blue-500' :
                          product.color.toLowerCase().includes('red') ? 'bg-red-500' :
                          product.color.toLowerCase().includes('gray') ? 'bg-gray-500' :
                          product.color.toLowerCase().includes('silver') ? 'bg-gray-300' :
                          'bg-gray-400'
                        }`}></div>
                        <span className="truncate">{product.color}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-900">{product.boxed}</td>
                    <td className="px-2 py-2 text-xs text-gray-600 truncate" title={product.additional_info}>
                      {product.additional_info}
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-900">
                      <span className={`font-medium ${product.stock < 10 ? 'text-red-600' : 'text-gray-900'}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-xs font-semibold text-gray-900 whitespace-nowrap">
                      {product.price_dbc.toFixed(2)}€
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min="1"
                        max={product.stock}
                        value={quantities[product.sku] || ''}
                        placeholder="1"
                        onChange={(e) => updateQuantity(product.sku, e.target.value)}
                        className="w-12 text-xs text-center text-gray-900 border-2 border-gray-400 rounded px-1 py-1 bg-white focus:ring-2 focus:ring-dbc-light-green focus:border-dbc-light-green placeholder-gray-400"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={() => addToCart(product.sku)}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-dbc-light-green hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-dbc-light-green"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Ajouter
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-600">
              Affichage de {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, filteredAndSortedProducts.length)} sur {filteredAndSortedProducts.length} résultats
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Précédent
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 border rounded text-sm ${
                      currentPage === page 
                        ? 'bg-dbc-light-green text-white border-dbc-light-green' 
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Suivant
              </button>
            </div>
          </div>
        )}

        {filteredAndSortedProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun produit trouvé</h3>
            <p className="text-gray-600">Essayez de modifier vos critères de recherche</p>
          </div>
        )}

        {/* Popup création de commande */}
        {showOrderNamePopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Nouvelle commande</h3>
              <p className="text-sm text-gray-600 mb-4">
                Donnez un nom à votre commande pour commencer à ajouter des produits.
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de la commande
                </label>
                <input
                  type="text"
                  value={orderName}
                  onChange={(e) => setOrderName(e.target.value)}
                  placeholder="Ex: Commande iPhone janvier 2025"
                  className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dbc-light-green focus:border-transparent placeholder-gray-400"
                  onKeyPress={(e) => e.key === 'Enter' && createNewOrder()}
                  autoFocus
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowOrderNamePopup(false);
                    setOrderName('');
                    sessionStorage.removeItem('pendingProduct');
                    // Décocher toutes les cases sélectionnées
                    setSelectedProducts({});
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={createNewOrder}
                  className="flex-1 px-4 py-2 bg-dbc-light-green text-white rounded-lg hover:bg-green-600"
                >
                  Créer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 