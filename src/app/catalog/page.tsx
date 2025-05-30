'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DBCLogo from '../../components/DBCLogo';
import CatalogUpdateButton from '../../components/CatalogUpdateButton';
import { supabase, Product } from '../../lib/supabase';
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
  Minus,
  ArrowUpDown,
  FileSpreadsheet,
  Package
} from 'lucide-react';

// Données de démonstration basées sur le vrai catalogue
const mockProducts: Product[] = [
  // Apple Products
  {
    sku: '102600600148',
    item_group: 'Mobiles',
    product_name: 'Apple iPhone 11 128GB',
    appearance: 'Grade A',
    functionality: 'Working',
    boxed: 'Unboxed',
    color: 'Purple',
    cloud_lock: null,
    additional_info: null,
    quantity: 1,
    price: 284,
    campaign_price: 263,
    vat_type: 'Marginal',
    price_dbc: 286.84,
    is_active: true
  },
  {
    sku: '102600600117',
    item_group: 'Mobiles',
    product_name: 'Apple iPhone 11 128GB',
    appearance: 'Grade A',
    functionality: 'Working',
    boxed: 'Unboxed',
    color: 'Purple',
    cloud_lock: null,
    additional_info: null,
    quantity: 1,
    price: 260,
    campaign_price: 245,
    vat_type: null,
    price_dbc: 288.60,
    is_active: true
  },
  {
    sku: '102600600028',
    item_group: 'Mobiles',
    product_name: 'Apple iPhone 11 128GB',
    appearance: 'Grade C',
    functionality: 'Working',
    boxed: 'Unboxed',
    color: 'Black',
    cloud_lock: null,
    additional_info: 'Chip/Crack',
    quantity: 5,
    price: 220,
    campaign_price: null,
    vat_type: 'Marginal',
    price_dbc: 222.20,
    is_active: true
  },
  {
    sku: '102600600298',
    item_group: 'Mobiles',
    product_name: 'Apple iPhone 11 128GB',
    appearance: 'Grade BC',
    functionality: 'Working',
    boxed: 'Unboxed',
    color: 'Yellow',
    cloud_lock: null,
    additional_info: 'Discoloration',
    quantity: 2,
    price: 240,
    campaign_price: null,
    vat_type: 'Marginal',
    price_dbc: 242.40,
    is_active: true
  },
  // Samsung Products
  {
    sku: '103500200123',
    item_group: 'Mobiles',
    product_name: 'Samsung Galaxy S21 128GB',
    appearance: 'Grade A',
    functionality: 'Working',
    boxed: 'Unboxed',
    color: 'Grey',
    cloud_lock: null,
    additional_info: null,
    quantity: 8,
    price: 320,
    campaign_price: null,
    vat_type: null,
    price_dbc: 355.20,
    is_active: true
  },
  {
    sku: '103500200456',
    item_group: 'Mobiles',
    product_name: 'Samsung Galaxy S21 256GB',
    appearance: 'Grade B',
    functionality: 'Working',
    boxed: 'Original Box',
    color: 'Pink',
    cloud_lock: null,
    additional_info: 'Brand New Battery',
    quantity: 3,
    price: 380,
    campaign_price: 350,
    vat_type: null,
    price_dbc: 421.80,
    is_active: true
  },
  // Plus de produits pour la démo...
];

// Valeurs de filtres basées sur l'analyse du vrai catalogue
const MANUFACTURERS = ['Apple', 'Samsung', 'Xiaomi', 'Google', 'Huawei', 'OnePlus', 'Motorola', 'Honor', 'Oppo', 'Realme', 'Sony', 'LG', 'TCL', 'Nokia', 'Vivo', 'Asus', 'ZTE', 'Nothing', 'Gigaset', 'HTC'];
const APPEARANCES = ['Brand New', 'Grade A+', 'Grade A', 'Grade AB', 'Grade B', 'Grade BC', 'Grade C', 'Grade C+'];
const FUNCTIONALITIES = ['Working', 'Minor Fault'];
const BOXED_OPTIONS = ['Original Box', 'Premium Unboxed', 'Unboxed'];
const ADDITIONAL_INFO_OPTIONS = ['AS-IS', 'Brand New Battery', 'Chip/Crack', 'Discoloration', 'Engraving', 'Engraving Removed', 'Heavy cosmetic wear', 'Other', 'Premium Refurbished', 'Reduced Battery Performance'];

// Type pour les options de tri
type SortField = 'sku' | 'product_name' | 'price_dbc' | 'quantity';
type SortDirection = 'asc' | 'desc';

