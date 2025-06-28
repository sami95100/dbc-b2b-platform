'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, withAuth } from '../../../../lib/auth-context';
import AppHeader from '@/components/AppHeader';
import CatalogUpdateButton from '@/components/CatalogUpdateButton';
import ClientSelector from '@/components/ClientSelector';
import BackToTopButton from '@/components/BackToTopButton';
import { supabase, Product } from '../../../../lib/supabase';
import { OrdersUtils } from '../../../../lib/orders-utils';
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

// Valeurs de filtres basées sur l'analyse du vrai catalogue
const MANUFACTURERS = ['Apple', 'Samsung', 'Xiaomi', 'Google', 'Huawei', 'OnePlus', 'Motorola', 'Honor', 'Oppo', 'Realme', 'Sony', 'LG', 'TCL', 'Nokia', 'Vivo', 'Asus', 'ZTE', 'Nothing', 'Gigaset', 'HTC'];
const APPEARANCES = ['Brand New', 'Grade A+', 'Grade A', 'Grade AB', 'Grade B', 'Grade BC', 'Grade C', 'Grade C+'];
const FUNCTIONALITIES = ['Working', 'Minor Fault'];
const BOXED_OPTIONS = ['Original Box', 'Premium Unboxed', 'Unboxed'];
const ADDITIONAL_INFO_OPTIONS = ['AS-IS', 'Brand New Battery', 'Chip/Crack', 'Discoloration', 'Engraving', 'Engraving Removed', 'Heavy cosmetic wear', 'Other', 'Premium Refurbished', 'Reduced Battery Performance'];

// Type pour les options de tri
type SortField = 'sku' | 'product_name' | 'price_dbc' | 'quantity';
type SortDirection = 'asc' | 'desc';

function AdminCatalogPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  
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
  const [showNewProductsOnly, setShowNewProductsOnly] = useState(false);
  const [includeZeroStock, setIncludeZeroStock] = useState(false);
  const [showStandardCapacityOnly, setShowStandardCapacityOnly] = useState(false);
  
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
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [newProductsSKUs, setNewProductsSKUs] = useState<string[]>([]);
  const [lastImportDate, setLastImportDate] = useState<Date | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

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

  // Fonction pour synchroniser les commandes brouillon avec Supabase
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
          
          // Si on a des commandes en brouillon en base, les synchroniser avec le localStorage
          const syncedDraftOrders: {[key: string]: any} = {};
          
          for (const draft of supabaseDrafts) {
            syncedDraftOrders[draft.id] = {
              id: draft.id,
              name: draft.name,
              status: 'draft',
              status_label: 'Brouillon',
              createdAt: draft.created_at,
              items: draft.items || {}, // Utiliser les items récupérés depuis l'API
              supabaseId: draft.id,
              source: 'supabase',
              total_amount: draft.total_amount,
              total_items: draft.total_items
            };
          }
          
          // Mettre à jour les states
          setDraftOrders(syncedDraftOrders);
          
          // Si pas de commande active mais qu'on en a en base, prendre la plus récente
          if (!currentDraftOrder && supabaseDrafts.length > 0) {
            const latestDraft = supabaseDrafts[0]; // Déjà triée par date desc
            setCurrentDraftOrder(latestDraft.id);
            saveCurrentOrderToLocalStorage(latestDraft.id);
            
            // Mettre à jour les quantités avec les items de la commande active
            setQuantities(latestDraft.items || {});
          } else if (currentDraftOrder && syncedDraftOrders[currentDraftOrder]) {
            // Si on a déjà une commande active, synchroniser ses quantités
            setQuantities(syncedDraftOrders[currentDraftOrder].items || {});
          }
          
          // Sauvegarder dans localStorage
          localStorage.setItem('draftOrders', JSON.stringify(syncedDraftOrders));
        }
      }
    } catch (error) {
      console.warn('⚠️ Erreur synchronisation commandes brouillon:', error);
    }
  };

  // Charger les quantités de la commande active
  useEffect(() => {
    // Marquer qu'on est côté client
    setIsClient(true);
    
    // Synchroniser avec Supabase au chargement
    const initializeOrders = async () => {
      await syncDraftOrdersWithSupabase();
      
      // Après la synchronisation, vérifier la commande active
      const savedCurrentOrder = localStorage.getItem('currentDraftOrder');
      const savedDraftOrders = localStorage.getItem('draftOrders');
      
      if (savedDraftOrders) {
        const parsedDraftOrders = JSON.parse(savedDraftOrders);
        
        if (savedCurrentOrder && parsedDraftOrders[savedCurrentOrder]) {
          const currentOrderItems = parsedDraftOrders[savedCurrentOrder].items || {};
          setQuantities(currentOrderItems);
        } else if (savedCurrentOrder) {
          // La commande active n'existe plus
          setCurrentDraftOrder(null);
          localStorage.removeItem('currentDraftOrder');
          
          // Chercher une autre commande brouillon
          const drafts = Object.values(parsedDraftOrders).filter((order: any) => order.status === 'draft');
          if (drafts.length > 0) {
            const lastDraft = drafts.sort((a: any, b: any) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )[0] as any;
            
            setCurrentDraftOrder(lastDraft.id);
            setQuantities(lastDraft.items || {});
            saveCurrentOrderToLocalStorage(lastDraft.id);
          }
        }
      }
    };
    
    initializeOrders();
  }, []); // Exécuter seulement au montage

  // Resynchroniser quand la page devient visible (retour d'un autre onglet/page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isClient) {
        console.log('🔄 Page visible - resynchronisation...');
        syncDraftOrdersWithSupabase();
      }
    };

    const handleFocus = () => {
      if (isClient) {
        console.log('🔄 Page focus - resynchronisation...');
        syncDraftOrdersWithSupabase();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isClient]);

  // Protection contre les appels multiples simultanés
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fonction pour sauvegarder immédiatement dans localStorage et Supabase avec debounce
  const saveDraftOrdersToLocalStorage = async (orders: any) => {
    // Sauvegarder immédiatement dans localStorage
    localStorage.setItem('draftOrders', JSON.stringify(orders));
    
    // Debounce la synchronisation Supabase pour éviter les doublons
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      if (isSaving) return; // Éviter les appels multiples
      
      setIsSaving(true);
      try {
        // Synchroniser avec Supabase pour les commandes qui ont un supabaseId
        for (const [orderId, order] of Object.entries(orders)) {
          const orderData = order as any;
          if (orderData.supabaseId && orderData.source === 'manual') {
            try {
              await syncOrderWithSupabase(orderData);
            } catch (error) {
              console.warn('⚠️ Erreur sync Supabase pour commande', orderId, ':', error);
            }
          }
        }
      } finally {
        setIsSaving(false);
      }
    }, 500); // Debounce de 500ms
  };

  // Fonction pour synchroniser une commande avec Supabase
  const syncOrderWithSupabase = async (order: any) => {
    try {
      
      const response = await fetch('/api/orders/draft', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: order.supabaseId,
          name: order.name,
          items: order.items || {},
          totalItems: Object.values(order.items || {}).reduce((sum: number, qty: any) => 
            sum + (typeof qty === 'number' ? qty : 0), 0
          )
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn('⚠️ Erreur mise à jour Supabase:', errorData.error);
      } else {
      }
    } catch (error) {
      console.warn('⚠️ Erreur réseau sync Supabase:', error);
    }
  };

  // Fonction pour sauvegarder la commande active
  const saveCurrentOrderToLocalStorage = (orderId: string | null) => {
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
        
        // D'abord, obtenir le nombre total de produits (TOUS les produits)
        const { count: totalCount, error: countError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true });
          
        if (countError) throw countError;
        
        setTotalProductsCount(totalCount);
        
        // Charger d'abord les premiers produits pour afficher rapidement
        console.log('📦 Chargement initial des premiers 500 produits (TOUS - actifs et inactifs)...');
        const { data: initialProducts, error: initialError } = await supabase
          .from('products')
          .select('*')
          .order('product_name')
          .limit(500);
        
        if (initialError) throw initialError;
        
        if (initialProducts) {
          setProducts(initialProducts);
          setLoading(false); // Arrêter le loading pour les premiers produits
        }
        
        // Charger le reste en arrière-plan si nécessaire
        if (totalCount && totalCount > 500) {
          console.log('📦 Chargement du reste des produits en arrière-plan...');
          
          let allProducts: Product[] = [...initialProducts];
          const batchSize = 1000;
          let from = 500; // Commencer après les 500 premiers produits déjà chargés
          
          while (allProducts.length < totalCount) {
            const to = from + batchSize - 1;
            
            const { data, error } = await supabase
              .from('products')
              .select('*')
              .order('product_name')
              .range(from, to);
            
            if (error) {
              console.warn('⚠️ Erreur chargement batch à partir de:', from, error);
              break;
            }
            
            if (data && data.length > 0) {
              allProducts = [...allProducts, ...data];
              // Mettre à jour progressivement
              setProducts([...allProducts]);
              console.log(`📦 Chargé batch ${from}-${from + data.length - 1}, total: ${allProducts.length}/${totalCount}`);
            } else {
              break; // Plus de données
            }
            
            from += batchSize; // Incrémenter de batchSize pour le prochain batch
            
            // Sécurité
            if (from > totalCount + batchSize) {
              console.warn('⚠️ Arrêt sécurité - dépassement de limite');
              break;
            }
            
            // Petite pause pour ne pas surcharger
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          console.log('✅ Chargement complet terminé:', allProducts.length, 'produits sur', totalCount, 'attendus');
        }
        
      } catch (err) {
        console.error('Erreur chargement produits:', err);
        setError('Erreur lors du chargement des produits');
        setProducts([]);
        setTotalProductsCount(0);
        setLoading(false);
      }
    }
    
    loadProducts();
  }, []);

  // Fonction pour rafraîchir les données après mise à jour du catalogue
  const refreshProducts = async () => {
    
    try {
      setLoading(true);
      setError(null);
      
      // Recharger les produits depuis Supabase (TOUS les produits)
      const { count: totalCount, error: countError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });
        
      if (countError) throw countError;
      
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

  // Fonction pour formater l'affichage des éléments sélectionnés
  const formatSelectedItems = (selectedItems: string[], maxLength: number = 30) => {
    if (selectedItems.length === 0) return 'Tous';
    if (selectedItems.length === 1) return selectedItems[0];
    
    const joined = selectedItems.join(', ');
    if (joined.length <= maxLength) {
      return joined;
    }
    
    // Sinon, afficher les premiers éléments + "et X autres"
    let display = '';
    let count = 0;
    for (const item of selectedItems) {
      const newDisplay = display ? `${display}, ${item}` : item;
      if (newDisplay.length > maxLength - 10) { // -10 pour laisser place à "et X autres"
        const remaining = selectedItems.length - count;
        return `${display} et ${remaining} autre${remaining > 1 ? 's' : ''}`;
      }
      display = newDisplay;
      count++;
    }
    
    return display;
  };

  // Fonction pour extraire le modèle de base et la capacité d'un nom de produit
  const parseProductInfo = (productName: string): { baseModel: string; capacity: number } | null => {
    // Pattern: (.+?) (\d+)GB(.*)
    const match = productName.match(/(.+?)\s(\d+)GB/);
    if (match) {
      const baseModel = match[1].trim();
      const capacity = parseInt(match[2]);
      return { baseModel, capacity };
    }
    return null;
  };

  // Fonction pour calculer les capacités standard par modèle (Apple et Samsung uniquement)
  const getStandardCapacities = useMemo(() => {
    const standardCapacities: { [baseModel: string]: number } = {};
    
    // Filtrer seulement Apple et Samsung
    const appleAndSamsungProducts = products.filter(product => 
      product.product_name.toLowerCase().includes('apple') || 
      product.product_name.toLowerCase().includes('samsung')
    );
    
    // Grouper par modèle de base
    const modelGroups: { [baseModel: string]: number[] } = {};
    
    appleAndSamsungProducts.forEach(product => {
      const parsed = parseProductInfo(product.product_name);
      if (parsed) {
        if (!modelGroups[parsed.baseModel]) {
          modelGroups[parsed.baseModel] = [];
        }
        modelGroups[parsed.baseModel].push(parsed.capacity);
      }
    });
    
    // Pour chaque modèle, la capacité standard = minimum
    Object.keys(modelGroups).forEach(baseModel => {
      const capacities = modelGroups[baseModel];
      standardCapacities[baseModel] = Math.min(...capacities);
    });
    
    return standardCapacities;
  }, [products]);

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
      
      // Filtre nouveaux produits - CORRIGÉ: ne montrer que les nouveaux produits qui ont maintenant du stock
      const matchesNewProducts = !showNewProductsOnly || 
        (newProductsSKUs.includes(product.sku) && product.quantity > 0);
      
      // Filtre capacité standard (Apple et Samsung uniquement)
      const matchesStandardCapacity = !showStandardCapacityOnly || (() => {
        // Vérifier si c'est Apple ou Samsung
        const isAppleOrSamsung = product.product_name.toLowerCase().includes('apple') || 
                                 product.product_name.toLowerCase().includes('samsung');
        
        if (!isAppleOrSamsung) {
          return true; // Afficher tous les autres produits si le filtre est actif
        }
        
        // Pour Apple/Samsung, vérifier si c'est la capacité standard
        const parsed = parseProductInfo(product.product_name);
        if (!parsed) return false;
        
        const standardCapacity = getStandardCapacities[parsed.baseModel];
        return standardCapacity && parsed.capacity === standardCapacity;
      })();
      
      // Filtrage par activité et stock
      const hasSearch = searchTerm.trim().length > 0;
      const hasStock = product.quantity > 0;
      const allowZeroQuantity = quantityMin === '0' || (quantityMin !== '' && parseInt(quantityMin) === 0);
      
      // Filtrer les produits inactifs SAUF si recherche active ou filtre quantité explicite
      const isActiveOrSearched = product.is_active || hasSearch || allowZeroQuantity || includeZeroStock;
      
      // Si pas de stock, n'afficher que si: recherche active OU filtre quantité OU toggle stock zéro activé
      const matchesStock = hasStock || hasSearch || allowZeroQuantity || includeZeroStock;
      
      return matchesSearch && matchesManufacturer && matchesAppearance && 
             matchesFunctionality && matchesColor && matchesBoxed &&
             matchesAdditionalInfo && matchesPriceMin && matchesPriceMax && 
             matchesQuantityMin && matchesQuantityMax && matchesNewProducts && 
             matchesStandardCapacity && matchesStock && isActiveOrSearched;
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
      quantityMin, quantityMax, sortField, sortDirection, products, showNewProductsOnly, 
      newProductsSKUs, includeZeroStock, showStandardCapacityOnly, getStandardCapacities]);

  // Calculer les statistiques des produits filtrés mais masqués
  const filteredZeroStockProducts = useMemo(() => {
    return products.filter(product => {
      // Appliquer tous les filtres sauf le filtre de stock
      const matchesSearch = !searchTerm || 
        product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesManufacturer = selectedManufacturers.length === 0 || 
        productContainsManufacturer(product.product_name, selectedManufacturers);
      
      const matchesAppearance = selectedAppearances.length === 0 || 
        selectedAppearances.includes(product.appearance);
      
      const matchesFunctionality = selectedFunctionalities.length === 0 || 
        selectedFunctionalities.includes(product.functionality);
      
      const matchesColor = selectedColors.length === 0 || 
        selectedColors.includes(product.color);
      
      const matchesBoxed = selectedBoxedOptions.length === 0 || 
        selectedBoxedOptions.includes(product.boxed);
      
      const matchesAdditionalInfo = selectedAdditionalInfo.length === 0 || 
        (product.additional_info && selectedAdditionalInfo.includes(product.additional_info));
      
      const matchesPriceMin = !priceMin || product.price_dbc >= parseFloat(priceMin);
      const matchesPriceMax = !priceMax || product.price_dbc <= parseFloat(priceMax);
      
      // Inclure seulement les produits à quantité 0 qui matchent les autres filtres
      const isZeroStock = product.quantity === 0;
      const matchesQuantityMax = !quantityMax || product.quantity <= parseInt(quantityMax);
      
      return isZeroStock && matchesSearch && matchesManufacturer && matchesAppearance && 
             matchesFunctionality && matchesColor && matchesBoxed &&
             matchesAdditionalInfo && matchesPriceMin && matchesPriceMax && matchesQuantityMax;
    });
  }, [searchTerm, selectedManufacturers, selectedAppearances, selectedFunctionalities, 
      selectedColors, selectedBoxedOptions, selectedAdditionalInfo, priceMin, priceMax, 
      quantityMax, products]);

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
  const updateQuantity = async (sku: string, value: string) => {
    const newQuantity = value === '' ? 0 : parseInt(value);
    
    // Valider que la quantité est >= 0
    if (value === '' || newQuantity >= 0) {
      setQuantities(prev => ({ ...prev, [sku]: value === '' ? '' : newQuantity }));
      
      // Mettre à jour dans la commande actuelle si elle existe
      if (currentDraftOrder && draftOrders[currentDraftOrder]) {
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
          
          // Mettre à jour les produits sélectionnés
          setSelectedProducts(prev => ({ ...prev, [sku]: false }));
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
          
          // Vérifier si c'est la quantité maximale pour cocher la case
          const product = products.find(p => p.sku === sku);
          if (product) {
            setSelectedProducts(prev => ({ 
              ...prev, 
              [sku]: newQuantity === product.quantity && newQuantity > 0 
            }));
          }
        }
        
        setDraftOrders(newDraftOrders);
        
        // Sauvegarder avec sync Supabase
        await saveDraftOrdersToLocalStorage(newDraftOrders);
      }
    }
  };

  const addToCart = async (sku: string) => {
    // Le bouton ajouter incrémente de 1
    const currentQuantity = quantities[sku] || 0;
    const newQuantity = typeof currentQuantity === 'string' ? parseInt(currentQuantity) + 1 : currentQuantity + 1;
    await addToCartWithQuantity(sku, newQuantity, true); // Replace avec la nouvelle quantité
  };

  const addToCartWithQuantity = async (sku: string, quantity: number, replace: boolean = false) => {
    
    // Si pas de commande active, chercher d'abord s'il y a une commande brouillon existante
    if (!currentDraftOrder) {
      
      // Chercher une commande brouillon existante
      const existingDrafts = Object.values(draftOrders).filter((order: any) => order.status === 'draft');
      
      if (existingDrafts.length > 0) {
        // Utiliser la dernière commande brouillon
        const lastDraft = existingDrafts.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0] as any;
        
        setCurrentDraftOrder(lastDraft.id);
        saveCurrentOrderToLocalStorage(lastDraft.id);
        
        // Continuer avec cette commande
        const currentQuantity = lastDraft.items?.[sku] || 0;
        const newQuantity = replace ? quantity : currentQuantity + quantity;
        
        
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
        
        // Sauvegarder avec sync Supabase
        await saveDraftOrdersToLocalStorage(newDraftOrders);
        
        return;
      }
      
      // Vérifier s'il existe une commande brouillon dans Supabase
      try {
        const response = await fetch('/api/orders/draft', {
          method: 'GET'
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.draftOrders && result.draftOrders.length > 0) {
            const existingDraft = result.draftOrders[0];
            alert(`⚠️ Une commande en brouillon existe déjà: "${existingDraft.name}"\n\nVeuillez d'abord la supprimer ou la finaliser avant d'en créer une nouvelle.\n\nVous pouvez gérer vos commandes depuis la page "Commandes".`);
            return;
          }
        }
      } catch (error) {
        console.warn('⚠️ Erreur vérification commandes brouillon:', error);
        // Continuer en mode dégradé en cas d'erreur réseau
      }
      
      // Si vraiment aucune commande brouillon, alors demander un nom
      setShowOrderNamePopup(true);
      sessionStorage.setItem('pendingProduct', JSON.stringify({ sku, quantity, replace }));
      return;
    }

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
    setQuantities(prev => ({ ...prev, [sku]: newQuantity }));
    
    // Mettre à jour visuellement la case cochée
    setSelectedProducts(prev => ({ ...prev, [sku]: true }));
    
    // Sauvegarder avec sync Supabase
    await saveDraftOrdersToLocalStorage(newDraftOrders);
    
  };

  // Fonction pour sélectionner toute la quantité disponible (case à cocher)
  const selectFullQuantity = async (sku: string, productQuantity: number) => {
    await addToCartWithQuantity(sku, productQuantity, true); // Replace avec toute la quantité
  };

  const createNewOrder = async () => {
    // Protection contre les double-clics
    if (creatingOrder) return;
    setCreatingOrder(true);
    
    const finalOrderName = orderName.trim() || `Commande ${new Date().toLocaleDateString('fr-FR')}`;
    
    try {
      
      // Préparer les items de la commande en attente
      const pendingProduct = sessionStorage.getItem('pendingProduct');
      const initialItems: {[key: string]: number} = {};
      
      if (pendingProduct) {
        const { sku, quantity } = JSON.parse(pendingProduct);
        initialItems[sku] = quantity;
      }

      // Calculer les totaux initiaux
      const totalItems = Object.values(initialItems).reduce((sum, qty) => sum + qty, 0);
      
      // Appeler l'API pour créer la commande dans Supabase
      const response = await fetch('/api/orders/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: finalOrderName,
          items: initialItems,
          totalItems: totalItems,
          userId: selectedClientId // Ajouter l'ID du client sélectionné
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Si c'est une erreur 409 (commande brouillon existante), afficher un message spécifique
        if (response.status === 409) {
          const existingDraft = errorData.existingDraft;
          alert(`⚠️ ${errorData.message}\n\nCommande existante: "${existingDraft.name}"\nCréée le: ${new Date(existingDraft.created_at).toLocaleDateString('fr-FR')}\n\nVous pouvez gérer vos commandes depuis la page "Commandes".`);
          setShowOrderNamePopup(false);
          setOrderName('');
          sessionStorage.removeItem('pendingProduct');
          setCreatingOrder(false);
          return;
        }
        
        throw new Error(errorData.error || 'Erreur création commande');
      }

      const result = await response.json();
      const supabaseOrder = result.order;
      

      // Créer l'objet commande pour localStorage avec l'UUID Supabase
      const newOrder = {
        id: supabaseOrder.id, // Utiliser l'UUID Supabase
        name: finalOrderName,
        status: 'draft',
        status_label: 'Brouillon',
        createdAt: supabaseOrder.created_at,
        items: initialItems,
        supabaseId: supabaseOrder.id, // Garder une référence explicite
        source: 'manual'
      };

      const newDraftOrders = { ...draftOrders, [supabaseOrder.id]: newOrder };
      
      setDraftOrders(newDraftOrders);
      setCurrentDraftOrder(supabaseOrder.id);
      setShowOrderNamePopup(false);
      setOrderName('');
      setSelectedClientId(null);
      
      // Sauvegarder dans localStorage avec l'UUID Supabase
      saveDraftOrdersToLocalStorage(newDraftOrders);
      saveCurrentOrderToLocalStorage(supabaseOrder.id);

      // Marquer les commandes comme obsolètes pour forcer le rechargement
      OrdersUtils.markOrdersAsStale();

      // Traiter le produit en attente
      if (pendingProduct) {
        const { sku, quantity } = JSON.parse(pendingProduct);
        
        setQuantities(prev => ({ ...prev, [sku]: quantity }));
        setSelectedProducts(prev => ({ ...prev, [sku]: true }));
        sessionStorage.removeItem('pendingProduct');
      }

      
    } catch (error) {
      console.error('❌ Erreur création commande:', error);
      alert(`Erreur lors de la création de la commande: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      
      // En cas d'erreur, revenir au mode localStorage uniquement
      const orderId = `DRAFT-${Date.now()}`;
      const newOrder = {
        id: orderId,
        name: finalOrderName,
        status: 'draft',
        status_label: 'Brouillon',
        createdAt: new Date().toISOString(),
        items: {},
        source: 'manual_fallback'
      };

      const newDraftOrders = { ...draftOrders, [orderId]: newOrder };
      
      setDraftOrders(newDraftOrders);
      setCurrentDraftOrder(orderId);
      setShowOrderNamePopup(false);
      setOrderName('');
      
      saveDraftOrdersToLocalStorage(newDraftOrders);
      saveCurrentOrderToLocalStorage(orderId);

      // Traiter le produit en attente
      const pendingProduct = sessionStorage.getItem('pendingProduct');
      if (pendingProduct) {
        const { sku, quantity } = JSON.parse(pendingProduct);
        
        newDraftOrders[orderId].items = { [sku]: quantity };
        setDraftOrders(newDraftOrders);
        setQuantities(prev => ({ ...prev, [sku]: quantity }));
        setSelectedProducts(prev => ({ ...prev, [sku]: true }));
        sessionStorage.removeItem('pendingProduct');
        
        saveDraftOrdersToLocalStorage(newDraftOrders);
      }
    } finally {
      setCreatingOrder(false);
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
    setShowNewProductsOnly(false);
    setIncludeZeroStock(false);
    setShowStandardCapacityOnly(false);
    setCurrentPage(1);
  };

  const toggleZeroStockProducts = () => {
    setIncludeZeroStock(!includeZeroStock);
    setCurrentPage(1);
    console.log('Toggle produits en rupture:', !includeZeroStock);
  };

  const toggleNewProductsFilter = () => {
    setShowNewProductsOnly(!showNewProductsOnly);
    setCurrentPage(1);
    console.log('Toggle nouveaux produits:', !showNewProductsOnly);
  };

  const toggleStandardCapacityFilter = () => {
    setShowStandardCapacityOnly(!showStandardCapacityOnly);
    setCurrentPage(1);
    console.log('Toggle capacités standard:', !showStandardCapacityOnly);
  };

  // Charger les SKU des nouveaux produits depuis localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedNewSKUs = localStorage.getItem('lastImportNewSKUs');
      const savedImportDate = localStorage.getItem('lastImportDate');
      
      if (savedNewSKUs) {
        try {
          setNewProductsSKUs(JSON.parse(savedNewSKUs));
        } catch (e) {
          console.error('Erreur parsing nouveaux SKU:', e);
        }
      }
      
      if (savedImportDate) {
        try {
          setLastImportDate(new Date(savedImportDate));
        } catch (e) {
          console.error('Erreur parsing date import:', e);
        }
      }
    }
  }, []);

  // Fonction d'export
  const exportCatalog = (format: 'xlsx' | 'csv') => {
    
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
      
    }
  };

  // Fonction pour décrémenter la quantité
  const decrementQuantity = async (sku: string) => {
    const currentQuantity = quantities[sku] || 0;
    const numQuantity = typeof currentQuantity === 'string' ? parseInt(currentQuantity) : currentQuantity;
    
    if (numQuantity > 1) {
      await addToCartWithQuantity(sku, numQuantity - 1, true);
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
        
        await saveDraftOrdersToLocalStorage(newDraftOrders);
      }
      setSelectedProducts(prev => ({ ...prev, [sku]: false }));
    }
  };

  // Synchroniser les cases à cocher avec la commande active
  useEffect(() => {
    if (currentDraftOrder && draftOrders[currentDraftOrder]) {
      const items = draftOrders[currentDraftOrder].items || {};
      
      const newSelectedProducts: {[key: string]: boolean} = {};
      
      // Pour chaque produit du catalogue, vérifier s'il est sélectionné
      products.forEach(product => {
        const quantityInCart = items[product.sku] || 0;
        // Case cochée SEULEMENT si on a TOUTE la quantité disponible
        newSelectedProducts[product.sku] = quantityInCart === product.quantity && quantityInCart > 0;
      });
      
      setSelectedProducts(newSelectedProducts);
    } else {
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

  // Fonction pour forcer une resynchronisation en cas d'incohérence
  const forceResync = async () => {
    console.log('🔄 Resynchronisation forcée...');
    try {
      await syncDraftOrdersWithSupabase();
      
      // Après la sync, vérifier et corriger la commande active
      const savedCurrentOrder = localStorage.getItem('currentDraftOrder');
      const savedDraftOrders = localStorage.getItem('draftOrders');
      
      if (savedCurrentOrder && savedDraftOrders) {
        const parsedDraftOrders = JSON.parse(savedDraftOrders);
        if (parsedDraftOrders[savedCurrentOrder]) {
          setQuantities(parsedDraftOrders[savedCurrentOrder].items || {});
          console.log('✅ Quantités resynchronisées');
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors de la resynchronisation:', error);
    }
  };

  // Fonction pour détecter les incohérences et corriger
  const checkAndFixInconsistencies = () => {
    if (currentDraftOrder && draftOrders[currentDraftOrder]) {
      const orderItems = draftOrders[currentDraftOrder].items || {};
      const totalInOrder = Object.values(orderItems).reduce((sum: number, qty: any) => 
        sum + (typeof qty === 'number' ? qty : 0), 0
      );
      const totalInQuantities = Object.values(quantities).reduce((sum: number, qty: any) => 
        sum + (typeof qty === 'number' ? parseInt(qty.toString()) : 0), 0
      );
      
      // Si les totaux ne correspondent pas, forcer une resync
      if (Math.abs(totalInOrder - totalInQuantities) > 0) {
        console.warn('⚠️ Incohérence détectée - resynchronisation...');
        forceResync();
      }
    }
  };

  // Vérifier les incohérences périodiquement
  useEffect(() => {
    if (isClient && currentDraftOrder) {
      const interval = setInterval(checkAndFixInconsistencies, 10000); // Toutes les 10 secondes
      return () => clearInterval(interval);
    }
  }, [isClient, currentDraftOrder, draftOrders, quantities]);

  // Nettoyage au démontage du composant
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Plus besoin de vérifications d'auth car protégé par withAuth

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50">
      {/* Header */}
      <AppHeader 
        cartItemsCount={isClient ? getTotalCartItems() : 0}
        currentOrder={currentDraftOrder && draftOrders[currentDraftOrder] ? {
          name: draftOrders[currentDraftOrder].name,
          totalItems: getTotalCartItems(),
          totalAmount: getTotalCartAmount()
        } : undefined}
        onCartClick={() => router.push('/admin/orders?refresh=' + Date.now())}
        onLogoClick={() => router.push('/admin')}
      />

      {/* Zone d'information pour les commandes en brouillon */}
      {isClient && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <div className="max-w-[2000px] mx-auto px-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Package className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Gestion des commandes :</span> 
                    {currentDraftOrder && draftOrders[currentDraftOrder] ? (
                      <>
                        {' '}Vous travaillez actuellement sur la commande "{draftOrders[currentDraftOrder].name}". 
                        Une seule commande en brouillon peut être active à la fois. 
                        Finalisez ou supprimez cette commande pour en créer une nouvelle.
                      </>
                    ) : (
                      <>
                        {' '}Vous pouvez créer une nouvelle commande en ajoutant des produits au panier. 
                        Une seule commande en brouillon peut être active à la fois.
                      </>
                    )}
                  </p>
                </div>
              </div>
              
                                {currentDraftOrder && (
                <div className="flex items-center space-x-2">
                  {isSaving && (
                    <div className="flex items-center px-2 py-1 text-xs text-blue-600">
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600 mr-1"></div>
                      Sync...
                    </div>
                  )}
                  <button
                    onClick={forceResync}
                    className="flex items-center px-3 py-1 text-xs bg-white bg-opacity-70 backdrop-blur-sm text-dbc-dark-green rounded-lg hover:bg-opacity-90 hover:shadow-md transition-all duration-200 border border-white border-opacity-30"
                    title="Resynchroniser avec la base de données"
                  >
                    <ArrowUpDown className="h-3 w-3 mr-1" />
                    Resync
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                className="px-4 py-2 bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-xl hover:bg-opacity-90 hover:shadow-lg text-sm text-gray-700 transition-all duration-200 shadow-md"
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
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-dbc-bright-green to-emerald-400 text-dbc-dark-green rounded-xl hover:from-emerald-300 hover:to-emerald-500 hover:text-white transition-all duration-200 text-sm font-semibold shadow-lg backdrop-blur-sm"
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
                {/* Boutons de toggle toujours visibles */}
                <div className="text-xs mt-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Toggle pour les produits en rupture de stock */}
                    <button
                      onClick={toggleZeroStockProducts}
                      className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                        includeZeroStock 
                          ? 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200' 
                          : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      {includeZeroStock ? '✓ ' : ''}📦 Afficher produits à quantité 0
                      {!includeZeroStock && filteredZeroStockProducts.length > 0 && ` (${filteredZeroStockProducts.length} masqués)`}
                    </button>
                    
                    {/* Toggle pour les nouveaux produits */}
                    {newProductsSKUs.length > 0 && (
                      <button
                        onClick={toggleNewProductsFilter}
                        className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                          showNewProductsOnly 
                            ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200' 
                            : 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200'
                        }`}
                      >
                        {showNewProductsOnly ? '✓ ' : ''}✨ {newProductsSKUs.length} nouveaux produits
                        {lastImportDate && ` (${lastImportDate.toLocaleDateString('fr-FR')})`}
                      </button>
                    )}
                    
                    {/* Toggle pour les capacités standard Apple/Samsung */}
                    <button
                      onClick={toggleStandardCapacityFilter}
                      className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                        showStandardCapacityOnly 
                          ? 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200' 
                          : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      {showStandardCapacityOnly ? '✓ ' : ''}📱 Capacités standard (Apple/Samsung)
                    </button>
                  </div>
                  
                  {/* Informations sur les filtres actifs */}
                  {(selectedManufacturers.length > 0 || selectedAppearances.length > 0 || searchTerm || priceMin || priceMax || quantityMin || quantityMax || showNewProductsOnly) && (
                    <div className="text-amber-600">
                      ⚠️ Filtres actifs - {products.length - filteredAndSortedProducts.length} produits masqués
                    </div>
                  )}
                </div>
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
                  className="px-3 py-1 text-sm bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-lg disabled:bg-opacity-50 disabled:text-gray-400 text-gray-700 hover:bg-opacity-90 hover:shadow-md transition-all duration-200 shadow-sm"
                >
                  Premier
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-lg disabled:bg-opacity-50 disabled:text-gray-400 text-gray-700 hover:bg-opacity-90 hover:shadow-md transition-all duration-200 shadow-sm"
                >
                  ←
                </button>
                <span className="px-3 py-1 text-sm text-gray-700 bg-white bg-opacity-60 backdrop-blur-sm rounded-lg border border-white border-opacity-20 shadow-sm">
                  Page {currentPage} sur {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-lg disabled:bg-opacity-50 disabled:text-gray-400 text-gray-700 hover:bg-opacity-90 hover:shadow-md transition-all duration-200 shadow-sm"
                >
                  →
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-lg disabled:bg-opacity-50 disabled:text-gray-400 text-gray-700 hover:bg-opacity-90 hover:shadow-md transition-all duration-200 shadow-sm"
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
                  <span className="truncate">
                    {formatSelectedItems(selectedManufacturers)}
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
                  <span className="truncate">
                    {formatSelectedItems(selectedAppearances)}
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
                  <span className="truncate">
                    {formatSelectedItems(selectedFunctionalities)}
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
                  <span className="truncate">
                    {formatSelectedItems(selectedBoxedOptions)}
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
                        onChange={async (e) => {
                          e.stopPropagation();
                          const isChecked = e.target.checked;
                          
                          if (isChecked) {
                            // Si coché, sélectionner TOUTE la quantité disponible
                            await selectFullQuantity(product.sku, product.quantity);
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
                              
                              // Sauvegarder avec sync Supabase
                              await saveDraftOrdersToLocalStorage(newDraftOrders);
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
                        onChange={async (e) => {
                          const newValue = e.target.value;
                          const numValue = parseInt(newValue);
                          
                          // Permettre 0 ou vide, et empêcher de dépasser la quantité disponible
                          if (newValue === '' || (numValue >= 0 && numValue <= product.quantity)) {
                            await updateQuantity(product.sku, newValue);
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
                          onClick={async () => await decrementQuantity(product.sku)}
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
                          onClick={async () => await addToCart(product.sku)}
                          disabled={quantityInCart >= product.quantity}
                          className={`inline-flex items-center p-1 border border-transparent text-xs rounded-lg focus:outline-none transition-all duration-200 ${
                            quantityInCart >= product.quantity 
                              ? 'bg-gray-400 cursor-not-allowed text-white' 
                              : 'bg-gradient-to-r from-dbc-bright-green to-emerald-400 hover:from-emerald-300 hover:to-emerald-500 text-dbc-dark-green hover:text-white shadow-sm backdrop-blur-sm'
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
              className="px-4 py-2 text-sm bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-xl disabled:bg-opacity-50 disabled:text-gray-400 text-gray-700 hover:bg-opacity-90 hover:shadow-lg transition-all duration-200 shadow-md"
            >
              Premier
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-xl disabled:bg-opacity-50 disabled:text-gray-400 text-gray-700 hover:bg-opacity-90 hover:shadow-lg transition-all duration-200 shadow-md"
            >
              ← Précédent
            </button>
            <span className="px-4 py-2 text-sm text-gray-700 bg-white bg-opacity-60 backdrop-blur-sm rounded-xl border border-white border-opacity-20 shadow-md">
              Page {currentPage} sur {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-xl disabled:bg-opacity-50 disabled:text-gray-400 text-gray-700 hover:bg-opacity-90 hover:shadow-lg transition-all duration-200 shadow-md"
            >
              Suivant →
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-xl disabled:bg-opacity-50 disabled:text-gray-400 text-gray-700 hover:bg-opacity-90 hover:shadow-lg transition-all duration-200 shadow-md"
            >
              Dernier
            </button>
          </div>
        )}
      </div>

      {/* Bouton retour en haut */}
      <BackToTopButton />

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
            
            {/* Sélecteur de client */}
            <div className="mb-4">
              <ClientSelector
                selectedClientId={selectedClientId}
                onChange={setSelectedClientId}
                isAdmin={true}
                currentUserId={user?.id}
              />
            </div>
            {!selectedClientId && (
              <div className="text-red-600 text-sm mb-3 font-medium">
                ⚠️ Veuillez sélectionner un client avant de créer la commande
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowOrderNamePopup(false);
                  setOrderName('');
                  setSelectedClientId(null);
                  sessionStorage.removeItem('pendingProduct');
                  // Décocher toutes les cases
                  setSelectedProducts({});
                }}
                className="px-4 py-2 bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-xl text-gray-700 hover:text-gray-900 hover:bg-opacity-90 transition-all duration-200 shadow-sm"
              >
                Annuler
              </button>
              <button
                onClick={createNewOrder}
                disabled={creatingOrder || !selectedClientId}
                className="px-4 py-2 bg-gradient-to-r from-dbc-bright-green to-emerald-400 text-dbc-dark-green rounded-xl hover:from-emerald-300 hover:to-emerald-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg backdrop-blur-sm transition-all duration-200"
              >
                {creatingOrder ? 'Création...' : 'Créer la commande'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 

// Export avec protection admin
export default withAuth(AdminCatalogPage, 'admin');