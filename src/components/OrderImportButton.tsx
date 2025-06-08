'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Check, AlertTriangle, X, TrendingUp, Edit3, FileSpreadsheet, Info } from 'lucide-react';
import ClientSelector from './ClientSelector';
import { supabase } from '../lib/supabase';
import { OrdersUtils } from '../lib/orders-utils';

interface OrderImportButtonProps {
  onImportComplete?: (result: { success: boolean; error?: string; order?: any }) => void;
}

interface ProductExisting {
  sku: string;
  product_name: string;
  quantity: number;
  supplier_price: number;
  dbc_price: number;
  vat_type: string;
  catalog_stock: number;
  status: string;
}

interface ProductToUpdate {
  sku: string;
  product_name: string;
  quantity: number;
  supplier_price: number;
  dbc_price: number;
  vat_type: string;
  catalog_stock: number;
  new_stock: number;
  status: string;
}

interface ProductToCreate {
  sku: string;
  product_name: string;
  quantity: number;
  supplier_price: number;
  dbc_price: number;
  vat_type: string;
  appearance: string;
  functionality: string;
  color: string;
  boxed: string;
  additional_info: string;
  price_source: string;
  status: string;
}

export default function OrderImportButton({ onImportComplete }: OrderImportButtonProps) {
  const [importing, setImporting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Nouveaux états pour les 3 catégories
  const [productsExistingWithGoodStock, setProductsExistingWithGoodStock] = useState<ProductExisting[]>([]);
  const [productsToUpdateStock, setProductsToUpdateStock] = useState<ProductToUpdate[]>([]);
  const [productsToCreate, setProductsToCreate] = useState<ProductToCreate[]>([]);
  
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);
  const [editablePrices, setEditablePrices] = useState<{ [sku: string]: number }>({});
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Récupérer le statut admin au chargement
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          return;
        }
        
        setCurrentUserId(session.user.id);
        
        // Récupérer le profil utilisateur
        const { data: profile, error } = await supabase
          .from('users')
          .select('id, role, is_active')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Erreur récupération profil:', error);
          return;
        }

        console.log('👤 Profil utilisateur:', profile);
        setIsAdmin(profile.role === 'admin');
        
        // Si pas admin, définir le client comme l'utilisateur connecté
        if (profile.role !== 'admin') {
          setSelectedClientId(session.user.id);
        }
      } catch (error) {
        console.error('Erreur vérification rôle:', error);
      }
    };

    checkUserRole();
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier que c'est un fichier Excel
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      alert('Veuillez sélectionner un fichier Excel (.xlsx ou .xls)');
      return;
    }

    setImporting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/orders/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'import');
      }

      console.log('📊 Résultats import:', result);

      // Mettre à jour les états avec les nouveaux données
      setProductsExistingWithGoodStock(result.productsExistingWithGoodStock || []);
      setProductsToUpdateStock(result.productsToUpdateStock || []);
      setProductsToCreate(result.productsToCreate || []);
      setPendingOrderData(result.orderData);
      
      // Initialiser les prix éditables avec tous les produits qui peuvent être édités
      const initialPrices: { [sku: string]: number } = {};
      
      // Produits existants avec bon stock (prix éditable)
      (result.productsExistingWithGoodStock || []).forEach((product: any) => {
        initialPrices[product.sku] = product.dbc_price;
      });
      
      // Produits à mettre à jour (prix éditable)
      (result.productsToUpdateStock || []).forEach((product: any) => {
        initialPrices[product.sku] = product.dbc_price;
      });
      
      // Nouveaux produits à créer (prix éditable)
      (result.productsToCreate || []).forEach((product: any) => {
        initialPrices[product.sku] = product.dbc_price;
      });
      
      setEditablePrices(initialPrices);
      
      setShowConfirmDialog(true);

    } catch (error) {
      console.error('❌ Erreur import commande:', error);
      alert(`Erreur lors de l'import: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      onImportComplete?.({ success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' });
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const handlePriceEdit = (sku: string, newPrice: number) => {
    setEditablePrices(prev => ({
      ...prev,
      [sku]: newPrice
    }));
  };

  const handleConfirmImport = async (addToCatalog: boolean) => {
    setImporting(true);
    
    try {
      // Appliquer les prix modifiés à tous les produits
      const finalProductsExisting = productsExistingWithGoodStock.map(product => ({
        ...product,
        dbc_price: editablePrices[product.sku] || product.dbc_price
      }));
      
      const finalProductsToUpdate = productsToUpdateStock.map(product => ({
        ...product,
        dbc_price: editablePrices[product.sku] || product.dbc_price
      }));
      
      const finalProductsToCreate = productsToCreate.map(product => ({
        ...product,
        dbc_price: editablePrices[product.sku] || product.dbc_price
      }));

      const confirmData = {
        orderData: pendingOrderData,
        productsExistingWithGoodStock: finalProductsExisting,
        productsToUpdateStock: finalProductsToUpdate,
        productsToCreate: finalProductsToCreate,
        addToCatalog,
        userId: selectedClientId // Ajouter l'ID du client sélectionné
      };

      const response = await fetch('/api/orders/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(confirmData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la confirmation');
      }

      // Marquer les commandes comme obsolètes dès qu'une nouvelle commande est créée
      OrdersUtils.markOrdersAsStale();
      
      setShowConfirmDialog(false);
      onImportComplete?.({ 
        success: true, 
        order: result.order,
      });

      // Réinitialiser les états
      setProductsExistingWithGoodStock([]);
      setProductsToUpdateStock([]);
      setProductsToCreate([]);
      setPendingOrderData(null);
      setEditablePrices({});
      setSelectedClientId(null);

    } catch (error) {
      console.error('❌ Erreur confirmation:', error);
      alert(`Erreur lors de la confirmation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setImporting(false);
    }
  };

  const ProductTable = ({ 
    title, 
    products, 
    showEditPrice = false, 
    colorClass = "border-green-200",
    bgClass = "bg-green-50",
    iconColor = "text-green-600",
    description
  }: {
    title: string;
    products: any[];
    showEditPrice?: boolean;
    colorClass?: string;
    bgClass?: string;
    iconColor?: string;
    description?: string;
  }) => {
    if (products.length === 0) return null;

    return (
      <div className="mb-6">
        <div className={`${bgClass} border ${colorClass} rounded-lg p-4`}>
          <h4 className={`text-lg font-semibold mb-2 flex items-center ${iconColor}`}>
            <Check className="h-5 w-5 mr-2" />
            {title} ({products.length} produit{products.length > 1 ? 's' : ''})
          </h4>
          {description && (
            <p className="text-sm text-gray-600 mb-3">{description}</p>
          )}
          
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="text-left py-3 px-3 font-semibold text-gray-700">SKU</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-700">Nom</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-700">Apparence</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-700">Fonctionnalité</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-700">Couleur</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-700">Qté</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-700">Prix fournisseur</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-700">Prix DBC</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-700">VAT</th>
                  {(productsToUpdateStock.length > 0 && products === productsToUpdateStock) && (
                    <th className="text-center py-3 px-3 font-semibold text-gray-700">Stock actuel</th>
                  )}
                  <th className="text-left py-3 px-3 font-semibold text-gray-700">Statut</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, index) => (
                  <tr key={`${product.sku}-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-sm font-medium text-gray-900">{product.sku}</td>
                    <td className="py-2 px-3 text-sm text-gray-800 max-w-xs">
                      <div className="break-words" title={product.product_name}>
                        {product.product_name}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        product.appearance === 'Grade A+' ? 'bg-emerald-100 text-emerald-800' :
                        product.appearance === 'Grade A' ? 'bg-green-100 text-green-800' :
                        product.appearance === 'Grade B' ? 'bg-yellow-100 text-yellow-800' :
                        product.appearance === 'Grade C' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {product.appearance || '—'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        product.functionality === '100%' ? 'bg-green-100 text-green-800' :
                        product.functionality?.includes('95%') || product.functionality?.includes('90%') ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {product.functionality || '—'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center text-sm text-gray-600">
                      {product.color || '—'}
                    </td>
                    <td className="py-2 px-3 text-center text-sm font-medium text-gray-900">{product.quantity}</td>
                    <td className="py-2 px-3 text-right text-sm text-gray-800">
                      {product.supplier_price ? `${product.supplier_price.toFixed(2)}€` : '—'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {showEditPrice ? (
                        <div className="flex items-center justify-end space-x-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editablePrices[product.sku] || product.dbc_price}
                            onChange={(e) => handlePriceEdit(product.sku, parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-right text-sm font-medium text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                          <span className="text-xs text-gray-500">€</span>
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-gray-900">{product.dbc_price?.toFixed(2)}€</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        product.vat_type === 'Marginal' || product.vat_type === 'marginal'
                          ? 'bg-orange-100 text-orange-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {product.vat_type}
                      </span>
                    </td>
                    {(productsToUpdateStock.length > 0 && products === productsToUpdateStock) && (
                      <td className="py-2 px-3 text-center text-sm font-medium">
                        <span className="text-red-600">{product.catalog_stock}</span>
                        <span className="text-gray-400 mx-1">→</span>
                        <span className="text-green-600">{product.new_stock}</span>
                      </td>
                    )}
                    <td className="py-2 px-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        product.status.includes('suffisant') || product.status.includes('Stock suffisant') ? 'bg-green-100 text-green-800' :
                        product.status.includes('mettre à jour') || product.status.includes('Stock à mettre à jour') ? 'bg-yellow-100 text-yellow-800' :
                        product.status.includes('voisin') || product.status.includes('Prix voisin') ? 'bg-blue-100 text-blue-800' :
                        product.status.includes('calculé') || product.status.includes('Prix calculé') ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {product.status}
                      </span>
                      {product.price_source && (
                        <div className="text-xs text-gray-500 mt-1">{product.price_source}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Calculer les totaux
  const getTotalAmount = () => {
    const allProducts = [
      ...productsExistingWithGoodStock,
      ...productsToUpdateStock,
      ...productsToCreate
    ];
    
    return allProducts.reduce((sum, product) => {
      const price = editablePrices[product.sku] || product.dbc_price;
      return sum + (price * product.quantity);
    }, 0);
  };

  const getTotalItems = () => {
    const allProducts = [
      ...productsExistingWithGoodStock,
      ...productsToUpdateStock,
      ...productsToCreate
    ];
    
    return allProducts.reduce((sum, product) => sum + product.quantity, 0);
  };

  return (
    <>
      <label className="relative inline-block cursor-pointer">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className="sr-only"
          disabled={importing}
        />
        <div className="flex items-center space-x-2 px-4 py-2 bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-xl hover:bg-opacity-90 hover:shadow-lg text-sm text-gray-700 font-medium transition-all duration-200 shadow-md">
          {importing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
              <span>Import en cours...</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              <span>Importer commande Excel</span>
            </>
          )}
        </div>
      </label>

      {/* Dialog de confirmation avec les 3 tableaux distincts */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
            {/* En-tête */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <FileSpreadsheet className="h-6 w-6 mr-2 text-blue-600" />
                  Validation de l'import
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Fichier: <span className="font-medium">{pendingOrderData?.fileName}</span>
                </p>
              </div>
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Contenu principal */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Résumé global */}
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                  <Info className="h-5 w-5 mr-2" />
                  Résumé de l'import
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center p-3 bg-white rounded-lg border border-blue-100">
                    <div className="text-2xl font-bold text-green-600">{productsExistingWithGoodStock.length}</div>
                    <div className="text-gray-700 font-medium">Produits OK</div>
                    <div className="text-xs text-gray-500">Stock suffisant</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border border-blue-100">
                    <div className="text-2xl font-bold text-yellow-600">{productsToUpdateStock.length}</div>
                    <div className="text-gray-700 font-medium">À mettre à jour</div>
                    <div className="text-xs text-gray-500">Stock insuffisant</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border border-blue-100">
                    <div className="text-2xl font-bold text-blue-600">{productsToCreate.length}</div>
                    <div className="text-gray-700 font-medium">À créer</div>
                    <div className="text-xs text-gray-500">Nouveaux produits</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border border-blue-100">
                    <div className="text-2xl font-bold text-purple-600">{getTotalAmount().toFixed(2)}€</div>
                    <div className="text-gray-700 font-medium">Total commande</div>
                    <div className="text-xs text-gray-500">{getTotalItems()} articles</div>
                  </div>
                </div>
              </div>

              {/* Sélecteur de client */}
              <div className="mb-6">
                <ClientSelector
                  selectedClientId={selectedClientId}
                  onChange={setSelectedClientId}
                  isAdmin={isAdmin}
                  currentUserId={currentUserId || undefined}
                />
              </div>

              {/* Tableau 1: Produits existants avec stock suffisant */}
              <ProductTable 
                title="Produits existants avec stock suffisant"
                products={productsExistingWithGoodStock}
                showEditPrice={true}
                colorClass="border-green-200"
                bgClass="bg-green-50"
                iconColor="text-green-600"
                description="Ces produits existent dans le catalogue avec un stock suffisant pour la commande."
              />

              {/* Tableau 2: Produits à mettre à jour */}
              <ProductTable 
                title="Produits avec stock à mettre à jour"
                products={productsToUpdateStock}
                showEditPrice={true}
                colorClass="border-yellow-200"
                bgClass="bg-yellow-50"
                iconColor="text-yellow-600"
                description="Ces produits existent dans le catalogue mais le stock sera mis à jour selon la quantité de la commande."
              />

              {/* Tableau 3: Produits à créer */}
              <ProductTable 
                title="Nouveaux produits à créer"
                products={productsToCreate}
                showEditPrice={true}
                colorClass="border-blue-200"
                bgClass="bg-blue-50"
                iconColor="text-blue-600"
                description="Ces produits n'existent pas dans le catalogue et seront créés. Les prix ont été déterminés par la méthode voisin ou le calcul de marge standard."
              />

              {/* Note explicative sur les prix */}
              {(productsToUpdateStock.length > 0 || productsToCreate.length > 0) && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <div className="text-amber-600 mt-0.5">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div className="text-amber-800">
                      <strong>Méthode de calcul des prix :</strong>
                      <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                        <li><strong>Prix voisin trouvé :</strong> Utilise le prix d'un produit similaire dans le catalogue (même nom, apparence, fonctionnalité)</li>
                        <li><strong>Prix calculé :</strong> Applique la marge DBC standard (+11% non marginal, +1% marginal)</li>
                        <li><strong>Tous les prix sont éditables</strong> avant la confirmation finale</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pied de page avec actions */}
            <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                <strong>Total final :</strong> {getTotalAmount().toFixed(2)}€ • {getTotalItems()} articles
                {isAdmin && !selectedClientId && (
                  <div className="text-red-600 text-xs mt-1 font-medium">
                    ⚠️ Veuillez sélectionner un client avant de confirmer
                  </div>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={importing}
                  className="flex items-center space-x-2 px-4 py-2 bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-xl text-gray-700 hover:bg-opacity-90 hover:shadow-lg disabled:opacity-50 transition-all duration-200 shadow-sm"
                >
                  <X className="h-4 w-4" />
                  <span>Annuler</span>
                </button>
                <button
                  onClick={() => handleConfirmImport(true)}
                  disabled={importing || (isAdmin && !selectedClientId)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-dbc-bright-green to-emerald-400 text-dbc-dark-green rounded-xl hover:from-emerald-300 hover:to-emerald-500 hover:text-white disabled:opacity-50 font-semibold shadow-lg backdrop-blur-sm transition-all duration-200"
                >
                  {importing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span>Confirmer et créer la commande</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 