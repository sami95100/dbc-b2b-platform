'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, withAuth } from '../../../../lib/auth-context';
import AppHeader from '@/components/AppHeader';
import ClientSelector from '@/components/ClientSelector';
import BackToTopButton from '@/components/BackToTopButton';
import { supabase, Product } from '../../../../lib/supabase';
import { OrdersUtils } from '../../../../lib/orders-utils';
import { translateCatalogTerm, translateInterfaceLabel, MANUFACTURERS, APPEARANCES_EN, APPEARANCES_FR, BOXED_OPTIONS_EN, BOXED_OPTIONS_FR, frenchToEnglishValue } from '../../../../lib/catalog-translations';
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
  Package,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Modal de résumé d'import - VERSION COMPLÈTE
const ImportSummaryModal = ({ isOpen, onClose, summary }: { 
  isOpen: boolean; 
  onClose: () => void; 
  summary: any; 
}) => {
  if (!isOpen) return null;

  const reallyNewSkus = summary?.all_new_skus ? 
    summary.all_new_skus.filter((sku: string) => {
      const existingNewSkus = JSON.parse(localStorage.getItem('newProductsSKUs') || '[]');
      return !existingNewSkus.includes(sku);
    }) : [];

  const restockedSkus = summary?.restocked_skus || [];
  const missingSkus = summary?.missing_skus || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[95vh] overflow-hidden shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">✅ Import réussi !</h3>
                <p className="text-sm font-medium text-gray-800">Import terminé à {new Date().toLocaleString('fr-FR')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>
        </div>
        
        {/* Contenu principal scrollable */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)]">
          {/* Statistiques principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{summary?.importedProducts || 0}</div>
              <div className="text-sm text-blue-700">Produits traités</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{reallyNewSkus.length}</div>
              <div className="text-sm text-green-700">Nouveaux SKU</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{restockedSkus.length}</div>
              <div className="text-sm text-orange-700">Remis en stock</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{missingSkus.length}</div>
              <div className="text-sm text-red-700">En rupture</div>
            </div>
          </div>

          {/* Détails techniques */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Statistiques détaillées */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                📊 Détails de l'import
              </h4>
                             <div className="space-y-2 text-sm">
                 <div className="flex justify-between">
                   <span className="text-gray-800">Produits actifs:</span>
                   <span className="font-semibold text-green-700">{summary?.stats?.active_products || 0}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-800">Stock zéro:</span>
                   <span className="font-semibold text-red-700">{summary?.stats?.out_of_stock || 0}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-800">Marginaux (1%):</span>
                   <span className="font-semibold text-purple-700">{summary?.stats?.marginal || 0}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-800">Non marginaux (11%):</span>
                   <span className="font-semibold text-blue-700">{summary?.stats?.non_marginal || 0}</span>
                 </div>
                 <div className="flex justify-between pt-2 border-t">
                   <span className="text-gray-800">Fichier traité:</span>
                   <span className="font-semibold text-gray-800">{summary?.fileName || 'N/A'}</span>
                 </div>
               </div>
            </div>

            {/* Répartition par statut */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                🔄 Changements détectés
              </h4>
                             <div className="space-y-2 text-sm">
                 <div className="flex justify-between">
                   <span className="text-gray-800">✅ SKU correspondants:</span>
                   <span className="font-semibold text-gray-800">{(summary?.importedProducts || 0) - reallyNewSkus.length - restockedSkus.length}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-800">🆕 Nouveaux ajouts:</span>
                   <span className="font-semibold text-green-700">{reallyNewSkus.length}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-800">📦 Remis en stock:</span>
                   <span className="font-semibold text-orange-700">{restockedSkus.length}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-800">❌ Ruptures détectées:</span>
                   <span className="font-semibold text-red-700">{missingSkus.length}</span>
                 </div>
                 <div className="flex justify-between pt-2 border-t">
                   <span className="text-gray-800">📈 Taux de nouveauté:</span>
                   <span className="font-semibold text-gray-800">{summary?.importedProducts ? ((reallyNewSkus.length / summary.importedProducts) * 100).toFixed(1) : 0}%</span>
                 </div>
               </div>
            </div>
          </div>

          {/* Exemples de SKU pour vérification */}
          <div className="space-y-4">
            {reallyNewSkus.length > 0 && (
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                  🆕 Exemples de nouveaux SKU ({reallyNewSkus.length} total)
                </h4>
                                 <div className="text-sm text-green-800 font-mono bg-white rounded p-3 max-h-20 overflow-y-auto border">
                   {reallyNewSkus.slice(0, 10).join(', ')}
                   {reallyNewSkus.length > 10 && `, ... et ${reallyNewSkus.length - 10} autres`}
                 </div>
              </div>
            )}

            {restockedSkus.length > 0 && (
              <div className="bg-orange-50 rounded-lg p-4">
                <h4 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                  📦 Exemples de remises en stock ({restockedSkus.length} total)
                </h4>
                                 <div className="text-sm text-orange-800 font-mono bg-white rounded p-3 max-h-20 overflow-y-auto border">
                   {restockedSkus.slice(0, 10).join(', ')}
                   {restockedSkus.length > 10 && `, ... et ${restockedSkus.length - 10} autres`}
                 </div>
              </div>
            )}

            {missingSkus.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                  ❌ Exemples de ruptures de stock ({missingSkus.length} total)
                </h4>
                                 <div className="text-sm text-red-800 font-mono bg-white rounded p-3 max-h-20 overflow-y-auto border">
                   {missingSkus.slice(0, 10).join(', ')}
                   {missingSkus.length > 10 && `, ... et ${missingSkus.length - 10} autres`}
                 </div>
              </div>
            )}
          </div>

                    {/* Explication de la logique */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
              💡 Explication de la logique
            </h4>
            <div className="text-sm text-blue-800 space-y-1">
              <div><strong>📦 Remis en stock:</strong> SKU qui était à quantité 0 et maintenant &gt; 0</div>
              <div><strong>❌ En rupture:</strong> SKU présent en base avec stock &gt; 0 mais absent du nouveau catalogue</div>
              <div><strong>✅ Correspondances:</strong> SKU existants avec quantités mises à jour</div>
              <div><strong>🆕 Nouveaux:</strong> SKU jamais vus auparavant dans la base</div>
            </div>
          </div>

          {/* Avertissements et recommandations */}
          {(reallyNewSkus.length > summary?.importedProducts * 0.1 || missingSkus.length > summary?.importedProducts * 0.1) && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                ⚠️ Points d'attention
              </h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                {reallyNewSkus.length > summary?.importedProducts * 0.1 && (
                  <li className="font-medium">• Taux élevé de nouveaux SKU ({((reallyNewSkus.length / summary.importedProducts) * 100).toFixed(1)}%) - Vérifiez la cohérence</li>
                )}
                {missingSkus.length > summary?.importedProducts * 0.1 && (
                  <li className="font-medium">• Nombreuses ruptures détectées ({((missingSkus.length / summary.importedProducts) * 100).toFixed(1)}%) - Vérifiez le fichier source</li>
                )}
                <li className="font-medium">• Consultez les exemples de SKU ci-dessus pour vérifier la cohérence des données</li>
              </ul>
            </div>
          )}
        </div>
        
        {/* Footer actions - fixe en bas */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex gap-3">
            <button
              onClick={() => {
                onClose();
                window.location.reload();
              }}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              🔄 Actualiser l'interface
            </button>
            <button
              onClick={() => {
                // Copier les statistiques dans le presse-papiers
                const stats = `Import réussi - ${new Date().toLocaleString('fr-FR')}
Produits traités: ${summary?.importedProducts || 0}
Nouveaux SKU: ${reallyNewSkus.length}
Remis en stock: ${restockedSkus.length}
Ruptures: ${missingSkus.length}
Actifs: ${summary?.stats?.active_products || 0}
Stock zéro: ${summary?.stats?.out_of_stock || 0}`;
                navigator.clipboard.writeText(stats);
                alert('📋 Statistiques copiées dans le presse-papiers !');
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              📋 Copier stats
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};



// Composant pour les outils d'import
const ImportTools = ({ onImportSuccess }: { onImportSuccess?: () => void }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [showSummary, setShowSummary] = useState(false);

  const [importProgress, setImportProgress] = useState({ 
    step: '', 
    current: 0, 
    total: 0, 
    message: '' 
  });



  const handleCatalogImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      setIsProcessing(true);
      setImportProgress({ step: 'upload', current: 0, total: 100, message: 'Envoi du fichier...' });
      
      const formData = new FormData();
      formData.append('catalog', file);
      
      try {
        console.log('📂 Import catalogue en cours...');
        
        // Simuler la progression étape par étape
        setImportProgress({ step: 'reading', current: 10, total: 100, message: 'Lecture du fichier Excel...' });
        
        await new Promise(resolve => setTimeout(resolve, 500)); // Pause courte pour l'UI
        
        setImportProgress({ step: 'validating', current: 30, total: 100, message: 'Validation des données...' });
        
        const response = await fetch('/api/catalog/update-ts', {
          method: 'POST',
          body: formData,
        });
        
        setImportProgress({ step: 'processing', current: 70, total: 100, message: 'Traitement en cours...' });
        
        const result = await response.json();
        console.log('📊 Résultat import:', result);
        
        setImportProgress({ step: 'finalizing', current: 90, total: 100, message: 'Finalisation...' });
        
        if (result.success) {
          console.log('✅ Import réussi:', result);
          
          setImportProgress({ step: 'complete', current: 100, total: 100, message: 'Import terminé !' });
          
          // Appeler le callback pour rafraîchir les données
          if (onImportSuccess) {
            onImportSuccess();
          }
          
          setTimeout(() => {
            setSummaryData(result.summary);
            setShowSummary(true);
          }, 500);
          
        } else {
          console.error('Détails erreur:', result);
          setImportProgress({ step: 'error', current: 0, total: 100, message: 'Erreur d\'import' });
          alert(`❌ Import échoué: ${result.error}`);
        }
      } catch (error) {
        console.error('Erreur import:', error);
        setImportProgress({ step: 'error', current: 0, total: 100, message: 'Erreur réseau' });
        alert('❌ Erreur réseau lors de l\'import.');
      } finally {
        setTimeout(() => {
          setIsProcessing(false);
          setImportProgress({ step: '', current: 0, total: 0, message: '' });
        }, 1000);
      }
    };
    input.click();
  };





  return (
    <>
        {/* Bouton principal d'import */}
        <button
          onClick={handleCatalogImport}
          disabled={isProcessing}
          className="px-5 py-3 bg-white bg-opacity-90 backdrop-blur-sm border border-gray-200 rounded-xl hover:bg-opacity-100 hover:shadow-md text-sm text-gray-700 transition-all duration-200 flex items-center gap-2.5"
        >
          <FileSpreadsheet className="h-4 w-4" />
          {isProcessing ? 'Import en cours...' : 'Importer Catalogue'}
        </button>
        

      
      {/* Barre de progression pendant l'import */}
      {isProcessing && importProgress.step && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="text-center mb-4">
              <div className="text-lg font-semibold text-gray-800 mb-2">
                Import du catalogue en cours
              </div>
              <div className="text-sm text-gray-600">
                {importProgress.message}
              </div>
            </div>
            
            {/* Barre de progression */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div 
                className="bg-blue-500 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
              ></div>
            </div>
            
            <div className="text-center text-sm font-semibold text-gray-800">
              {importProgress.current}% terminé
            </div>
            
            {/* Indicateur de chargement animé */}
            <div className="flex justify-center mt-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          </div>
        </div>
      )}
      
      <ImportSummaryModal 
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
        summary={summaryData}
      />
      

    </>
  );
};

// Valeurs de filtres basées sur l'analyse du vrai catalogue
const ADDITIONAL_INFO_OPTIONS = ['AS-IS', 'Brand New Battery', 'Chip/Crack', 'Discoloration', 'Engraving', 'Engraving Removed', 'Heavy cosmetic wear', 'Other', 'Premium Refurbished', 'Reduced Battery Performance'];

// Type pour les options de tri
type SortField = 'sku' | 'product_name' | 'price_dbc' | 'quantity';
type SortDirection = 'asc' | 'desc';

function AdminCatalogPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  
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
  const [showMinorFaultOnly, setShowMinorFaultOnly] = useState(false);
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
  const [totalNewProducts, setTotalNewProducts] = useState<number>(0);

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

  // État pour gérer l'affichage des filtres sur mobile
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // États pour les suggestions de recherche
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionTimeout, setSuggestionTimeout] = useState<NodeJS.Timeout | null>(null);
  const [suggestionCache, setSuggestionCache] = useState<{[key: string]: string[]}>({});

  // Index de recherche pré-calculé pour les performances
  const searchIndex = useMemo(() => {
    // Nettoyer le cache quand les produits changent
    setSuggestionCache({});
    
    if (products.length === 0) return [];
    
    // Créer un index simplifié avec seulement les termes de recherche uniques
    const terms = new Set<string>();
    
    products.slice(0, 250).forEach(product => { // Encore moins de produits pour plus de fluidité
      const name = product.product_name;
      
      // Ajouter le nom complet s'il est court
      if (name.length < 35) {
        terms.add(name);
      }
      
      // Extraire les modèles principaux (ex: "Apple iPhone 11", "Samsung Galaxy")
      const modelMatch = name.match(/^(Apple\s+iPhone\s+\d+[A-Za-z\s]*|Samsung\s+Galaxy\s+[A-Za-z0-9\s]*|iPhone\s+\d+[A-Za-z\s]*)/i);
      if (modelMatch) {
        terms.add(modelMatch[1].trim());
      }
      
      // Ajouter seulement les 2 premières combinaisons de mots
      const words = name.split(' ');
      for (let i = 0; i < Math.min(words.length - 1, 2); i++) {
        const combo = words.slice(i, i + 2).join(' ');
        if (combo.length >= 6 && combo.length <= 20) {
          terms.add(combo);
        }
      }
    });
    
    return Array.from(terms).sort();
  }, [products]);

  // Générer des suggestions ultra-rapides avec cache
  const generateSearchSuggestions = (term: string) => {
    if (!term || term.length < 2 || searchIndex.length === 0) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const termLower = term.toLowerCase();
    
    // Vérifier le cache d'abord
    if (suggestionCache[termLower]) {
      setSearchSuggestions(suggestionCache[termLower]);
      setShowSuggestions(suggestionCache[termLower].length > 0);
      return;
    }
    
    // Filtrer l'index pré-calculé - beaucoup plus rapide
    const suggestions = searchIndex
      .filter(item => item.toLowerCase().includes(termLower))
      .sort((a, b) => {
        // Priorité aux suggestions qui commencent par le terme
        const aStarts = a.toLowerCase().startsWith(termLower);
        const bStarts = b.toLowerCase().startsWith(termLower);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        // Puis par longueur
        return a.length - b.length;
      })
      .slice(0, 5); // Maximum 5 suggestions
    
    // Sauvegarder dans le cache (limité à 50 entrées)
    if (Object.keys(suggestionCache).length < 50) {
      setSuggestionCache(prev => ({
        ...prev,
        [termLower]: suggestions
      }));
    }
      
    setSearchSuggestions(suggestions);
    setShowSuggestions(suggestions.length > 0);
  };

  // Gérer les changements de recherche avec debounce pour les suggestions
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    
    // Annuler le timeout précédent s'il existe
    if (suggestionTimeout) {
      clearTimeout(suggestionTimeout);
    }
    
    // Debounce plus long pour moins de calculs (300ms)
    const newTimeout = setTimeout(() => {
      generateSearchSuggestions(value);
    }, 300);
    
    setSuggestionTimeout(newTimeout);
  };

  // Sélectionner une suggestion
  const selectSuggestion = (suggestion: string) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
    setSearchSuggestions([]);
  };

  // Debounce pour la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // Attendre 300ms après la dernière frappe

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Cleanup du timeout des suggestions
  useEffect(() => {
    return () => {
      if (suggestionTimeout) {
        clearTimeout(suggestionTimeout);
      }
    };
  }, [suggestionTimeout]);

  // Fonction pour synchroniser les commandes brouillon avec Supabase
  const syncDraftOrdersWithSupabase = async () => {
    try {
      if (!user?.id) {
        console.warn('❌ User ID non disponible pour sync draft orders');
        return;
      }
      
      const response = await fetch(`/api/orders/draft?userId=${user.id}`, {
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
      if (!user?.id) {
        console.warn('❌ User ID non disponible pour sync order');
        return;
      }
      
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
          ),
          userId: user.id
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

  // Fonction pour vérifier si un produit est "nouveau"
  const isNewProduct = (product: Product) => {
    if (importInfo && importInfo.newSkus && importInfo.restockedSkus) {
      // Utiliser les vraies données d'import si disponibles
      return importInfo.newSkus.includes(product.sku) || importInfo.restockedSkus.includes(product.sku);
    } else {
      // Heuristique temporaire plus restrictive
      // Seulement les produits avec stock élevé et certaines caractéristiques
      if (product.quantity === 0) return false;
      
      // Par exemple, considérer comme "nouveaux" les produits avec stock > 50
      // ou qui ont certaines caractéristiques récentes
      const hasHighStock = product.quantity > 50;
      const hasRecentFeatures = product.additional_info && 
        (product.additional_info.includes('2024') || 
         product.additional_info.includes('new') ||
         product.additional_info.includes('récent'));
      
      return hasHighStock || hasRecentFeatures || false; // Plus restrictif
    }
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
      
              // Filtre Grades X : par défaut Working seulement, si activé Minor Fault seulement
        const matchesBoxedFilter = 
            showMinorFaultOnly ? product.functionality === 'Minor Fault' : product.functionality === 'Working';
      
      return matchesSearch && matchesManufacturer && matchesAppearance && 
             matchesColor && matchesBoxed &&
             matchesAdditionalInfo && matchesPriceMin && matchesPriceMax && 
             matchesQuantityMin && matchesQuantityMax && 
             matchesStandardCapacity && matchesStock && matchesBoxedFilter;
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
    showMinorFaultOnly,
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
    
    // Si pas de commande active, ouvrir la popup de création
    if (!currentDraftOrder) {
      
      // Chercher d'abord une commande brouillon existante
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
        if (!user?.id) {
          console.warn('❌ User ID non disponible pour vérification draft orders');
          // Continuer en mode dégradé
        } else {
          const response = await fetch(`/api/orders/draft?userId=${user.id}`, {
            method: 'GET'
          });
        
          if (response.ok) {
            const result = await response.json();
            if (result.draftOrders && result.draftOrders.length > 0) {
              // Utiliser automatiquement la commande en brouillon la plus récente
              const existingDraft = result.draftOrders[0];
              console.log('📋 Utilisation de la commande en brouillon existante:', existingDraft.name);
              
              // Charger cette commande comme commande active
              setCurrentDraftOrder(existingDraft.id);
              saveCurrentOrderToLocalStorage(existingDraft.id);
              
              // Synchroniser avec les données existantes
              const syncedDraftOrders = { ...draftOrders };
              syncedDraftOrders[existingDraft.id] = {
                id: existingDraft.id,
                name: existingDraft.name,
                status: 'draft',
                status_label: 'Brouillon',
                createdAt: existingDraft.created_at,
                items: existingDraft.items || {},
                supabaseId: existingDraft.id,
                source: 'supabase',
                total_amount: existingDraft.total_amount,
                total_items: existingDraft.total_items
              };
              
              setDraftOrders(syncedDraftOrders);
              setQuantities(existingDraft.items || {});
              await saveDraftOrdersToLocalStorage(syncedDraftOrders);
              
              // Maintenant continuer avec l'ajout du produit
              const currentQuantity = existingDraft.items?.[sku] || 0;
              const newQuantity = replace ? quantity : currentQuantity + quantity;
              
              const updatedItems = {
                ...existingDraft.items,
                [sku]: newQuantity
              };
              
              const updatedDraftOrders = {
                ...syncedDraftOrders,
                [existingDraft.id]: {
                  ...syncedDraftOrders[existingDraft.id],
                  items: updatedItems
                }
              };
              
              setDraftOrders(updatedDraftOrders);
              setQuantities(prev => ({ ...prev, [sku]: newQuantity }));
              setSelectedProducts(prev => ({ ...prev, [sku]: true }));
              
              await saveDraftOrdersToLocalStorage(updatedDraftOrders);
              return;
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Erreur vérification commandes brouillon:', error);
        // Continuer en mode dégradé en cas d'erreur réseau
      }
      
      // Si aucune commande brouillon existante, ouvrir la popup de création
      console.log('📋 Ouverture de la popup de création de commande');
      
      // Sauvegarder le produit à ajouter en attente
      sessionStorage.setItem('pendingProduct', JSON.stringify({ sku, quantity }));
      
      // Marquer le produit comme sélectionné visuellement
      setSelectedProducts(prev => ({ ...prev, [sku]: true }));
      
      // Ouvrir la popup
      setShowOrderNamePopup(true);
      
      return;
    }

    // Si une commande existe déjà, ajouter le produit normalement
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
    setSelectedProducts(prev => ({ ...prev, [sku]: true }));
    
    // Sauvegarder
    await saveDraftOrdersToLocalStorage(newDraftOrders);
  };

  // Fonction pour sélectionner toute la quantité disponible (case à cocher)
  const selectFullQuantity = async (sku: string, productQuantity: number) => {
    await addToCartWithQuantity(sku, productQuantity, true); // Replace avec toute la quantité
  };

  const createAutomaticOrder = async () => {
    // Création automatique de commande sans popup
    if (creatingOrder) return null;
    setCreatingOrder(true);
    
    const finalOrderName = `Commande ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    
    try {
      // Appeler l'API pour créer la commande dans Supabase
      const response = await fetch('/api/orders/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: finalOrderName,
          items: {},
          totalItems: 0,
          userId: selectedClientId // Pour l'admin, c'est le client sélectionné
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur création commande');
      }

      const result = await response.json();
      const supabaseOrder = result.order;

      // Créer l'objet commande pour localStorage
      const newOrder = {
        id: supabaseOrder.id,
        name: finalOrderName,
        status: 'draft',
        status_label: 'Brouillon',
        createdAt: supabaseOrder.created_at,
        items: {},
        supabaseId: supabaseOrder.id,
        source: 'auto'
      };

      const newDraftOrders = { ...draftOrders, [supabaseOrder.id]: newOrder };
      
      setDraftOrders(newDraftOrders);
      setCurrentDraftOrder(supabaseOrder.id);
      
      await saveDraftOrdersToLocalStorage(newDraftOrders);
      saveCurrentOrderToLocalStorage(supabaseOrder.id);

      OrdersUtils.markOrdersAsStale();
      
      console.log('✅ Commande automatique créée avec ID:', supabaseOrder.id);
      return { orderId: supabaseOrder.id, draftOrders: newDraftOrders };
      
    } catch (error) {
      console.error('❌ Erreur création commande automatique:', error);
      
      // Fallback localStorage
      const orderId = `DRAFT-${Date.now()}`;
      const newOrder = {
        id: orderId,
        name: finalOrderName,
        status: 'draft',
        status_label: 'Brouillon',
        createdAt: new Date().toISOString(),
        items: {},
        source: 'auto_fallback'
      };

      const newDraftOrders = { ...draftOrders, [orderId]: newOrder };
      
      setDraftOrders(newDraftOrders);
      setCurrentDraftOrder(orderId);
      
      await saveDraftOrdersToLocalStorage(newDraftOrders);
      saveCurrentOrderToLocalStorage(orderId);
      
      console.log('✅ Commande fallback créée avec ID:', orderId);
      return { orderId, draftOrders: newDraftOrders };
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
    setShowMinorFaultOnly(false);
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

  // Calculer le nombre total de nouveaux produits (nouveaux SKU + passés de 0 à en stock)
  const calculateNewProducts = async () => {
    try {
      // Récupérer les données depuis l'API route
      const response = await fetch('/api/catalog/import-info');
      const result = await response.json();
      
      if (!response.ok) {
        console.error('Erreur récupération import:', result.error);
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
      
      console.log('📊 Informations d\'import récupérées depuis l\'API:', {
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
      case 'space gray':
        return 'bg-zinc-800'; // Apple Space Gray authentique
      case 'white':
        return 'bg-gray-50 border-gray-200'; // Apple White authentique
      case 'red':
      case 'product red':
        return 'bg-red-600'; // Apple Product Red authentique
      case 'blue':
      case 'pacific blue':
      case 'sierra blue':
        return 'bg-blue-600'; // Apple Blue authentique
      case 'green':
      case 'alpine green':
      case 'midnight green':
        return 'bg-emerald-700'; // Apple Green authentique
      case 'yellow':
        return 'bg-amber-400'; // Apple Yellow authentique
      case 'purple':
      case 'deep purple':
        return 'bg-purple-600'; // Apple Purple authentique
      case 'pink':
      case 'rose':
      case 'rose gold':
        return 'bg-rose-400'; // Apple Pink/Rose Gold authentique
      case 'orange':
        return 'bg-orange-500';
      case 'gray':
      case 'grey':
        return 'bg-gray-500';
      case 'silver':
        return 'bg-gray-200'; // Apple Silver authentique
      case 'gold':
        return 'bg-amber-300'; // Apple Gold authentique
      case 'coral':
        return 'bg-coral-500';
      case 'midnight':
        return 'bg-slate-900'; // Apple Midnight authentique
      case 'graphite':
        return 'bg-zinc-700'; // Apple Graphite authentique
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
    const quantityInCart = currentDraftOrder && draftOrders[currentDraftOrder]?.items?.[product.sku] || 0;
    const isChecked = quantityInCart === product.quantity && quantityInCart > 0;
    const isHighlighted = quantityInCart > 0;

    return (
      <div className={`
        bg-white rounded border shadow-sm p-2 transition-all duration-200
        ${isHighlighted ? 'ring-1 ring-dbc-light-green bg-green-50/20' : 'hover:shadow-md'}
      `}>
        {/* Header compact avec checkbox et SKU */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={async (e) => {
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
              className="scale-75 rounded border-gray-300 text-dbc-light-green focus:ring-dbc-light-green"
            />
            <span className="text-xs font-mono text-gray-500 truncate">{product.sku}</span>
          </div>
          {isHighlighted && (
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          )}
        </div>

        {/* Nom du produit */}
        <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-1">
          {shortenProductName(product.product_name)}
        </h3>

        {/* Ligne avec Grade, Additional Info et Couleur */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Grade */}
            <span className={`text-sm font-medium px-1 py-0.5 rounded ${
              product.appearance.includes('A+') ? 'bg-purple-100 text-purple-800' :
              product.appearance.includes('A') && !product.appearance.includes('AB') ? 'bg-blue-100 text-blue-800' :
              product.appearance.includes('B') ? 'bg-green-100 text-green-800' :
              product.appearance.includes('C+') ? 'bg-yellow-100 text-yellow-800' :
              'bg-orange-100 text-orange-800'
            }`}>
              {getDisplayAppearance(product.appearance, product.functionality).replace('Grade ', '')}
            </span>

            {/* Additional Info et Couleur côte à côte */}
            <div className="flex items-center gap-2">
              {/* Additional Info */}
              {product.additional_info && (
                <span className="text-xs px-1 py-0.5 bg-purple-100 text-purple-800 rounded font-medium">
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

              {/* Indication Boxed si applicable */}
              {(product.boxed === 'Yes' || product.boxed === 'Oui') && (
                <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full font-medium">
                  📦 Boxed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Prix et contrôles de quantité optimisés B2B Admin */}
        <div className="flex items-center justify-between gap-3">
          {/* Prix avec stock */}
          <div className="flex-1">
            <div className="text-lg font-bold text-gray-900">
              {product.supplier_price ? (
                <span>
                  <span className="text-sm text-gray-600">{product.supplier_price.toFixed(2)}€</span>
                  <span className="text-gray-400 mx-1">-</span>
                  {product.price_dbc.toFixed(2)}€
                </span>
              ) : (
                <span>{product.price_dbc.toFixed(2)}€</span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Stock: {product.quantity}
            </div>
          </div>

          {/* Contrôles de quantité ultra-compacts et tactiles */}
          <div className="flex items-center gap-1.5">
            {/* Bouton décrémenter */}
            {quantityInCart > 0 && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await decrementQuantity(product.sku);
                }}
                className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-600 rounded-full hover:bg-red-200 active:scale-95 transition-all touch-manipulation"
              >
                <Minus className="h-3 w-3" />
              </button>
            )}
            
            {/* Input quantité compact - Clavier numérique mobile */}
            <div className="relative">
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                enterKeyHint="done"
                min="0"
                max={product.quantity}
                value={quantityInCart || ''}
                onChange={async (e) => {
                  const rawValue = e.target.value;
                  
                  // Nettoyer la valeur - seulement les chiffres
                  const cleanValue = rawValue.replace(/[^0-9]/g, '');
                  
                  const numValue = parseInt(cleanValue) || 0;
                  
                  // Vérifier les limites de stock
                  if (cleanValue && numValue > product.quantity) {
                    e.target.value = product.quantity.toString();
                    await addToCartWithQuantity(product.sku, product.quantity, true);
                    return;
                  }
                  
                  // Si on saisit une quantité, utiliser addToCartWithQuantity pour déclencher la popup si nécessaire
                  if (cleanValue && numValue > 0) {
                    await addToCartWithQuantity(product.sku, numValue, true);
                  } else {
                    // Si on efface (quantité 0), juste mettre à jour
                    await updateQuantity(product.sku, cleanValue);
                  }
                }}
                                 onPointerDown={(e) => {
                   // Empêcher la propagation vers la carte parent
                   e.stopPropagation();
                   
                   const input = e.target as HTMLInputElement;
                   
                   // Forcer le focus avec le clavier numérique
                   setTimeout(() => {
                     input.focus();
                     input.select();
                     
                     // Sur mobile, déclencher un clic virtuel pour s'assurer que le clavier apparaît
                     if (e.pointerType === 'touch') {
                       // Forcer l'événement de focus
                       const focusEvent = new FocusEvent('focus', { bubbles: true });
                       input.dispatchEvent(focusEvent);
                     }
                   }, 10);
                 }}
                 onFocus={(e) => {
                   e.target.select();
                 }}
                placeholder="0"
                className={`w-12 h-8 text-center text-sm font-medium border rounded-lg focus:outline-none focus:ring-2 focus:ring-dbc-light-green ${
                  isHighlighted 
                    ? 'border-dbc-light-green bg-green-50 text-green-700' 
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
                style={{ 
                  WebkitAppearance: 'none',
                  MozAppearance: 'textfield'
                }}
              />
            </div>
            
            {/* Bouton ajouter principal */}
            <button
              onClick={async (e) => {
                e.stopPropagation();
                await addToCart(product.sku);
              }}
              disabled={quantityInCart >= product.quantity}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-all touch-manipulation ${
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
    );
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
      
      await saveDraftOrdersToLocalStorage(newDraftOrders);
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

  // Charger les informations d'import au chargement
  useEffect(() => {
    const loadImportInfo = async () => {
      try {
        const response = await fetch('/api/catalog/import-info');
        if (response.ok) {
          const result = await response.json();
          if (result.data) {
            setImportInfo(result.data);
          } else {
            // Pas de données d'import, essayer une estimation basée sur les produits récents
            console.log('Aucune donnée d\'import trouvée, utilisation d\'une estimation temporaire');
          }
        } else {
          console.error('Erreur chargement import info:', response.status);
          // Utiliser une estimation temporaire en cas d'erreur
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
    
    // Heuristique simple : compter les produits avec des IDs élevés (nouvellement ajoutés)
    // En attendant que la table catalog_imports soit créée
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.quantity > 0).length;
    
    // Si on a beaucoup de produits actifs, on estime qu'environ 5% sont nouveaux
    // C'est une estimation temporaire jusqu'à ce que la vraie logique soit en place
    const estimatedNew = Math.min(Math.floor(activeProducts * 0.05), 50);
    
    return estimatedNew;
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
                placeholder="Rechercher par nom, SKU... (ex: iPhone 15 Pro Max)"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => {
                  if (searchSuggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                onBlur={() => {
                  // Délai pour permettre le clic sur une suggestion
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                className="block w-full pl-12 pr-6 py-4 text-base text-gray-900 border border-gray-200 rounded-2xl bg-white bg-opacity-80 backdrop-blur-sm focus:ring-2 focus:ring-dbc-light-green focus:border-transparent placeholder-gray-500 shadow-sm transition-all duration-200"
              />
              
              {/* Dropdown des suggestions */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute z-30 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectSuggestion(suggestion)}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:bg-gray-50 focus:outline-none first:rounded-t-xl last:rounded-b-xl transition-colors"
                    >
                      <Search className="inline h-4 w-4 text-gray-400 mr-3" />
                      {suggestion}
                    </button>
                  ))}
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

            {/* Groupe Import + Export */}
            <div className="flex items-center gap-3 bg-white bg-opacity-60 backdrop-blur-sm rounded-2xl p-3 shadow-sm border border-white border-opacity-40">
              <ImportTools onImportSuccess={calculateNewProducts} />
              
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
                  <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
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

          {/* Ligne 3: Filtres spécialisés - Organisation symétrique */}
          <div className="max-w-4xl mx-auto">
            {/* Ligne 1: Stockage de base + Grades X */}
            <div className="flex items-center justify-center gap-6 mb-4">
              {/* Stockage de base */}
                              <button
                onClick={toggleStandardCapacityFilter}
                className={`w-48 h-16 rounded-xl border-2 transition-all duration-300 text-sm font-medium flex items-center justify-center gap-2 hover:scale-105 ${
                  showStandardCapacityOnly 
                    ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 shadow-md' 
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
                }`}
              >
                💾 {showStandardCapacityOnly && <span className="text-purple-600">✓</span>}
                <span className="font-semibold text-xs">Stockage de base</span>
              </button>

              {/* Grades X - Avec PROMO */}
                              <button
                onClick={() => {
                  setShowMinorFaultOnly(!showMinorFaultOnly);
                  setCurrentPage(1);
                }}
                className={`w-48 h-16 rounded-xl border-2 transition-all duration-300 text-sm font-medium flex items-center justify-center gap-2 hover:scale-105 ${
                  showMinorFaultOnly 
                    ? 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 shadow-md' 
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
                }`}
                title="Afficher seulement les Grades x (Minor Fault)"
              >
                💎 {showMinorFaultOnly && <span className="text-violet-600">✓</span>}
                <span className="font-semibold text-xs">Grades x</span>
                <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full ml-1">PROMO</span>
              </button>
            </div>

            {/* Ligne 2: Rupture de stock + Nouveaux (plus petits) */}
            <div className="flex items-center justify-center gap-6">
              {/* Rupture de stock */}
              <button
                onClick={toggleZeroStockProducts}
                className={`w-44 h-12 rounded-lg border-2 transition-all duration-300 text-xs font-medium flex items-center justify-center gap-1 hover:scale-105 ${
                  includeZeroStock 
                    ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 shadow-md' 
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
                }`}
              >
                📦 {includeZeroStock && <span className="text-red-600">✓</span>}
                <span className="font-semibold">Rupture de stock</span>
                {!includeZeroStock && filteredOutOfStockProducts.length > 0 && (
                  <span className="bg-red-100 text-red-800 text-xs px-1.5 py-0.5 rounded-full font-normal ml-1">
                    +{filteredOutOfStockProducts.length}
                  </span>
                )}
              </button>

              {/* Nouveaux produits */}
              <button
                onClick={() => setShowNewProductsOnly(!showNewProductsOnly)}
                className={`w-44 h-12 rounded-lg border-2 transition-all duration-300 text-xs font-medium flex flex-col items-center justify-center hover:scale-105 ${
                  showNewProductsOnly 
                    ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 shadow-md' 
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
                }`}
                title={importInfo ? 
                  `Dernière mise à jour: ${new Date(importInfo.importDate).toLocaleString('fr-FR')}` : 
                  'Information d\'import en cours de chargement'
                }
              >
                <div className="flex items-center gap-1">
                  ✨ {showNewProductsOnly && <span className="text-yellow-600">✓</span>}
                  <span className="font-semibold">Nouveaux</span>
                  {importInfo && (
                    <span className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded-full font-normal">
                      +{importInfo.totalNewProducts}
                    </span>
                  )}
                </div>
                {importInfo && (
                  <div className="text-[10px] text-gray-500 leading-tight">
                    {new Date(importInfo.importDate).toLocaleDateString('fr-FR')} {new Date(importInfo.importDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Filtres avancés avec dropdowns - cachés sur mobile par défaut */}
        <div className={`${showMobileFilters ? 'block' : 'hidden'} lg:block mb-6`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {/* Manufacturer */}
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
                              handleDropdownInteraction(); // Garder ouvert après sélection
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

            {/* Appearance */}
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
                              handleDropdownInteraction(); // Garder ouvert après sélection
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

            {/* Boxed */}
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
                            handleDropdownInteraction(); // Garder ouvert après sélection
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

            {/* Price filters */}
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

            {/* Quantity filters */}
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

        {/* Navigation en haut simplifiée */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center sm:justify-end gap-1 sm:gap-2 mb-4">
            {/* Version mobile */}
            <div className="flex sm:hidden items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 text-sm bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-lg disabled:bg-opacity-50 disabled:text-gray-400 text-gray-700 hover:bg-opacity-90 transition-all duration-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 py-1 text-sm text-gray-700 bg-white bg-opacity-60 backdrop-blur-sm rounded-lg border border-white border-opacity-20">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-sm bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-lg disabled:bg-opacity-50 disabled:text-gray-400 text-gray-700 hover:bg-opacity-90 transition-all duration-200"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            
            {/* Version desktop */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-lg disabled:bg-opacity-50 disabled:text-gray-400 text-gray-700 hover:bg-opacity-90 transition-all duration-200"
              >
                Premier
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-lg disabled:bg-opacity-50 disabled:text-gray-400 text-gray-700 hover:bg-opacity-90 transition-all duration-200"
              >
                ←
              </button>
              <span className="px-3 py-1 text-sm text-gray-700 bg-white bg-opacity-60 backdrop-blur-sm rounded-lg border border-white border-opacity-20">
                Page {currentPage} sur {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-lg disabled:bg-opacity-50 disabled:text-gray-400 text-gray-700 hover:bg-opacity-90 transition-all duration-200"
              >
                →
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-lg disabled:bg-opacity-50 disabled:text-gray-400 text-gray-700 hover:bg-opacity-90 transition-all duration-200"
              >
                Dernier
              </button>
            </div>
          </div>
        )}

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
            {/* Vue cartes (≤1023px) - Permet de voir toutes les infos importantes */}
            <div className="lg:hidden">

              {/* Grille de cartes responsive */}
              <div className="grid grid-cols-1 gap-2">
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
                      <th className="px-1 py-1.5 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap w-8">Sél.</th>
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
                          <td className="px-1 py-1 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={async (e) => {
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
                              className="scale-75 rounded border-gray-300 text-dbc-light-green focus:ring-dbc-light-green"
                            />
                          </td>
                          <td className="px-1 py-1 text-xs font-mono text-gray-900 whitespace-nowrap">{product.sku}</td>
                          <td className="px-1 py-1 text-xs text-gray-900">
                            <div className="break-words max-w-[160px]" title={product.product_name}>
                              {shortenProductName(product.product_name)}
                            </div>
                          </td>
                          <td className="px-1 py-1 hidden md:table-cell">
                            <span className={`inline-flex px-1 py-0.5 text-xs font-medium rounded-md ${
                              product.appearance.includes('A+') ? 'bg-purple-100 text-purple-800' :
                              product.appearance.includes('A') && !product.appearance.includes('AB') ? 'bg-blue-100 text-blue-800' :
                              product.appearance.includes('B') ? 'bg-green-100 text-green-800' :
                              product.appearance.includes('C+') ? 'bg-yellow-100 text-yellow-800' :
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
                            {product.supplier_price ? (
                              <div className="text-xs">
                                <span className="text-gray-600">{product.supplier_price.toFixed(2)}€</span>
                                <span className="text-gray-400 mx-1">-</span>
                                <span className="font-medium">{product.price_dbc.toFixed(2)}€</span>
                              </div>
                            ) : (
                              <span>{product.price_dbc.toFixed(2)}€</span>
                            )}
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
          </>
        )}

        {/* Statistiques et contrôles en bas */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-700">
            <span className="font-semibold text-lg">{filteredAndSortedProducts.length.toLocaleString('fr-FR')}</span> produits affichés
            {totalProductsCount && filteredAndSortedProducts.length !== totalProductsCount && (
              <span className="text-gray-500 block sm:inline">
                {' '}(filtrés sur <span className="font-medium">{totalProductsCount.toLocaleString('fr-FR')}</span> total)
              </span>
            )}
          </div>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="text-sm border border-gray-300 rounded px-3 py-1 text-gray-600 w-full sm:w-auto bg-white"
          >
            <option value={50}>50 par page</option>
            <option value={100}>100 par page</option>
            <option value={250}>250 par page</option>
            <option value={500}>500 par page</option>
          </select>
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