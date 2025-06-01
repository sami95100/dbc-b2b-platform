'use client';

import React, { useState } from 'react';
import { Upload, Check, AlertTriangle, X, TrendingUp, Edit3 } from 'lucide-react';

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

      console.log('📁 Analyse du fichier Excel...');
      const response = await fetch('/api/orders/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'import');
      }

      console.log('✅ Analyse terminée:', result);

      // Mettre à jour les états avec les nouveaux données
      setProductsExistingWithGoodStock(result.productsExistingWithGoodStock || []);
      setProductsToUpdateStock(result.productsToUpdateStock || []);
      setProductsToCreate(result.productsToCreate || []);
      setPendingOrderData(result.orderData);
      
      // Initialiser les prix éditables
      const initialPrices: { [sku: string]: number } = {};
      [...(result.productsToUpdateStock || []), ...(result.productsToCreate || [])].forEach((product: any) => {
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
      // Appliquer les prix modifiés
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
        productsExistingWithGoodStock,
        productsToUpdateStock: finalProductsToUpdate,
        productsToCreate: finalProductsToCreate,
        addToCatalog
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

      console.log('✅ Commande créée:', result);
      
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

    } catch (error) {
      console.error('❌ Erreur confirmation:', error);
      alert(`Erreur lors de la confirmation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setImporting(false);
    }
  };

  const ProductTable = ({ title, products, showEditPrice = false, colorClass = "border-green-200" }: {
    title: string;
    products: any[];
    showEditPrice?: boolean;
    colorClass?: string;
  }) => {
    if (products.length === 0) return null;

    return (
      <div className="mb-6">
        <h4 className={`text-lg font-semibold mb-3 flex items-center text-gray-800`}>
          <Check className="h-5 w-5 mr-2" />
          {title} ({products.length})
        </h4>
        <div className={`max-h-64 overflow-y-auto border ${colorClass} rounded-lg`}>
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="text-left py-3 px-3 font-semibold text-gray-800">SKU</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-800">Nom</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-800">Qté</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-800">Prix fournisseur</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-800">Prix DBC</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-800">VAT</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-800">Statut</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 font-mono text-sm font-medium text-gray-900">{product.sku}</td>
                  <td className="py-2 px-3 text-sm text-gray-800">{product.product_name}</td>
                  <td className="py-2 px-3 text-center text-sm font-medium text-gray-900">{product.quantity}</td>
                  <td className="py-2 px-3 text-right text-sm text-gray-800">{product.supplier_price?.toFixed(2)}€</td>
                  <td className="py-2 px-3 text-right">
                    {showEditPrice ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editablePrices[product.sku] || product.dbc_price}
                        onChange={(e) => handlePriceEdit(product.sku, parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-right text-sm font-medium text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-900">{product.dbc_price?.toFixed(2)}€</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-sm">
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      product.vat_type === 'Marginal' 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {product.vat_type}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      product.status.includes('suffisant') ? 'bg-green-100 text-green-800' :
                      product.status.includes('mettre à jour') ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {product.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Ajout d'une note explicative pour les prix */}
        {showEditPrice && products.length > 0 && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            <div className="flex items-start space-x-2">
              <div className="text-blue-600 mt-0.5">💡</div>
              <div className="text-blue-800">
                <strong>Calcul des prix :</strong> 
                <span className="block mt-1">
                  • <strong>Prix voisin trouvé</strong> → Utilise le prix du produit similaire<br/>
                  • <strong>Aucun voisin</strong> → Applique la marge DBC standard (+11% non marginal, +1% marginal)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="relative">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={importing}
        />
        <button
          disabled={importing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {importing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Import en cours...</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              <span>Importer commande Excel</span>
            </>
          )}
        </button>
      </div>

      {/* Dialog de confirmation amélioré */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                Validation de l'import - {pendingOrderData?.fileName}
              </h3>
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {/* Résumé */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Résumé de l'import</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{productsExistingWithGoodStock.length}</div>
                    <div className="text-gray-800 font-medium">Produits OK</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{productsToUpdateStock.length}</div>
                    <div className="text-gray-800 font-medium">À mettre à jour</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{productsToCreate.length}</div>
                    <div className="text-gray-800 font-medium">À créer</div>
                  </div>
                </div>
              </div>

              {/* Tableau 1: Produits existants avec stock suffisant */}
              <ProductTable 
                title="Produits existants avec stock suffisant"
                products={productsExistingWithGoodStock}
                colorClass="border-green-200"
              />

              {/* Tableau 2: Produits à mettre à jour */}
              <ProductTable 
                title="Produits avec stock à mettre à jour"
                products={productsToUpdateStock}
                showEditPrice={true}
                colorClass="border-yellow-200"
              />

              {/* Tableau 3: Produits à créer */}
              <ProductTable 
                title="Nouveaux produits à créer"
                products={productsToCreate}
                showEditPrice={true}
                colorClass="border-blue-200"
              />
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={importing}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                <span>Annuler</span>
              </button>
              <button
                onClick={() => handleConfirmImport(true)}
                disabled={importing}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {importing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span>Confirmer et créer la commande</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 