export default function CatalogPage() {
  // États des filtres avec valeurs par défaut
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedManufacturers, setSelectedManufacturers] = useState<string[]>(['Apple']); // Apple par défaut
  const [selectedAppearances, setSelectedAppearances] = useState<string[]>(['Grade C', 'Grade BC']); // Grade C et BC par défaut
  const [selectedFunctionalities, setSelectedFunctionalities] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedBoxedOptions, setSelectedBoxedOptions] = useState<string[]>([]);
  const [selectedAdditionalInfo, setSelectedAdditionalInfo] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [quantityMin, setQuantityMin] = useState('');
  const [quantityMax, setQuantityMax] = useState('');
  
  // États de tri et pagination
  const [sortField, setSortField] = useState<SortField>('product_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [itemsPerPage, setItemsPerPage] = useState(500); // 500 par défaut
  const [currentPage, setCurrentPage] = useState(1);
  
  // États des commandes - Initialisés depuis localStorage
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
  const [selectedProducts, setSelectedProducts] = useState<{[key: string]: boolean}>({});
  
  // État pour éviter les erreurs d'hydratation
  const [isClient, setIsClient] = useState(false);
  
  // État pour les vrais produits depuis Supabase
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalProductsCount, setTotalProductsCount] = useState<number | null>(null);
  
  const router = useRouter();

  // États de dropdowns avec timer pour fermeture
  const [dropdownOpen, setDropdownOpen] = useState<{[key: string]: boolean}>({
    manufacturer: false,
    appearance: false,
    functionality: false,
    boxed: false,
    additionalInfo: false,
    color: false,
    export: false
  });
  const [closeTimeout, setCloseTimeout] = useState<NodeJS.Timeout | null>(null);

  // Charger les quantités de la commande active
  useEffect(() => {
    // Marquer qu'on est côté client
    setIsClient(true);
    
    console.log('🔄 INITIALISATION');
    console.log('Current draft order:', currentDraftOrder);
    console.log('Draft orders:', Object.keys(draftOrders));
    
    if (currentDraftOrder && draftOrders[currentDraftOrder]) {
      const currentOrderItems = draftOrders[currentDraftOrder].items || {};
      setQuantities(currentOrderItems);
      console.log('✅ Quantités chargées:', Object.keys(currentOrderItems).length, 'produits');
    } else if (currentDraftOrder) {
      // La commande active n'existe plus
      console.log('⚠️ Commande active introuvable, reset');
      setCurrentDraftOrder(null);
      localStorage.removeItem('currentDraftOrder');
      
      // Chercher une autre commande brouillon
      const drafts = Object.values(draftOrders).filter((order: any) => order.status === 'draft');
      if (drafts.length > 0) {
        const lastDraft = drafts.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0] as any;
        
        console.log('🔄 Nouvelle commande active:', lastDraft.id);
        setCurrentDraftOrder(lastDraft.id);
        setQuantities(lastDraft.items || {});
        saveCurrentOrderToLocalStorage(lastDraft.id);
      }
    }
  }, []); // Exécuter seulement au montage

  // Fonction pour sauvegarder immédiatement dans localStorage
  const saveDraftOrdersToLocalStorage = (orders: any) => {
    console.log('💾 Sauvegarde immédiate dans localStorage:', Object.keys(orders));
    localStorage.setItem('draftOrders', JSON.stringify(orders));
  };

  // Fonction pour sauvegarder la commande active
  const saveCurrentOrderToLocalStorage = (orderId: string | null) => {
    console.log('💾 Sauvegarde commande active:', orderId);
    if (orderId) {
      localStorage.setItem('currentDraftOrder', orderId);
    } else {
      localStorage.removeItem('currentDraftOrder');
    }
  };

  // Charger les produits depuis Supabase
  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        setError(null);
        
        // D'abord, obtenir le nombre total de produits
        const { count: totalCount, error: countError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);
          
        if (countError) throw countError;
        
        console.log('📊 Nombre total de produits actifs dans Supabase:', totalCount);
        setTotalProductsCount(totalCount);
        
        // Charger TOUS les produits par batch
        let allProducts: Product[] = [];
        const batchSize = 1000;
        let currentBatch = 0;
        
        while (allProducts.length < (totalCount || 0)) {
          const from = currentBatch * batchSize;
          const to = from + batchSize - 1;
          
          console.log(`📦 Chargement batch ${currentBatch + 1}: produits ${from} à ${to}`);
          
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('product_name')
            .range(from, to);
          
          if (error) throw error;
          
          if (data && data.length > 0) {
            allProducts = [...allProducts, ...data];
            console.log(`✅ Batch chargé: ${data.length} produits (total chargé: ${allProducts.length}/${totalCount})`);
          } else {
            break; // Plus de données
          }
          
          currentBatch++;
          
          // Sécurité
          if (currentBatch > 50) {
            console.warn('⚠️ Arrêt sécurité après 50 batchs');
            break;
          }
        }
        
        console.log('🔍 TOUS les produits chargés:', allProducts.length, 'sur', totalCount, 'total');
        console.log('📊 DEBUG: Taille du tableau reçu:', allProducts.length);
        console.log('📊 DEBUG: Count exact Supabase:', totalCount);
        setProducts(allProducts);
      } catch (err) {
        console.error('Erreur chargement produits:', err);
        setError('Erreur lors du chargement des produits');
        // Utiliser les données de démo en cas d'erreur
        console.log('🔄 Utilisation des données de démo:', mockProducts.length, 'produits');
        setProducts(mockProducts);
        setTotalProductsCount(mockProducts.length);
      } finally {
        setLoading(false);
      }
    }
    
    loadProducts();
  }, []);

  // Fonction pour rafraîchir les données après mise à jour du catalogue
  const refreshProducts = async () => {
    console.log('🔄 Rafraîchissement des produits...');
    
    try {
      setLoading(true);
      setError(null);
      
      // Recharger les produits depuis Supabase
      const { count: totalCount, error: countError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
        
      if (countError) throw countError;
      
      console.log('📊 Nombre total de produits après mise à jour:', totalCount);
      setTotalProductsCount(totalCount);
      
      // Charger TOUS les produits par batch
      let allProducts: Product[] = [];
      const batchSize = 1000;
      let currentBatch = 0;
      
      while (allProducts.length < (totalCount || 0)) {
        const from = currentBatch * batchSize;
        const to = from + batchSize - 1;
        
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('product_name')
          .range(from, to);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allProducts = [...allProducts, ...data];
        } else {
          break;
        }
        
        currentBatch++;
        
        if (currentBatch > 50) {
          console.warn('⚠️ Arrêt sécurité après 50 batchs');
          break;
        }
      }
      
      console.log('✅ Produits rafraîchis:', allProducts.length, 'produits');
      setProducts(allProducts);
      
      // Réinitialiser la page courante si nécessaire
      if (currentPage > 1) {
        setCurrentPage(1);
      }
      
    } catch (err) {
      console.error('Erreur rafraîchissement produits:', err);
      setError('Erreur lors du rafraîchissement des produits');
    } finally {
      setLoading(false);
    }
  };

  // Extraire les valeurs uniques depuis les produits
  const uniqueColors = useMemo(() => {
    const colors = new Set(products.map(p => p.color).filter(Boolean));
    return Array.from(colors).sort();
  }, [products]);

  // Fonction pour vérifier si un produit contient un manufacturer
  const productContainsManufacturer = (productName: string, manufacturers: string[]) => {
    return manufacturers.some(manufacturer => 
      productName.toLowerCase().includes(manufacturer.toLowerCase())
    );
  };

  // Filtrage et tri des produits
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products.filter(product => {
      // Recherche globale
      const matchesSearch = !searchTerm || 
        product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Manufacturer (dans le nom du produit)
      const matchesManufacturer = selectedManufacturers.length === 0 || 
        productContainsManufacturer(product.product_name, selectedManufacturers);
      
      // Appearance
      const matchesAppearance = selectedAppearances.length === 0 || 
        selectedAppearances.includes(product.appearance);
      
      // Functionality
      const matchesFunctionality = selectedFunctionalities.length === 0 || 
        selectedFunctionalities.includes(product.functionality);
      
      // Color
      const matchesColor = selectedColors.length === 0 || 
        selectedColors.includes(product.color);
      
      // Boxed
      const matchesBoxed = selectedBoxedOptions.length === 0 || 
        selectedBoxedOptions.includes(product.boxed);
      
      // Additional Info
      const matchesAdditionalInfo = selectedAdditionalInfo.length === 0 || 
        (product.additional_info && selectedAdditionalInfo.includes(product.additional_info));
      
      // Prix
      const matchesPriceMin = !priceMin || product.price_dbc >= parseFloat(priceMin);
      const matchesPriceMax = !priceMax || product.price_dbc <= parseFloat(priceMax);
      
      // Quantité
      const matchesQuantityMin = !quantityMin || product.quantity >= parseInt(quantityMin);
      const matchesQuantityMax = !quantityMax || product.quantity <= parseInt(quantityMax);
      
      return matchesSearch && matchesManufacturer && matchesAppearance && 
             matchesFunctionality && matchesColor && matchesBoxed &&
             matchesAdditionalInfo && matchesPriceMin && matchesPriceMax && 
             matchesQuantityMin && matchesQuantityMax;
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
  }, [searchTerm, selectedManufacturers, selectedAppearances, selectedFunctionalities, 
      selectedColors, selectedBoxedOptions, selectedAdditionalInfo, priceMin, priceMax, 
      quantityMin, quantityMax, sortField, sortDirection, products]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage);
  const paginatedProducts = filteredAndSortedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Gestion des filtres multi-sélection
  const toggleFilter = (value: string, currentValues: string[], setter: (values: string[]) => void) => {
    if (currentValues.includes(value)) {
      setter(currentValues.filter(v => v !== value));
    } else {
      setter([...currentValues, value]);
    }
  };

  // Gestion du tri
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Fonction pour gérer l'ouverture/fermeture des dropdowns
  const toggleDropdown = (key: string) => {
    setDropdownOpen(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleMouseEnterDropdown = (key: string) => {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      setCloseTimeout(null);
    }
  };

  const handleMouseLeaveDropdown = (key: string) => {
    const timeout = setTimeout(() => {
      setDropdownOpen(prev => ({
        ...prev,
        [key]: false
      }));
    }, 200); // 200ms de délai
    setCloseTimeout(timeout);
  };

  // Fermer tous les dropdowns quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Ne fermer que si on clique en dehors des dropdowns
      if (!target.closest('.dropdown-container')) {
        setDropdownOpen({
          manufacturer: false,
          appearance: false,
          functionality: false,
          boxed: false,
          additionalInfo: false,
          color: false,
          export: false
        });
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Gestion du panier - CORRIGÉ selon feedback
  const updateQuantity = (sku: string, value: string) => {
    const newQuantity = value === '' ? 0 : parseInt(value);
    
    // Valider que la quantité est >= 0
    if (value === '' || newQuantity >= 0) {
      setQuantities(prev => ({ ...prev, [sku]: value === '' ? '' : newQuantity }));
      
      // Mettre à jour dans la commande actuelle si elle existe
      if (currentDraftOrder) {
        let newDraftOrders;
        
        if (newQuantity === 0 || value === '') {
          // Si quantité 0 ou vide, retirer le produit
          const newItems = { ...draftOrders[currentDraftOrder]?.items };
          delete newItems[sku];
          
          newDraftOrders = {
            ...draftOrders,
            [currentDraftOrder]: {
              ...draftOrders[currentDraftOrder],
              items: newItems
            }
          };
        } else {
          // Sinon, mettre à jour la quantité
          newDraftOrders = {
            ...draftOrders,
            [currentDraftOrder]: {
              ...draftOrders[currentDraftOrder],
              items: {
                ...draftOrders[currentDraftOrder]?.items,
                [sku]: newQuantity
              }
            }
          };
        }
        
        setDraftOrders(newDraftOrders);
        
        // Sauvegarder immédiatement
        saveDraftOrdersToLocalStorage(newDraftOrders);
      }
    }
  };

  const addToCart = (sku: string) => {
    // Le bouton ajouter incrémente de 1
    const currentQuantity = quantities[sku] || 0;
    const newQuantity = typeof currentQuantity === 'string' ? parseInt(currentQuantity) + 1 : currentQuantity + 1;
    addToCartWithQuantity(sku, newQuantity, true); // Replace avec la nouvelle quantité
  };

  const addToCartWithQuantity = (sku: string, quantity: number, replace: boolean = false) => {
    console.log('🛒 ADD TO CART WITH QUANTITY');
    console.log('SKU:', sku, 'Quantity:', quantity, 'Replace:', replace);
    console.log('Current draft order AVANT:', currentDraftOrder);
    console.log('Draft orders AVANT:', Object.keys(draftOrders));
    
    // Si pas de commande active, chercher d'abord s'il y a une commande brouillon existante
    if (!currentDraftOrder) {
      console.log('🔍 Pas de commande active, recherche...');
      
      // Chercher une commande brouillon existante
      const existingDrafts = Object.values(draftOrders).filter((order: any) => order.status === 'draft');
      console.log('Commandes brouillon trouvées:', existingDrafts.length);
      
      if (existingDrafts.length > 0) {
        // Utiliser la dernière commande brouillon
        const lastDraft = existingDrafts.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0] as any;
        
        console.log('✅ Commande brouillon réactivée:', lastDraft.id);
        setCurrentDraftOrder(lastDraft.id);
        saveCurrentOrderToLocalStorage(lastDraft.id);
        
        // Continuer avec cette commande
        const currentQuantity = lastDraft.items?.[sku] || 0;
        const newQuantity = replace ? quantity : currentQuantity + quantity;
        
        console.log('Quantité actuelle:', currentQuantity, '→ Nouvelle quantité:', newQuantity);
        
        const newDraftOrders = {
          ...draftOrders,
          [lastDraft.id]: {
            ...lastDraft,
            items: {
              ...lastDraft.items,
              [sku]: newQuantity
            }
          }
        };
        
        setDraftOrders(newDraftOrders);
        setQuantities(prev => ({ ...prev, [sku]: newQuantity }));
        setSelectedProducts(prev => ({ ...prev, [sku]: true }));
        
        // Sauvegarder immédiatement
        saveDraftOrdersToLocalStorage(newDraftOrders);
        
        console.log('✅ Produit ajouté à la commande existante');
        return;
      }
      
      console.log('🆕 Aucune commande brouillon, demande de nom');
      // Si vraiment aucune commande brouillon, alors demander un nom
      setShowOrderNamePopup(true);
      sessionStorage.setItem('pendingProduct', JSON.stringify({ sku, quantity, replace }));
      return;
    }

    console.log('🎯 Commande active trouvée:', currentDraftOrder);
    const currentQuantity = draftOrders[currentDraftOrder]?.items?.[sku] || 0;
    const newQuantity = replace ? quantity : currentQuantity + quantity;
    
    console.log('Quantité actuelle:', currentQuantity, '→ Nouvelle quantité:', newQuantity);
    
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
    
    console.log('Draft orders APRÈS:', Object.keys(newDraftOrders));
    
    setDraftOrders(newDraftOrders);
    setQuantities(prev => ({ ...prev, [sku]: newQuantity }));
    
    // Mettre à jour visuellement la case cochée
    setSelectedProducts(prev => ({ ...prev, [sku]: true }));
    
    // Sauvegarder immédiatement
    saveDraftOrdersToLocalStorage(newDraftOrders);
    
    console.log('✅ Produit ajouté à la commande active');
  };

  // Fonction pour sélectionner toute la quantité disponible (case à cocher)
  const selectFullQuantity = (sku: string, productQuantity: number) => {
    addToCartWithQuantity(sku, productQuantity, true); // Replace avec toute la quantité
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
    
    // Sauvegarder immédiatement
    saveDraftOrdersToLocalStorage(newDraftOrders);
    saveCurrentOrderToLocalStorage(orderId);

    // Traiter le produit en attente
    const pendingProduct = sessionStorage.getItem('pendingProduct');
    
    if (pendingProduct) {
      const { sku, quantity, replace } = JSON.parse(pendingProduct);
      
      newDraftOrders[orderId].items = { [sku]: quantity };
      setDraftOrders(newDraftOrders);
      setQuantities(prev => ({ ...prev, [sku]: quantity }));
      setSelectedProducts(prev => ({ ...prev, [sku]: true }));
      sessionStorage.removeItem('pendingProduct');
      
      // Sauvegarder encore avec le produit ajouté
      saveDraftOrdersToLocalStorage(newDraftOrders);
    }
  };

  const getTotalCartItems = () => {
    if (!currentDraftOrder || !draftOrders[currentDraftOrder]) return 0;
    const items = draftOrders[currentDraftOrder].items || {};
    return Object.values(items).reduce((sum: number, qty: any) => sum + (typeof qty === 'number' ? qty : 0), 0);
  };

  const getTotalCartAmount = () => {
    if (!currentDraftOrder || !draftOrders[currentDraftOrder]) return 0;
    const items = draftOrders[currentDraftOrder].items || {};
    return Object.entries(items).reduce((sum: number, [sku, qty]: [string, any]) => {
      const product = products.find(p => p.sku === sku);
      const quantity = typeof qty === 'number' ? qty : 0;
      return sum + (product ? product.price_dbc * quantity : 0);
    }, 0);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedManufacturers([]);
    setSelectedAppearances([]);
    setSelectedFunctionalities([]);
    setSelectedColors([]);
    setSelectedBoxedOptions([]);
    setSelectedAdditionalInfo([]);
    setPriceMin('');
    setPriceMax('');
    setQuantityMin('');
    setQuantityMax('');
    setCurrentPage(1);
    
    console.log('Filtres réinitialisés');
  };

  // Fonction d'export
  const exportCatalog = (format: 'xlsx' | 'csv') => {
    console.log(`📊 Export catalogue au format ${format}...`);
    
    // Préparer les données pour l'export
    const exportData = filteredAndSortedProducts.map(product => {
      const manufacturer = MANUFACTURERS.find(m => 
        product.product_name.toLowerCase().includes(m.toLowerCase())
      ) || '-';
      
      return {
        'SKU': product.sku,
        'Nom du produit': product.product_name,
        'Marque': manufacturer,
        'Apparence': product.appearance,
        'Fonction.': product.functionality,
        'Couleur': product.color || '-',
        'Emballage': product.boxed,
        'Informations': product.additional_info || '-',
        'Stock': product.quantity,
        'Prix DBC': product.price_dbc,
        'TVA Marginale': product.vat_type === 'Marginal' ? 'Oui' : 'Non'
      };
    });

    if (format === 'xlsx') {
      // Import dynamique de xlsx
      import('xlsx').then((XLSX) => {
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Catalogue DBC');
        
        // Télécharger
        const fileName = `catalogue_dbc_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        
        console.log('✅ Export Excel terminé');
      }).catch(err => {
        console.error('Erreur export Excel:', err);
        alert('Erreur lors de l\'export Excel');
      });
    } else if (format === 'csv') {
      // Export CSV manuel
      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join(';'),
        ...exportData.map(row => 
          headers.map(header => {
            const value = (row as any)[header];
            // Échapper les valeurs contenant des points-virgules ou des guillemets
            if (typeof value === 'string' && (value.includes(';') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(';')
        )
      ].join('\n');
      
      // Créer un blob avec BOM UTF-8
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Télécharger
      const link = document.createElement('a');
      link.href = url;
      link.download = `catalogue_dbc_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('✅ Export CSV terminé');
    }
  };

  // Fonction pour décrémenter la quantité
  const decrementQuantity = (sku: string) => {
    const currentQuantity = quantities[sku] || 0;
    const numQuantity = typeof currentQuantity === 'string' ? parseInt(currentQuantity) : currentQuantity;
    
    if (numQuantity > 1) {
      addToCartWithQuantity(sku, numQuantity - 1, true);
    } else if (numQuantity === 1) {
      // Retirer complètement du panier
      if (currentDraftOrder && draftOrders[currentDraftOrder]) {
        const newItems = { ...draftOrders[currentDraftOrder].items };
        delete newItems[sku];
        
        const newDraftOrders = {
          ...draftOrders,
          [currentDraftOrder]: {
            ...draftOrders[currentDraftOrder],
            items: newItems
          }
        };
        
        setDraftOrders(newDraftOrders);
        setQuantities(prev => {
          const newQuantities = { ...prev };
          delete newQuantities[sku];
          return newQuantities;
        });
        
        saveDraftOrdersToLocalStorage(newDraftOrders);
      }
      setSelectedProducts(prev => ({ ...prev, [sku]: false }));
    }
  };

  // Synchroniser les cases à cocher avec la commande active
  useEffect(() => {
    if (currentDraftOrder && draftOrders[currentDraftOrder]) {
      const items = draftOrders[currentDraftOrder].items || {};
      console.log('🔄 Synchronisation - Items:', Object.keys(items).length, 'produits');
      
      const newSelectedProducts: {[key: string]: boolean} = {};
      
      // Pour chaque produit du catalogue, vérifier s'il est sélectionné
      products.forEach(product => {
        const quantityInCart = items[product.sku] || 0;
        // Case cochée SEULEMENT si on a TOUTE la quantité disponible
        newSelectedProducts[product.sku] = quantityInCart === product.quantity && quantityInCart > 0;
      });
      
      setSelectedProducts(newSelectedProducts);
    } else {
      console.log('🔄 Synchronisation - Pas de commande active');
      setSelectedProducts({});
    }
  }, [currentDraftOrder, draftOrders, products]);

  // Fonction pour obtenir la classe CSS de la couleur
  const getColorClass = (color: string | null) => {
    if (!color) return 'bg-gray-100 text-gray-800';
    
    const colorLower = color.toLowerCase();
    
    switch (colorLower) {
      case 'black':
        return 'bg-gray-900 text-white';
      case 'white':
        return 'bg-gray-100 text-gray-900 border border-gray-300';
      case 'red':
        return 'bg-red-500 text-white';
      case 'blue':
        return 'bg-blue-500 text-white';
      case 'green':
        return 'bg-green-500 text-white';
      case 'yellow':
        return 'bg-yellow-400 text-gray-900';
      case 'purple':
        return 'bg-purple-500 text-white';
      case 'pink':
        return 'bg-pink-500 text-white';
      case 'orange':
        return 'bg-orange-500 text-white';
      case 'gray':
      case 'grey':
        return 'bg-gray-500 text-white';
      case 'silver':
        return 'bg-gray-300 text-gray-900';
      case 'gold':
        return 'bg-yellow-600 text-white';
      case 'rose':
        return 'bg-rose-500 text-white';
      case 'coral':
        return 'bg-coral-500 text-white';
      case 'midnight':
        return 'bg-slate-900 text-white';
      case 'graphite':
        return 'bg-slate-700 text-white';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-dbc-dark-green shadow-sm">
        <div className="max-w-[1800px] mx-auto px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/catalog')}
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
              >
                <DBCLogo className="h-8 w-8" />
                <h1 className="text-xl font-semibold text-white">DBC B2B Platform</h1>
              </button>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => router.push('/orders')}
                className="relative hover:text-dbc-bright-green transition-colors"
              >
                <ShoppingCart className="h-6 w-6 text-white" />
                {isClient && getTotalCartItems() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-dbc-light-green text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {getTotalCartItems()}
                  </span>
                )}
              </button>

              {currentDraftOrder && draftOrders[currentDraftOrder] && (
                <div className="text-white text-sm">
                  <span className="text-dbc-bright-green">Commande:</span> {draftOrders[currentDraftOrder].name}
                  <div className="text-xs text-dbc-bright-green">
                    {getTotalCartItems()} article{getTotalCartItems() > 1 ? 's' : ''} • {getTotalCartAmount().toFixed(2)}€
                  </div>
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

      {/* Conteneur principal avec plus d'espace et centrage */}
      <div className="max-w-[2000px] mx-auto px-4 py-6">
        {/* Barre d'outils principale */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          {/* Recherche et actions */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dbc-light-green focus:border-transparent text-gray-900"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={resetFilters}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
              >
                Réinitialiser filtres
              </button>
              
              <CatalogUpdateButton onUpdateComplete={refreshProducts} />
              
              {/* Dropdown Export Catalogue */}
              <div className="relative dropdown-container">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleDropdown('export');
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-dbc-light-green text-white rounded-lg hover:bg-green-600 text-sm"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Export Catalogue</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                
                {dropdownOpen.export && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportCatalog('xlsx');
                        setDropdownOpen(prev => ({ ...prev, export: false }));
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                    >
                      📊 Format Excel (.xlsx)
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportCatalog('csv');
                        setDropdownOpen(prev => ({ ...prev, export: false }));
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
                    >
                      📄 Format CSV UTF-8
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pagination en haut */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                <span className="font-semibold text-lg">{filteredAndSortedProducts.length.toLocaleString('fr-FR')}</span> produits affichés
                {totalProductsCount && filteredAndSortedProducts.length !== totalProductsCount && (
                  <span className="text-gray-500">
                    {' '}(filtrés sur <span className="font-medium">{totalProductsCount.toLocaleString('fr-FR')}</span> total)
                  </span>
                )}
                {(selectedManufacturers.length > 0 || selectedAppearances.length > 0 || searchTerm) && (
                  <div className="text-xs text-amber-600 mt-1">
                    ⚠️ Filtres actifs - {products.length - filteredAndSortedProducts.length} produits masqués
                  </div>
                )}
              </div>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-900"
              >
                <option value={100}>100 par page</option>
                <option value={250}>250 par page</option>
                <option value={500}>500 par page</option>
                <option value={1000}>1000 par page</option>
              </select>
            </div>
            
            {/* Navigation des pages */}
            {totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 hover:bg-gray-50"
                >
                  Premier
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 hover:bg-gray-50"
                >
                  ←
                </button>
                <span className="px-3 py-1 text-sm text-gray-700">
                  Page {currentPage} sur {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 hover:bg-gray-50"
                >
                  →
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 hover:bg-gray-50"
                >
                  Dernier
                </button>
              </div>
            )}
          </div>

          {/* Filtres avancés avec dropdowns cliquables */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {/* Manufacturer - Fixé */}
            <div 
              className="relative dropdown-container"
              onMouseEnter={() => handleMouseEnterDropdown('manufacturer')}
              onMouseLeave={() => handleMouseLeaveDropdown('manufacturer')}
            >
              <label className="block text-sm font-medium text-gray-900 mb-2">Manufacturer</label>
              <div className="relative">
                <div 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleDropdown('manufacturer');
                  }}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 cursor-pointer hover:border-gray-400 bg-white text-gray-900 flex items-center justify-between"
                >
                  <span>
                    {selectedManufacturers.length === 0 ? 'Tous' : `${selectedManufacturers.length} sélectionné(s)`}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </div>
                {dropdownOpen.manufacturer && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
                    <div className="max-h-60 overflow-y-auto">
                      {MANUFACTURERS.map(manufacturer => (
                        <label key={manufacturer} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer text-gray-900">
                          <input
                            type="checkbox"
                            checked={selectedManufacturers.includes(manufacturer)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleFilter(manufacturer, selectedManufacturers, setSelectedManufacturers);
                            }}
                            className="mr-2 text-dbc-light-green focus:ring-dbc-light-green"
                          />
                          <span className="text-sm">{manufacturer}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Appearance */}
            <div 
              className="relative dropdown-container"
              onMouseEnter={() => handleMouseEnterDropdown('appearance')}
              onMouseLeave={() => handleMouseLeaveDropdown('appearance')}
            >
              <label className="block text-sm font-medium text-gray-900 mb-2">Appearance</label>
              <div className="relative">
                <div 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleDropdown('appearance');
                  }}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 cursor-pointer hover:border-gray-400 bg-white text-gray-900 flex items-center justify-between"
                >
                  <span>
                    {selectedAppearances.length === 0 ? 'Tous' : `${selectedAppearances.length} sélectionné(s)`}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </div>
                {dropdownOpen.appearance && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
                    <div className="max-h-60 overflow-y-auto">
                      {APPEARANCES.map(appearance => (
                        <label key={appearance} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer text-gray-900">
                          <input
                            type="checkbox"
                            checked={selectedAppearances.includes(appearance)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleFilter(appearance, selectedAppearances, setSelectedAppearances);
                            }}
                            className="mr-2 text-dbc-light-green focus:ring-dbc-light-green"
                          />
                          <span className="text-sm">{appearance}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Functionality */}
            <div 
              className="relative dropdown-container"
              onMouseEnter={() => handleMouseEnterDropdown('functionality')}
              onMouseLeave={() => handleMouseLeaveDropdown('functionality')}
            >
              <label className="block text-sm font-medium text-gray-900 mb-2">Functionality</label>
              <div className="relative">
                <div 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleDropdown('functionality');
                  }}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 cursor-pointer hover:border-gray-400 bg-white text-gray-900 flex items-center justify-between"
                >
                  <span>
                    {selectedFunctionalities.length === 0 ? 'Tous' : `${selectedFunctionalities.length} sélectionné(s)`}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </div>
                {dropdownOpen.functionality && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
                    {FUNCTIONALITIES.map(functionality => (
                      <label key={functionality} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer text-gray-900">
                        <input
                          type="checkbox"
                          checked={selectedFunctionalities.includes(functionality)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleFilter(functionality, selectedFunctionalities, setSelectedFunctionalities);
                          }}
                          className="mr-2 text-dbc-light-green focus:ring-dbc-light-green"
                        />
                        <span className="text-sm">{functionality}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Boxed */}
            <div 
              className="relative dropdown-container"
              onMouseEnter={() => handleMouseEnterDropdown('boxed')}
              onMouseLeave={() => handleMouseLeaveDropdown('boxed')}
            >
              <label className="block text-sm font-medium text-gray-900 mb-2">Boxed</label>
              <div className="relative">
                <div 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleDropdown('boxed');
                  }}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 cursor-pointer hover:border-gray-400 bg-white text-gray-900 flex items-center justify-between"
                >
                  <span>
                    {selectedBoxedOptions.length === 0 ? 'Tous' : `${selectedBoxedOptions.length} sélectionné(s)`}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </div>
                {dropdownOpen.boxed && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
                    {BOXED_OPTIONS.map(boxed => (
                      <label key={boxed} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer text-gray-900">
                        <input
                          type="checkbox"
                          checked={selectedBoxedOptions.includes(boxed)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleFilter(boxed, selectedBoxedOptions, setSelectedBoxedOptions);
                          }}
                          className="mr-2 text-dbc-light-green focus:ring-dbc-light-green"
                        />
                        <span className="text-sm">{boxed}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Filtres de prix et quantité avec de meilleures couleurs */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-900 mb-2">Price</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="From"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1 text-gray-900 focus:ring-2 focus:ring-dbc-light-green focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="To"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1 text-gray-900 focus:ring-2 focus:ring-dbc-light-green focus:border-transparent"
                />
              </div>
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-900 mb-2">Quantity</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="From"
                  value={quantityMin}
                  onChange={(e) => setQuantityMin(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1 text-gray-900 focus:ring-2 focus:ring-dbc-light-green focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="To"
                  value={quantityMax}
                  onChange={(e) => setQuantityMax(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1 text-gray-900 focus:ring-2 focus:ring-dbc-light-green focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tableau des produits avec pagination en bas aussi */}
        <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
          <table className="w-full table-auto divide-y divide-gray-200 min-w-[1400px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedProducts && products.length > 0 && products.every(p => selectedProducts[p.sku])}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Sélectionner tous les produits visibles avec leur quantité max
                        const newSelection: {[key: string]: boolean} = {};
                        const newQuantities: {[key: string]: number} = {};
                        products.forEach(product => {
                          newSelection[product.sku] = true;
                          newQuantities[product.sku] = product.quantity;
                        });
                        setSelectedProducts(newSelection);
                        setQuantities(newQuantities);
                      } else {
                        // Désélectionner tous
                        setSelectedProducts({});
                        setQuantities({});
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="w-32 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="w-80 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom du produit</th>
                <th className="w-24 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Apparence</th>
                <th className="w-24 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fonction.</th>
                <th className="w-32 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Informations</th>
                <th className="w-24 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Couleur</th>
                <th className="w-24 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Emballage</th>
                <th className="w-16 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="w-20 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix</th>
                <th className="w-16 px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qté</th>
                <th className="w-20 px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedProducts.map((product) => {
                const quantityInCart = currentDraftOrder && draftOrders[currentDraftOrder]?.items?.[product.sku] || 0;
                // La case est cochée SEULEMENT si on a pris TOUTE la quantité disponible
                const isChecked = quantityInCart === product.quantity && quantityInCart > 0;
                // La ligne est en surbrillance dès qu'il y a une quantité dans le panier
                const isHighlighted = quantityInCart > 0;
                
                return (
                  <tr 
                    key={product.sku} 
                    className={`hover:bg-gray-50 ${isHighlighted ? 'bg-green-50 border-l-4 border-dbc-light-green' : ''}`}
                  >
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          e.stopPropagation();
                          const isChecked = e.target.checked;
                          
                          if (isChecked) {
                            // Si coché, sélectionner TOUTE la quantité disponible
                            selectFullQuantity(product.sku, product.quantity);
                            setSelectedProducts(prev => ({ ...prev, [product.sku]: true }));
                          } else {
                            // Si décoché, retirer du panier
                            if (currentDraftOrder && draftOrders[currentDraftOrder]) {
                              const newItems = { ...draftOrders[currentDraftOrder].items };
                              delete newItems[product.sku];
                              
                              const newDraftOrders = {
                                ...draftOrders,
                                [currentDraftOrder]: {
                                  ...draftOrders[currentDraftOrder],
                                  items: newItems
                                }
                              };
                              
                              setDraftOrders(newDraftOrders);
                              
                              setQuantities(prev => {
                                const newQuantities = { ...prev };
                                delete newQuantities[product.sku];
                                return newQuantities;
                              });
                              
                              // Sauvegarder immédiatement
                              saveDraftOrdersToLocalStorage(newDraftOrders);
                            }
                            setSelectedProducts(prev => ({ ...prev, [product.sku]: false }));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-2 py-2 text-xs font-mono text-gray-900">{product.sku}</td>
                    <td className="px-2 py-2 text-xs text-gray-900">
                      <div className="break-words" title={product.product_name}>
                        {product.product_name}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <span className={`inline-flex px-1 py-0.5 text-xs font-medium rounded-full ${
                        product.appearance.includes('A+') ? 'bg-green-100 text-green-800' :
                        product.appearance.includes('A') && !product.appearance.includes('AB') ? 'bg-blue-100 text-blue-800' :
                        product.appearance.includes('B') ? 'bg-yellow-100 text-yellow-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {product.appearance.replace('Grade ', '')}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-900">{product.functionality}</td>
                    <td className="px-2 py-2 text-xs text-gray-900">
                      <div className="break-words">
                        {product.additional_info || '-'}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      {product.color ? (
                        <div className="flex items-center gap-1">
                          <div 
                            className={`w-2 h-2 rounded-full border flex-shrink-0 ${getColorClass(product.color)}`}
                          />
                          <span className="text-xs text-gray-900">{product.color}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-900">{product.boxed}</td>
                    <td className="px-2 py-2 text-xs text-left font-medium text-gray-900">{product.quantity}</td>
                    <td className="px-2 py-2 text-xs text-left font-medium text-gray-900">{product.price_dbc.toFixed(2)}€</td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min="0"
                        max={product.quantity}
                        placeholder="0"
                        value={quantityInCart || (quantities[product.sku] || '')}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          const numValue = parseInt(newValue);
                          
                          // Permettre 0 ou vide, et empêcher de dépasser la quantité disponible
                          if (newValue === '' || (numValue >= 0 && numValue <= product.quantity)) {
                            updateQuantity(product.sku, newValue);
                          }
                        }}
                        className={`w-10 px-1 py-0.5 text-xs border rounded focus:border-dbc-light-green focus:outline-none text-center bg-white font-medium text-gray-900 ${
                          isHighlighted ? 'border-dbc-light-green bg-green-50' : 'border-gray-300'
                        }`}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-center gap-0.5">
                        {/* Bouton décrémenter */}
                        <button
                          onClick={() => decrementQuantity(product.sku)}
                          disabled={!quantityInCart || quantityInCart === 0}
                          className={`inline-flex items-center p-1 border border-transparent text-xs rounded focus:outline-none ${
                            !quantityInCart || quantityInCart === 0
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                              : 'bg-red-500 text-white hover:bg-red-600'
                          }`}
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </button>
                        
                        {/* Bouton incrémenter */}
                        <button
                          onClick={() => addToCart(product.sku)}
                          disabled={quantityInCart >= product.quantity}
                          className={`inline-flex items-center p-1 border border-transparent text-xs rounded focus:outline-none ${
                            quantityInCart >= product.quantity 
                              ? 'bg-gray-400 cursor-not-allowed text-white' 
                              : 'bg-dbc-light-green hover:bg-green-600 text-white'
                          }`}
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination en bas */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2 mt-6">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 hover:bg-gray-50"
            >
              Premier
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 hover:bg-gray-50"
            >
              ← Précédent
            </button>
            <span className="px-4 py-2 text-sm text-gray-700 bg-gray-50 rounded-lg">
              Page {currentPage} sur {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 hover:bg-gray-50"
            >
              Suivant →
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 hover:bg-gray-50"
            >
              Dernier
            </button>
          </div>
        )}
      </div>

      {/* Popup création commande */}
      {showOrderNamePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-dbc-dark-green mb-4">Créer une nouvelle commande</h3>
            <p className="text-sm text-gray-600 mb-4">
              Donnez un nom à votre commande pour la retrouver facilement.
            </p>
            <input
              type="text"
              placeholder="Ex: Commande iPhone Mars 2024"
              value={orderName}
              onChange={(e) => setOrderName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dbc-light-green focus:border-transparent mb-4 text-black"
              autoFocus
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowOrderNamePopup(false);
                  setOrderName('');
                  sessionStorage.removeItem('pendingProduct');
                  // Décocher toutes les cases
                  setSelectedProducts({});
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Annuler
              </button>
              <button
                onClick={createNewOrder}
                className="px-4 py-2 bg-dbc-light-green text-white rounded-lg hover:bg-green-600"
              >
                Créer la commande
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 