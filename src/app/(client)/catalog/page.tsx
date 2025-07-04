'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, withAuth } from '@/lib/auth-context';
import AppHeader from '@/components/AppHeader';
import { supabase, Product } from '@/lib/supabase';
import { OrdersUtils } from '@/lib/orders-utils';
import { 
  translateCatalogTerm, 
  translateInterfaceLabel,
  MANUFACTURERS,
  APPEARANCES_EN,
  APPEARANCES_FR,
  BOXED_OPTIONS_EN,
  BOXED_OPTIONS_FR,
  frenchToEnglishValue
} from '@/lib/catalog-translations';
import MobileQuantityInput from '@/components/MobileQuantityInput';
import CatalogUpdateButton from '@/components/CatalogUpdateButton';
import { Download, Filter, Search, ChevronDown, ChevronUp, ShoppingCart, X, Plus, Minus, Zap, TrendingUp, ChevronLeft, ChevronRight, Check, AlertCircle, Package, Clock, Loader2, RefreshCw, ArrowUpDown, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import BackToTopButton from '@/components/BackToTopButton';

// Valeurs de filtres basées sur l'analyse du vrai catalogue
const ADDITIONAL_INFO_OPTIONS = ['AS-IS', 'Brand New Battery', 'Chip/Crack', 'Discoloration', 'Engraving', 'Engraving Removed', 'Heavy cosmetic wear', 'Other', 'Premium Refurbished', 'Reduced Battery Performance'];

// Type pour les options de tri
type SortField = 'sku' | 'product_name' | 'price_dbc' | 'quantity';
type SortDirection = 'asc' | 'desc';

function ClientCatalogPage() {
  const router = useRouter();
  const { user, isAdmin, isClient, signOut } = useAuth();
  
  // États des filtres avec valeurs par défaut
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedManufacturers, setSelectedManufacturers] = useState<string[]>(['Apple']); // Apple par défaut
  const [selectedAppearances, setSelectedAppearances] = useState<string[]>(['Grade C', 'Grade BC']); // Grade C et BC par défaut (valeurs françaises)
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
  const [importInfo, setImportInfo] = useState<{ importDate: string; totalNewProducts: number; newSkus: string[]; restockedSkus: string[]; missingSkus: string[]; totalMissingProducts: number } | null>(null);
  
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
  const [isClientSide, setIsClientSide] = useState(false);
  
  // État pour les vrais produits depuis Supabase
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalProductsCount, setTotalProductsCount] = useState<number | null>(null);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [newProductsSKUs, setNewProductsSKUs] = useState<string[]>([]);
  const [lastImportDate, setLastImportDate] = useState<Date | null>(null);
  const [totalNewProducts, setTotalNewProducts] = useState<number>(0);

  // États de dropdowns avec timer pour fermeture
  const [dropdownOpen, setDropdownOpen] = useState<{[key: string]: boolean}>({
    manufacturer: false,
    appearance: false,
    boxed: false,
    additionalInfo: false,
    color: false
  });
  const [closeTimeout, setCloseTimeout] = useState<NodeJS.Timeout | null>(null);

  // État pour gérer l'affichage des filtres sur mobile
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // États pour les suggestions de recherche
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounce pour la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // Attendre 300ms après la dernière frappe

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Charger les informations d'import au chargement
  useEffect(() => {
    const loadImportInfo = async () => {
      try {
        const response = await fetch('/api/catalog/import-info');
        if (response.ok) {
          const result = await response.json();
          if (result.data) {
            setImportInfo(result.data);
          }
        }
      } catch (error) {
        console.error('Erreur chargement import info:', error);
      }
    };

    if (products.length > 0) {
      loadImportInfo();
    }
  }, [products.length]);

  // Fonction temporaire pour estimer les nouveaux produits
  const estimateNewProducts = () => {
    if (!products.length) return 0;
    const activeProducts = products.filter(p => p.quantity > 0).length;
    return Math.min(Math.floor(activeProducts * 0.05), 50);
  };

  // Fonction pour vérifier si un produit est "nouveau"
  const isNewProduct = (product: Product) => {
    if (importInfo && importInfo.newSkus && importInfo.restockedSkus) {
      return importInfo.newSkus.includes(product.sku) || importInfo.restockedSkus.includes(product.sku);
    } else {
      // Heuristique temporaire plus restrictive
      if (product.quantity === 0) return false;
      
      // Considérer comme "nouveaux" les produits avec stock > 50
      // ou qui ont certaines caractéristiques récentes
      const hasHighStock = product.quantity > 50;
      const hasRecentFeatures = product.additional_info && 
        (product.additional_info.includes('2024') || 
         product.additional_info.includes('new') ||
         product.additional_info.includes('récent'));
      
      return hasHighStock || hasRecentFeatures || false;
    }
  };

  const getDisplayAppearance = (appearance: string, functionality: string) => {
    if (functionality === 'Minor Fault') {
      // Ajouter 'x' minuscule après le grade pour les Minor Fault
      // Grade C → Grade Cx, Grade BC → Grade BCx, Grade C+ → Grade Cx+
      const gradeMatch = appearance.match(/^(Grade [A-Z]+)(\+?)/i);
      if (gradeMatch) {
        const grade = gradeMatch[1]; // "Grade C"
        const plus = gradeMatch[2] || ''; // "+" ou ""
        const rest = appearance.substring(grade.length + plus.length).trim();
        return rest ? `${grade}x${plus} ${rest}` : `${grade}x${plus}`;
      }
    }
    // Pour Working ou si pas de grade détecté, retourner tel quel
    return appearance;
  };

  // Calculer le nombre total de nouveaux produits (nouveaux SKU + passés de 0 à en stock)
  const calculateNewProducts = async () => {
    try {
      // Récupérer les données depuis l'API route
      const response = await fetch('/api/catalog/import-info');
      const result = await response.json();
      
      if (!response.ok) {
        console.error('Erreur récupération import (client):', result.error);
        setTotalNewProducts(0);
        setNewProductsSKUs([]);
        setLastImportDate(null);
        return;
      }

      if (!result.data) {
        // Aucun import trouvé
        setTotalNewProducts(0);
        setNewProductsSKUs([]);
        setLastImportDate(null);
        return;
      }

      // Combiner les nouveaux SKU et les restockés
      const allNewSKUs = [...(result.data.newSkus || []), ...(result.data.restockedSkus || [])];
      
      setNewProductsSKUs(allNewSKUs);
      setTotalNewProducts(result.data.totalNewProducts);
      setLastImportDate(result.data.importDate ? new Date(result.data.importDate) : null);
      
      // Stocker toutes les informations d'import dans importInfo
      setImportInfo({
        importDate: result.data.importDate,
        totalNewProducts: result.data.totalNewProducts,
        newSkus: result.data.newSkus || [],
        restockedSkus: result.data.restockedSkus || [],
        missingSkus: result.data.missingSkus || [],
        totalMissingProducts: result.data.totalMissingProducts || 0
      });
      
      console.log('📊 Informations d\'import récupérées depuis l\'API (client):', {
        newSKUs: result.data.newSkus?.length || 0,
        restockedSKUs: result.data.restockedSkus?.length || 0,
        missingSKUs: result.data.missingSkus?.length || 0,
        totalNew: result.data.totalNewProducts,
        totalMissing: result.data.totalMissingProducts,
        date: result.data.importDate
      });
      
    } catch (error) {
      console.error('Erreur calcul nouveaux produits:', error);
      setTotalNewProducts(0);
      setNewProductsSKUs([]);
      setLastImportDate(null);
    }
  };

  // Charger les données des nouveaux produits au montage
  useEffect(() => {
    calculateNewProducts();
  }, []);

  // Recalculer quand les produits changent (après un import)
  useEffect(() => {
    if (products.length > 0) {
      calculateNewProducts();
    }
  }, [products]);

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
    setIsClientSide(true);
    
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
    // Sauvegarder immédiatement dans localStorage (synchrone et rapide)
    try {
      localStorage.setItem('draftOrders', JSON.stringify(orders));
    } catch (error) {
      console.warn('⚠️ Erreur sauvegarde localStorage:', error);
    }
    
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
    }, 800); // Debounce plus long pour éviter les appels trop fréquents
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

  // Fonction pour raccourcir les noms de produits Apple
  const shortenProductName = (productName: string): string => {
    // Enlever "Apple " du début du nom pour économiser de l'espace
    if (productName.toLowerCase().startsWith('apple ')) {
      return productName.substring(6); // Enlever "Apple "
    }
    return productName;
  };

  // Filtrage et tri des produits
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products.filter(product => {
      // Filtre nouveaux produits
      if (showNewProductsOnly && !isNewProduct(product)) return false;
      
      // Filtre de recherche
      const matchesSearch = !debouncedSearchTerm || 
        product.product_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        product.item_group.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (product.color && product.color.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (product.additional_info && product.additional_info.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
      
      // Filtres existants restaurés
      const matchesManufacturer = selectedManufacturers.length === 0 || 
        productContainsManufacturer(product.product_name, selectedManufacturers);
      
      const matchesAppearance = selectedAppearances.length === 0 || 
        selectedAppearances.some(selectedApp => {
          // Convertir la valeur française sélectionnée vers l'anglais pour comparer avec la DB
          const englishValue = frenchToEnglishValue(selectedApp, 'appearance');
          return product.appearance === englishValue || product.appearance === selectedApp;
        });
      
      const matchesColor = selectedColors.length === 0 || 
        selectedColors.includes(product.color);
      
      const matchesBoxed = selectedBoxedOptions.length === 0 || 
        selectedBoxedOptions.some(selectedBoxed => {
          // Convertir la valeur française sélectionnée vers l'anglais pour comparer avec la DB
          const englishValue = frenchToEnglishValue(selectedBoxed, 'boxed');
          return product.boxed === englishValue || product.boxed === selectedBoxed;
        });
      
      const matchesAdditionalInfo = selectedAdditionalInfo.length === 0 || 
        (product.additional_info && selectedAdditionalInfo.includes(product.additional_info));
      
      const matchesPriceMin = !priceMin || product.price_dbc >= parseFloat(priceMin);
      const matchesPriceMax = !priceMax || product.price_dbc <= parseFloat(priceMax);
      const matchesQuantityMin = !quantityMin || product.quantity >= parseInt(quantityMin);
      const matchesQuantityMax = !quantityMax || product.quantity <= parseInt(quantityMax);
      
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
        
        const standardCapacities = getStandardCapacities;
        const standardCapacity = standardCapacities[parsed.baseModel];
        return standardCapacity && parsed.capacity === standardCapacity;
      })();
      
      // Gestion de la rupture de stock : afficher les produits avec quantité 0
      const matchesStock = includeZeroStock 
        ? product.quantity === 0  // Afficher tous les produits avec quantité 0
        : product.quantity > 0;   // Afficher seulement les produits avec stock > 0
      
      return matchesSearch && matchesManufacturer && matchesAppearance && 
             matchesColor && matchesBoxed &&
             matchesAdditionalInfo && matchesPriceMin && matchesPriceMax && 
             matchesQuantityMin && matchesQuantityMax && 
             matchesStandardCapacity && matchesStock;
    });

    // Tri avec groupement par product_name puis Minor Fault > Working par produit
    filtered.sort((a, b) => {
      // TRI PRIMAIRE : Par nom de produit
      const productNameComparison = a.product_name.localeCompare(b.product_name);
      if (productNameComparison !== 0) {
        return productNameComparison; // Grouper par product_name d'abord
      }

      // TRI SECONDAIRE : Pour le même produit, Minor Fault avant Working
      if (a.functionality === 'Minor Fault' && b.functionality === 'Working') {
        return -1; // Minor Fault avant Working pour le même produit
      } else if (a.functionality === 'Working' && b.functionality === 'Minor Fault') {
        return 1; // Working après Minor Fault pour le même produit
      }

      // TRI TERTIAIRE : Si même produit et même functionality, selon le champ sélectionné
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
  }, [
    products, 
    includeZeroStock, 
    showNewProductsOnly, 
    importInfo,
    debouncedSearchTerm,
    selectedManufacturers,
    selectedAppearances,
    selectedColors,
    selectedBoxedOptions,
    selectedAdditionalInfo,
    priceMin,
    priceMax,
    quantityMin,
    quantityMax,
    showStandardCapacityOnly,
    sortField,
    sortDirection,
    getStandardCapacities
  ]);

  // Calculer les statistiques des produits en rupture de stock (quantité 0)
  const filteredOutOfStockProducts = useMemo(() => {
    return products.filter(product => {
      // Appliquer tous les filtres sauf le filtre de stock
      const matchesSearch = !debouncedSearchTerm || 
        product.product_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      const matchesManufacturer = selectedManufacturers.length === 0 || 
        productContainsManufacturer(product.product_name, selectedManufacturers);
      
      const matchesAppearance = selectedAppearances.length === 0 || 
        selectedAppearances.some(selectedApp => {
          // Convertir la valeur française sélectionnée vers l'anglais pour comparer avec la DB
          const englishValue = frenchToEnglishValue(selectedApp, 'appearance');
          return product.appearance === englishValue || product.appearance === selectedApp;
        });
      
      const matchesColor = selectedColors.length === 0 || 
        selectedColors.includes(product.color);
      
      const matchesBoxed = selectedBoxedOptions.length === 0 || 
        selectedBoxedOptions.some(selectedBoxed => {
          // Convertir la valeur française sélectionnée vers l'anglais pour comparer avec la DB
          const englishValue = frenchToEnglishValue(selectedBoxed, 'boxed');
          return product.boxed === englishValue || product.boxed === selectedBoxed;
        });
      
      const matchesAdditionalInfo = selectedAdditionalInfo.length === 0 || 
        (product.additional_info && selectedAdditionalInfo.includes(product.additional_info));
      
      const matchesPriceMin = !priceMin || product.price_dbc >= parseFloat(priceMin);
      const matchesPriceMax = !priceMax || product.price_dbc <= parseFloat(priceMax);
      
      // Vérifier si ce produit est en rupture de stock (quantité 0)
      const isOutOfStock = product.quantity === 0;
      const matchesQuantityMax = !quantityMax || product.quantity <= parseInt(quantityMax);
      
      return isOutOfStock && matchesSearch && matchesManufacturer && matchesAppearance && 
             matchesColor && matchesBoxed &&
             matchesAdditionalInfo && matchesPriceMin && matchesPriceMax && matchesQuantityMax;
    });
  }, [debouncedSearchTerm, selectedManufacturers, selectedAppearances, 
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
    // Augmenter le délai à 1000ms pour laisser le temps de faire les sélections
    const timeout = setTimeout(() => {
      setDropdownOpen(prev => ({
        ...prev,
        [key]: false
      }));
    }, 1000); // 1 seconde au lieu de 200ms
    setCloseTimeout(timeout);
  };

  // Annuler la fermeture automatique quand on interagit avec le dropdown
  const handleDropdownInteraction = () => {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      setCloseTimeout(null);
    }
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
          color: false
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
    // Si pas de commande active, sauvegarder le produit et ouvrir la popup
    if (!currentDraftOrder || !draftOrders[currentDraftOrder]) {
      console.log('Pas de commande active - ouverture popup création');
      
      // Sauvegarder le produit en attente
      sessionStorage.setItem('pendingProduct', JSON.stringify({ sku, quantity, replace }));
      
      // Ouvrir la popup de création de commande
      setShowOrderNamePopup(true);
      return;
    }
    
    // Sauvegarder la position de scroll actuelle
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    
    // Empêcher le body de bouger pendant la mise à jour
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollPosition}px`;
    document.body.style.width = '100%';
    
    try {
      const currentQuantity = typeof quantities[sku] === 'number' 
        ? quantities[sku] as number
        : parseInt(quantities[sku] as string) || 0;
      
      const newQuantity = replace ? quantity : currentQuantity + quantity;
      
      // Vérifier le stock disponible
      const product = filteredAndSortedProducts.find((p: Product) => p.sku === sku);
      if (!product) return;
      
      if (newQuantity > product.quantity) {
        alert(`Stock insuffisant. Stock disponible: ${product.quantity}`);
        return;
      }
      
      // Mettre à jour l'état local immédiatement
      const newQuantities = { ...quantities, [sku]: newQuantity };
      setQuantities(newQuantities);
      
      // Mettre à jour dans draftOrders
      const newDraftOrders = {
        ...draftOrders,
        [currentDraftOrder]: {
          ...draftOrders[currentDraftOrder],
          items: { ...draftOrders[currentDraftOrder].items, [sku]: newQuantity }
        }
      };
      
      setDraftOrders(newDraftOrders);
      
      // Sauvegarder de manière asynchrone
      await saveDraftOrdersToLocalStorage(newDraftOrders);
    } finally {
      // Restaurer la position de scroll
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollPosition);
    }
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
          userId: user?.id // Utiliser l'ID du client connecté
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
      
      // Sauvegarder dans localStorage avec l'UUID Supabase
      saveDraftOrdersToLocalStorage(newDraftOrders);
      saveCurrentOrderToLocalStorage(supabaseOrder.id);

      // Marquer les commandes comme obsolètes pour forcer le rechargement
      OrdersUtils.markOrdersAsStale();

      // Traiter le produit en attente
      if (pendingProduct) {
        const { sku, quantity, replace } = JSON.parse(pendingProduct);
        
        if (replace) {
          setQuantities(prev => ({ ...prev, [sku]: quantity }));
        } else {
          setQuantities(prev => ({ ...prev, [sku]: (prev[sku] || 0) + quantity }));
        }
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
        const { sku, quantity, replace } = JSON.parse(pendingProduct);
        
        newDraftOrders[orderId].items = { [sku]: quantity };
        setDraftOrders(newDraftOrders);
        
        if (replace) {
          setQuantities(prev => ({ ...prev, [sku]: quantity }));
        } else {
          setQuantities(prev => ({ ...prev, [sku]: (prev[sku] || 0) + quantity }));
        }
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
    
    // Gérer la logique de filtrage
    if (!showStandardCapacityOnly) {
      // S'assurer qu'on a Apple ou Samsung sélectionné pour les capacités standard
      if (!selectedManufacturers.includes('Apple') && !selectedManufacturers.includes('Samsung')) {
        setSelectedManufacturers(['Apple', 'Samsung']);
      }
    }
  };

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

  // Fonction pour obtenir la classe CSS de la couleur avec les vraies couleurs Apple
  const getColorClass = (color: string | null) => {
    if (!color) return 'bg-gray-100';
    
    const colorLower = color.toLowerCase();
    
    switch (colorLower) {
      case 'black':
      case 'space black':
      case 'titane noir':
      case 'titan black':
        return 'bg-zinc-800'; // Apple Space Gray authentique
      case 'space gray':
      case 'gris sidéral':
        return 'bg-zinc-600'; // Apple Space Gray authentique
      case 'white':
      case 'titane blanc':
      case 'titan white':
        return 'bg-gray-50 border-gray-200'; // Apple White authentique
      case 'red':
      case 'product red':
        return 'bg-red-600'; // Apple Product Red authentique
      case 'blue':
      case 'pacific blue':
      case 'sierra blue':
        return 'bg-blue-600'; // Apple Blue authentique
      case 'bleu intense':
        return 'bg-blue-700'; // Bleu intense
      case 'alpine blue':
      case 'bleu alpine':
        return 'bg-sky-500'; // Bleu Alpine
      case 'titane bleu':
      case 'titan blue':
        return 'bg-blue-800'; // Titane Bleu
      case 'green':
      case 'alpine green':
      case 'vert alpine':
        return 'bg-emerald-700'; // Apple Green authentique
      case 'midnight green':
      case 'vert nuit':
        return 'bg-emerald-900'; // Apple Green nuit
      case 'yellow':
      case 'jaune':
        return 'bg-amber-400'; // Apple Yellow authentique
      case 'purple':
        return 'bg-purple-600'; // Apple Purple authentique
      case 'deep purple':
      case 'violet intense':
        return 'bg-purple-700'; // Violet intense
      case 'mauve':
        return 'bg-purple-300'; // Mauve
      case 'pink':
      case 'rose':
        return 'bg-rose-400'; // Apple Pink authentique
      case 'rose gold':
      case 'or rose':
        return 'bg-rose-300'; // Apple Rose Gold authentique
      case 'orange':
        return 'bg-orange-500';
      case 'gray':
      case 'grey':
      case 'gris':
        return 'bg-gray-500';
      case 'silver':
      case 'argent':
        return 'bg-gray-200'; // Apple Silver authentique
      case 'gold':
      case 'or':
        return 'bg-amber-300'; // Apple Gold authentique
      case 'coral':
      case 'corail':
        return 'bg-orange-400'; // Coral
      case 'midnight':
      case 'minuit':
        return 'bg-slate-900'; // Apple Midnight authentique
      case 'graphite':
        return 'bg-zinc-700'; // Apple Graphite authentique
      case 'starlight':
      case 'lumière stellaire':
        return 'bg-yellow-50 border-amber-200'; // Starlight
      case 'teal':
      case 'sarcelle':
        return 'bg-teal-500'; // Sarcelle
      case 'ultramarine':
      case 'outremer':
        return 'bg-indigo-600'; // Outremer
      case 'titane sable':
      case 'titan sand':
        return 'bg-amber-100 border-amber-300'; // Titane sable
      case 'titane naturel':
      case 'titan natural':
        return 'bg-stone-200 border-stone-300'; // Titane naturel
      default:
        return 'bg-gray-200';
    }
  };

  // Fonction pour obtenir le nom de la couleur en français
  const getColorName = (color: string | null) => {
    if (!color) return '';
    
    const colorLower = color.toLowerCase();
    
    switch (colorLower) {
      case 'black':
        return 'Noir';
      case 'space black':
        return 'Noir sidéral';
      case 'space gray':
        return 'Gris sidéral';
      case 'white':
        return 'Blanc';
      case 'red':
        return 'Rouge';
      case 'product red':
        return 'Rouge';
      case 'blue':
        return 'Bleu';
      case 'pacific blue':
        return 'Bleu Pacifique';
      case 'sierra blue':
        return 'Bleu Sierra';
      case 'bleu intense':
        return 'Bleu intense';
      case 'alpine blue':
      case 'bleu alpine':
        return 'Bleu Alpine';
      case 'green':
        return 'Vert';
      case 'alpine green':
      case 'vert alpine':
        return 'Vert alpin';
      case 'midnight green':
      case 'vert nuit':
        return 'Vert nuit';
      case 'yellow':
      case 'jaune':
        return 'Jaune';
      case 'purple':
        return 'Violet';
      case 'deep purple':
      case 'violet intense':
        return 'Violet intense';
      case 'pink':
      case 'rose':
        return 'Rose';
      case 'rose gold':
      case 'or rose':
        return 'Or rose';
      case 'orange':
        return 'Orange';
      case 'gray':
      case 'grey':
      case 'gris':
        return 'Gris';
      case 'silver':
      case 'argent':
        return 'Argent';
      case 'gold':
      case 'or':
        return 'Or';
      case 'coral':
      case 'corail':
        return 'Corail';
      case 'midnight':
      case 'minuit':
        return 'Minuit';
      case 'graphite':
        return 'Graphite';
      case 'starlight':
      case 'lumière stellaire':
        return 'Lumière stellaire';
      case 'mauve':
        return 'Mauve';
      case 'titan blue':
      case 'titane bleu':
        return 'Titane Bleu';
      case 'teal':
      case 'sarcelle':
        return 'Sarcelle';
      case 'ultramarine':
      case 'outremer':
        return 'Outremer';
      case 'titan sand':
      case 'titane sable':
        return 'Titane sable';
      case 'titan white':
      case 'titane blanc':
        return 'Titane blanc';
      case 'titan black':
      case 'titane noir':
        return 'Titane noir';
      case 'titan natural':
      case 'titane naturel':
        return 'Titane naturel';
      default:
        return color; // Retourne la couleur originale si pas de traduction
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

  // Composant ProductCard intégré pour la vue mobile
  const ProductCard = ({ product }: { product: Product }) => {
    const quantityInCart: number = typeof quantities[product.sku] === 'number' 
      ? quantities[product.sku] as number
      : parseInt(quantities[product.sku] as string) || 0;
    const isChecked = selectedProducts[product.sku] || false;
    const isHighlighted = quantityInCart > 0;
    const [isPressed, setIsPressed] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleCardClick = useCallback(async (e: React.MouseEvent | React.TouchEvent) => {
      // Empêcher le traitement si déjà en cours
      if (isProcessing) return;
      
      // Ne pas ajouter si on clique sur des boutons, inputs ou leurs conteneurs
      if (e.target instanceof HTMLElement && 
          (e.target.tagName === 'BUTTON' || 
           e.target.tagName === 'INPUT' || 
           e.target.closest('button') || 
           e.target.closest('input') ||
           e.target.closest('.quantity-controls'))) {
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      // Empêcher les clics multiples
      setIsProcessing(true);
      
      try {
        // Feedback immédiat
        setIsPressed(true);
        
        // Haptic feedback sur iOS si disponible
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }
        
        // Ajouter le produit
        await addToCartWithQuantity(product.sku, 1, false);
      } finally {
        setTimeout(() => {
          setIsPressed(false);
          setIsProcessing(false);
        }, 150);
      }
    }, [product.sku, isProcessing]);

    return (
      <>
        <div 
          className={`
            product-card bg-white rounded-lg border shadow-sm p-2 transition-all duration-100 cursor-pointer touch-manipulation
            ${isPressed ? 'pressed scale-[0.98] shadow-lg bg-gray-50' : ''}
            ${isHighlighted ? 'ring-2 ring-dbc-light-green bg-green-50/30 shadow-md' : 'hover:shadow-md hover:border-dbc-light-green/50'}
            ${isProcessing ? 'opacity-80' : ''}
          `}
          onClick={handleCardClick}
          onTouchStart={(e) => {
            // Optimisation pour le tactile
            e.currentTarget.classList.add('active');
          }}
          onTouchEnd={(e) => {
            e.currentTarget.classList.remove('active');
          }}
          data-in-cart={isHighlighted}
        >
          {/* Header avec checkbox et indicateur */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={async (e) => {
                  e.stopPropagation();
                  const isChecked = e.target.checked;
                  
                  if (isChecked) {
                    await selectFullQuantity(product.sku, product.quantity);
                    setSelectedProducts(prev => ({ ...prev, [product.sku]: true }));
                  } else {
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
                      
                      await saveDraftOrdersToLocalStorage(newDraftOrders);
                    }
                    setSelectedProducts(prev => ({ ...prev, [product.sku]: false }));
                  }
                }}
                className="scale-75 rounded border-gray-300 text-dbc-light-green focus:ring-dbc-light-green touch-manipulation"
                onClick={(e) => e.stopPropagation()}
              />
              <span className="text-xs font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{product.sku}</span>
            </div>
            {isHighlighted && (
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span className="text-xs font-medium text-green-700">Ajouté</span>
              </div>
            )}
          </div>

          {/* Nom du produit */}
          <h3 className="text-sm font-medium text-gray-900 mb-1.5 line-clamp-2 min-h-[2.2rem]">
            {shortenProductName(product.product_name)}
          </h3>

          {/* Tags d'informations */}
          <div className="flex flex-wrap gap-1 mb-2">
            {/* Grade */}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
              product.appearance.includes('A+') ? 'bg-green-100 text-green-800' :
              product.appearance.includes('A') && !product.appearance.includes('AB') ? 'bg-blue-100 text-blue-800' :
              product.appearance.includes('B') ? 'bg-yellow-100 text-yellow-800' :
              'bg-orange-100 text-orange-800'
            }`}>
              {translateCatalogTerm('appearance', getDisplayAppearance(product.appearance, product.functionality))}
            </span>

            {/* Additional Info et Couleur côte à côte */}
            <div className="flex items-center gap-2">
              {/* Additional Info */}
              {product.additional_info && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-medium">
                  {translateCatalogTerm('additional_info', product.additional_info)}
                </span>
              )}

              {/* Couleur - Pastille colorée avec nom */}
              {product.color && product.color.trim() !== '' && (
                <div className="flex items-center gap-1.5 bg-gray-100 px-1.5 py-0.5 rounded-full">
                  <div className={`w-3 h-3 rounded-full border ${getColorClass(product.color)}`}></div>
                  <span className="text-xs text-gray-700">{getColorName(product.color)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Prix et contrôles de quantité optimisés B2B */}
          <div className="flex items-center justify-between gap-3">
            {/* Prix avec stock */}
            <div className="flex-1">
              <div className="text-lg font-bold text-gray-900">
                {product.price_dbc.toFixed(2)}€
              </div>
              <div className="text-xs text-gray-500">
                Stock: {product.quantity}
              </div>
            </div>

            {/* Contrôles de quantité ultra-compacts et tactiles */}
            <div className="flex items-center gap-1.5 quantity-controls">
              {/* Bouton décrémenter */}
              {quantityInCart > 0 && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    await decrementQuantity(product.sku);
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="w-10 h-10 flex items-center justify-center bg-red-100 text-red-600 rounded-full hover:bg-red-200 active:scale-95 transition-transform duration-100 touch-manipulation touch-target"
                >
                  <Minus className="h-3 w-3" />
                </button>
              )}
              
              {/* Nouveau composant de quantité optimisé pour mobile */}
              <MobileQuantityInput
                value={quantityInCart}
                onChange={async (value) => {
                  const numValue = parseInt(value) || 0;
                  if (numValue > 0) {
                    await addToCartWithQuantity(product.sku, numValue, true);
                  } else {
                    await updateQuantity(product.sku, value);
                  }
                }}
                max={product.quantity}
                sku={product.sku}
              />
              
              {/* Bouton ajouter principal */}
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  await addToCart(product.sku);
                }}
                onTouchStart={(e) => e.stopPropagation()}
                disabled={quantityInCart >= product.quantity}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-100 touch-manipulation touch-target ${
                  quantityInCart >= product.quantity 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-dbc-bright-green to-emerald-400 text-white hover:from-emerald-400 hover:to-emerald-500 active:scale-95 shadow-md'
                }`}
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  // Fonction pour générer des suggestions de recherche intelligente
  const generateSearchSuggestions = (term: string) => {
    if (!term || term.length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const lowerTerm = term.toLowerCase();
    const suggestions = new Set<string>();
    
    // Rechercher dans les noms de produits
    products.forEach(product => {
      const productName = product.product_name.toLowerCase();
      const sku = product.sku.toLowerCase();
      
      // Correspondance exacte ou partielle
      if (productName.includes(lowerTerm) || sku.includes(lowerTerm)) {
        // Extraire le modèle principal (ex: "iPhone 12", "Galaxy S21")
        const matches = product.product_name.match(/^([A-Za-z\s]+\d+[A-Za-z]*)/);
        if (matches) {
          suggestions.add(matches[1].trim());
        }
        
        // Ajouter aussi le nom complet s'il est différent
        if (product.product_name.length < 50) {
          suggestions.add(product.product_name);
        }
      }
    });
    
    // Suggestions pour des termes populaires
    const popularTerms = [
      'iPhone 12', 'iPhone 13', 'iPhone 14', 'iPhone 15',
      'Galaxy S21', 'Galaxy S22', 'Galaxy S23', 'Galaxy S24',
      'Pixel 6', 'Pixel 7', 'Pixel 8',
      'Xiaomi 12', 'Xiaomi 13', 'OnePlus'
    ];
    
    popularTerms.forEach(term => {
      if (term.toLowerCase().includes(lowerTerm)) {
        suggestions.add(term);
      }
    });

    setSearchSuggestions(Array.from(suggestions).slice(0, 8));
    setShowSuggestions(true);
  };

  // Gérer la recherche avec suggestions
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    generateSearchSuggestions(value);
  };

  const selectSuggestion = (suggestion: string) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
    setSearchSuggestions([]);
  };

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
        onCartClick={() => router.push('/orders?refresh=' + Date.now())}
        onLogoClick={() => router.push('/')}
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
      <div className="max-w-[2000px] mx-auto px-4 py-6 catalog-container">
        {/* Barre d'outils principale - Design épuré et élégant */}
        <div className="bg-gradient-to-r from-slate-50 via-blue-50 to-slate-50 rounded-2xl p-6 mb-8 shadow-sm border border-gray-100">
          {/* Ligne 1: Recherche centrée */}
          <div className="mb-8">
            <div className="relative max-w-3xl mx-auto">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Rechercher par nom, SKU, modèle... (ex: iPhone 15 Pro Max)"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="block w-full pl-12 pr-6 py-4 text-base border border-gray-200 rounded-2xl bg-white bg-opacity-80 backdrop-blur-sm focus:ring-2 focus:ring-dbc-light-green focus:border-transparent placeholder-gray-500 shadow-sm transition-all duration-200"
              />
              
              {/* Suggestions de recherche */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute z-30 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg">
                  <div className="py-2">
                    <div className="px-4 py-2 text-xs text-gray-500 font-medium border-b">Suggestions :</div>
                    {searchSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => selectSuggestion(suggestion)}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                      >
                        <Search className="h-4 w-4 text-gray-400" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ligne 2: Actions principales - Centré et espacé */}
          <div className="flex flex-wrap items-center justify-center gap-6 mb-8">
            {/* Groupe Filtres + Reset */}
            <div className="flex items-center gap-3 bg-white bg-opacity-60 backdrop-blur-sm rounded-2xl p-3 shadow-sm border border-white border-opacity-40">
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="lg:hidden px-5 py-3 bg-white bg-opacity-90 backdrop-blur-sm border border-gray-200 rounded-xl hover:bg-opacity-100 hover:shadow-md text-sm text-gray-700 transition-all duration-200 flex items-center gap-2.5"
              >
                <Filter className="h-4 w-4" />
                <span>Filtres</span>
                {showMobileFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              
              <button
                onClick={resetFilters}
                className="px-5 py-3 bg-white bg-opacity-90 backdrop-blur-sm border border-gray-200 rounded-xl hover:bg-opacity-100 hover:shadow-md text-sm text-gray-700 transition-all duration-200 flex items-center gap-2.5"
              >
                <span>🔄</span>
                <span>Reset filtres</span>
              </button>
            </div>

            {/* Groupe Export seul côté client */}
            <div className="flex items-center gap-3 bg-white bg-opacity-60 backdrop-blur-sm rounded-2xl p-3 shadow-sm border border-white border-opacity-40">
              <div className="relative dropdown-container">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleDropdown('export');
                  }}
                  className="px-5 py-3 bg-white bg-opacity-90 backdrop-blur-sm border border-gray-200 rounded-xl hover:bg-opacity-100 hover:shadow-md text-sm text-gray-700 transition-all duration-200 flex items-center gap-2.5"
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                
                {dropdownOpen.export && (
                  <div 
                    className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50"
                    onMouseEnter={handleDropdownInteraction}
                    onClick={handleDropdownInteraction}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportCatalog('xlsx');
                        setDropdownOpen(prev => ({ ...prev, export: false }));
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-t-xl flex items-center gap-3 transition-colors"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-green-600" />
                      <span>Format Excel (.xlsx)</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportCatalog('csv');
                        setDropdownOpen(prev => ({ ...prev, export: false }));
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-b-xl flex items-center gap-3 transition-colors"
                    >
                      <span className="text-blue-600">📄</span>
                      <span>Format CSV UTF-8</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ligne 3: Filtres spécialisés - Version compacte */}
          <div className="flex flex-wrap items-center justify-center gap-3 max-w-4xl mx-auto">
            {/* Stockage de base */}
            <button
              onClick={toggleStandardCapacityFilter}
              className={`px-4 py-2 rounded-xl border-2 transition-all duration-300 text-xs font-medium flex items-center gap-2 hover:scale-105 ${
                showStandardCapacityOnly 
                  ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 shadow-md' 
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
              }`}
            >
              💾 {showStandardCapacityOnly && <span className="text-purple-600">✓</span>}
              <span className="font-semibold">Stockage de base</span>
            </button>

            {/* Rupture de stock */}
            <button
              onClick={toggleZeroStockProducts}
              className={`px-4 py-2 rounded-xl border-2 transition-all duration-300 text-xs font-medium flex items-center gap-2 hover:scale-105 ${
                includeZeroStock 
                  ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 shadow-md' 
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
              }`}
            >
              📦 {includeZeroStock && <span className="text-red-600">✓</span>}
              <span className="font-semibold">Rupture de stock</span>
            </button>

            {/* Nouveaux produits - Compact mais lisible */}
            <button
              onClick={toggleNewProductsFilter}
              className={`px-3 py-2 rounded-xl border-2 transition-all duration-300 text-xs font-medium flex items-center gap-2 hover:scale-105 ${
                showNewProductsOnly 
                  ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 shadow-md' 
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
              }`}
              title={importInfo ? 
                `Dernière mise à jour: ${new Date(importInfo.importDate).toLocaleString('fr-FR')}` : 
                'Information d\'import en cours de chargement'
              }
            >
              <div className="flex items-center gap-1.5">
                ✨ {showNewProductsOnly && <span className="text-yellow-600">✓</span>}
                <div className="text-left">
                  <div className="font-semibold whitespace-nowrap">
                    Nouveaux {importInfo ? importInfo.totalNewProducts : '...'}
                  </div>
                  {importInfo && (
                    <div className="text-[10px] opacity-75 leading-tight">
                      {new Date(importInfo.importDate).toLocaleDateString('fr-FR')} {new Date(importInfo.importDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>
            </button>
          </div>

          {/* Filtres avancés avec dropdowns cliquables - cachés sur mobile par défaut */}
          <div className={`${showMobileFilters ? 'block' : 'hidden'} lg:block mt-8 bg-white bg-opacity-70 backdrop-blur-sm rounded-2xl p-6 border border-white border-opacity-40`}>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              
              {/* Fabricant */}
              <div 
                className="relative dropdown-container"
                onMouseEnter={() => handleMouseEnterDropdown('manufacturer')}
                onMouseLeave={() => handleMouseLeaveDropdown('manufacturer')}
              >
                <label className="block text-sm font-medium text-gray-900 mb-2">{translateInterfaceLabel('Manufacturer')}</label>
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
                    <div 
                      className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg"
                      onMouseEnter={handleDropdownInteraction}
                      onClick={handleDropdownInteraction}
                    >
                      <div className="max-h-60 overflow-y-auto">
                        {MANUFACTURERS.map(manufacturer => (
                          <label key={manufacturer} className={`flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer ${
                            selectedManufacturers.includes(manufacturer) 
                              ? 'bg-blue-50 text-blue-900 font-medium' 
                              : 'text-gray-900'
                          }`}>
                            <input
                              type="checkbox"
                              checked={selectedManufacturers.includes(manufacturer)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleFilter(manufacturer, selectedManufacturers, setSelectedManufacturers);
                                handleDropdownInteraction();
                              }}
                              className="mr-2 text-dbc-light-green focus:ring-dbc-light-green"
                            />
                            <span className="text-sm">{manufacturer}</span>
                            {selectedManufacturers.includes(manufacturer) && (
                              <Check className="h-3 w-3 text-blue-600 ml-auto" />
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Apparence */}
              <div 
                className="relative dropdown-container"
                onMouseEnter={() => handleMouseEnterDropdown('appearance')}
                onMouseLeave={() => handleMouseLeaveDropdown('appearance')}
              >
                <label className="block text-sm font-medium text-gray-900 mb-2">{translateInterfaceLabel('Appearance')}</label>
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
                    <div 
                      className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg"
                      onMouseEnter={handleDropdownInteraction}
                      onClick={handleDropdownInteraction}
                    >
                      <div className="max-h-60 overflow-y-auto">
                        <div className="sticky top-0 bg-gray-50 px-3 py-1 text-xs text-gray-600 border-b">
                          💡 Cochez plusieurs options
                        </div>
                        {APPEARANCES_FR.map((appearance, index) => (
                          <label key={appearance} className={`flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer ${
                            selectedAppearances.includes(appearance) 
                              ? 'bg-blue-50 text-blue-900 font-medium' 
                              : 'text-gray-900'
                          }`}>
                            <input
                              type="checkbox"
                              checked={selectedAppearances.includes(appearance)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleFilter(appearance, selectedAppearances, setSelectedAppearances);
                                handleDropdownInteraction();
                              }}
                              className="mr-2 text-dbc-light-green focus:ring-dbc-light-green"
                            />
                            <span className="text-sm">{appearance}</span>
                            {selectedAppearances.includes(appearance) && (
                              <Check className="h-3 w-3 text-blue-600 ml-auto" />
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Boîte */}
              <div 
                className="relative dropdown-container"
                onMouseEnter={() => handleMouseEnterDropdown('boxed')}
                onMouseLeave={() => handleMouseLeaveDropdown('boxed')}
              >
                <label className="block text-sm font-medium text-gray-900 mb-2">{translateInterfaceLabel('Boxed')}</label>
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
                    <div 
                      className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg"
                      onMouseEnter={handleDropdownInteraction}
                      onClick={handleDropdownInteraction}
                    >
                      {BOXED_OPTIONS_FR.map((boxed, index) => (
                        <label key={boxed} className={`flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer ${
                          selectedBoxedOptions.includes(boxed) 
                            ? 'bg-blue-50 text-blue-900 font-medium' 
                            : 'text-gray-900'
                        }`}>
                          <input
                            type="checkbox"
                            checked={selectedBoxedOptions.includes(boxed)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleFilter(boxed, selectedBoxedOptions, setSelectedBoxedOptions);
                              handleDropdownInteraction();
                            }}
                            className="mr-2 text-dbc-light-green focus:ring-dbc-light-green"
                          />
                          <span className="text-sm">{boxed}</span>
                          {selectedBoxedOptions.includes(boxed) && (
                            <Check className="h-3 w-3 text-blue-600 ml-auto" />
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Prix */}
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-gray-900 mb-2">{translateInterfaceLabel('Price')}</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    placeholder={translateInterfaceLabel('From')}
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1 text-gray-900 focus:ring-2 focus:ring-dbc-light-green focus:border-transparent"
                  />
                  <input
                    type="number"
                    placeholder={translateInterfaceLabel('To')}
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1 text-gray-900 focus:ring-2 focus:ring-dbc-light-green focus:border-transparent"
                  />
                </div>
              </div>

              {/* Quantité */}
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-gray-900 mb-2">{translateInterfaceLabel('Quantity')}</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    placeholder={translateInterfaceLabel('From')}
                    value={quantityMin}
                    onChange={(e) => setQuantityMin(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1 text-gray-900 focus:ring-2 focus:ring-dbc-light-green focus:border-transparent"
                  />
                  <input
                    type="number"
                    placeholder={translateInterfaceLabel('To')}
                    value={quantityMax}
                    onChange={(e) => setQuantityMax(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1 text-gray-900 focus:ring-2 focus:ring-dbc-light-green focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vue responsive : Cartes jusqu'à lg, table sur lg+ */}
        {loading && !products.length ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dbc-light-green mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des produits...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <p className="text-red-600">{error}</p>
          </div>
        ) : (
          <>
            {/* Compteur de produits et pagination - Juste avant les produits */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{filteredAndSortedProducts.length.toLocaleString('fr-FR')}</span> produits affichés
                {totalProductsCount && filteredAndSortedProducts.length !== totalProductsCount && (
                  <span className="text-gray-400"> (sur {totalProductsCount.toLocaleString('fr-FR')} total)</span>
                )}
              </div>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 bg-gray-50"
              >
                <option value={50}>50 par page</option>
                <option value={100}>100 par page</option>
                <option value={250}>250 par page</option>
                <option value={500}>500 par page</option>
              </select>
            </div>

            {/* Vue cartes (≤1023px) - Permet de voir toutes les infos importantes */}
            <div className="lg:hidden">
              {/* Grille de cartes responsive */}
              <div className="grid grid-cols-1 gap-2" data-products-container>
                {paginatedProducts.map((product) => (
                  <ProductCard key={product.sku} product={product} />
                ))}
              </div>
            </div>

            {/* Vue table compacte (≥1024px) - Toutes les colonnes importantes visibles */}
            <div className="hidden lg:block bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="px-1 py-1.5 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">SKU</th>
                      <th className="px-1 py-1.5 text-left text-xs font-medium text-gray-500 uppercase min-w-[180px]">Nom du produit</th>
                      <th className="px-1 py-1.5 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap hidden md:table-cell">Apparence</th>
                      <th className="px-1 py-1.5 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap hidden lg:table-cell">Add. Info</th>
                      <th className="px-1 py-1.5 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap hidden lg:table-cell">Couleur</th>
                      <th className="px-1 py-1.5 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap hidden 2xl:table-cell">Emballage</th>
                      <th className="px-1 py-1.5 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Prix</th>
                      <th className="px-1 py-1.5 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Qté/Stock</th>
                      <th className="px-1 py-1.5 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {paginatedProducts.map((product) => {
                      const quantityInCart = currentDraftOrder && draftOrders[currentDraftOrder]?.items?.[product.sku] || 0;
                      const isChecked = quantityInCart === product.quantity && quantityInCart > 0;
                      const isHighlighted = quantityInCart > 0;
                      
                      return (
                        <tr 
                          key={product.sku} 
                          className={`border-b border-gray-100 hover:bg-gray-50 ${isHighlighted ? 'bg-green-50 border-l-2 border-dbc-light-green' : ''}`}
                        >
                          <td className="px-1 py-1 text-xs font-mono text-gray-900 whitespace-nowrap">{product.sku}</td>
                          <td className="px-1 py-1 text-xs text-gray-900">
                            <div className="break-words max-w-[160px]" title={product.product_name}>
                              {shortenProductName(product.product_name)}
                            </div>
                          </td>
                          <td className="px-1 py-1 hidden md:table-cell">
                            <span className={`inline-flex px-1 py-0.5 text-xs font-medium rounded-md ${
                              product.appearance.includes('A+') ? 'bg-green-100 text-green-800' :
                              product.appearance.includes('A') && !product.appearance.includes('AB') ? 'bg-blue-100 text-blue-800' :
                              product.appearance.includes('B') ? 'bg-yellow-100 text-yellow-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {getDisplayAppearance(product.appearance, product.functionality).replace('Grade ', '')}
                            </span>
                          </td>
                          <td className="px-1 py-1 text-xs text-gray-900 hidden lg:table-cell text-center">
                            {product.additional_info ? (
                              <span className="text-xs px-1 py-0.5 bg-gray-100 text-gray-700 rounded border">
                                {product.additional_info}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-1 py-1 hidden lg:table-cell">
                            {product.color ? (
                              <div className="flex items-center gap-1">
                                <div 
                                  className={`w-2 h-2 rounded-full border flex-shrink-0 ${getColorClass(product.color)}`}
                                />
                                <span className="text-xs text-gray-900 truncate max-w-[60px]">{product.color}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-1 py-1 text-xs text-gray-900 hidden 2xl:table-cell text-center">{product.boxed}</td>
                          <td className="px-1 py-1 text-xs text-center font-medium text-gray-900 whitespace-nowrap">
                            <span>{product.price_dbc.toFixed(2)}€</span>
                          </td>
                          <td className="px-1 py-1">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max={product.quantity}
                                placeholder="0"
                                value={quantityInCart || (quantities[product.sku] || '')}
                                onChange={async (e) => {
                                  const newValue = e.target.value;
                                  const numValue = parseInt(newValue);
                                  
                                  if (newValue === '' || (numValue >= 0 && numValue <= product.quantity)) {
                                    await updateQuantity(product.sku, newValue);
                                  }
                                }}
                                className={`w-8 px-1 py-0.5 text-xs border rounded focus:border-dbc-light-green focus:outline-none text-center bg-white font-medium text-gray-900 ${
                                  isHighlighted ? 'border-dbc-light-green bg-green-50' : 'border-gray-300'
                                }`}
                              />
                              <span className="text-xs text-gray-500">/{product.quantity}</span>
                            </div>
                          </td>
                          <td className="px-1 py-1">
                            <div className="flex items-center justify-center gap-0.5">
                              <button
                                onClick={async () => await decrementQuantity(product.sku)}
                                disabled={!quantityInCart || quantityInCart === 0}
                                className={`inline-flex items-center p-0.5 border border-transparent text-xs rounded focus:outline-none ${
                                  !quantityInCart || quantityInCart === 0
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                    : 'bg-red-500 text-white hover:bg-red-600'
                                }`}
                              >
                                <Minus className="h-2 w-2" />
                              </button>
                              
                              <button
                                onClick={async () => await addToCart(product.sku)}
                                disabled={quantityInCart >= product.quantity}
                                className={`inline-flex items-center p-0.5 border border-transparent text-xs rounded focus:outline-none transition-all duration-200 ${
                                  quantityInCart >= product.quantity 
                                    ? 'bg-gray-400 cursor-not-allowed text-white' 
                                    : 'bg-gradient-to-r from-dbc-bright-green to-emerald-400 hover:from-emerald-300 hover:to-emerald-500 text-dbc-dark-green hover:text-white shadow-sm backdrop-blur-sm'
                                }`}
                              >
                                <Plus className="h-2 w-2" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
                
                {/* Numéros de pages */}
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pageNumber = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  if (pageNumber > totalPages) return null;
                  
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`px-3 py-2 text-sm rounded-xl transition-all duration-200 shadow-md ${
                        currentPage === pageNumber
                          ? 'bg-gradient-to-r from-dbc-bright-green to-emerald-400 text-dbc-dark-green font-semibold shadow-lg backdrop-blur-sm'
                          : 'bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 text-gray-700 hover:bg-opacity-90 hover:shadow-lg'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                
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
          </>
        )}

        {/* ... existing code ... */}
      </div>

      {/* Bouton retour en haut */}
      <BackToTopButton />

      {/* Popup création commande */}
      {showOrderNamePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
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
                  // Nettoyage complet lors de l'annulation
                  setShowOrderNamePopup(false);
                  setOrderName('');
                  sessionStorage.removeItem('pendingProduct');
                  // Nettoyer aussi la sélection visuelle temporaire
                  setSelectedProducts({});
                  // Ne pas créer de commande fantôme
                  console.log('🚫 Création de commande annulée - état nettoyé');
                }}
                className="px-4 py-2 bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-xl text-gray-700 hover:text-gray-900 hover:bg-opacity-90 transition-all duration-200 shadow-sm"
              >
                Annuler
              </button>
              <button
                onClick={createNewOrder}
                disabled={creatingOrder}
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

// Export avec protection client
export default withAuth(ClientCatalogPage, 'client');