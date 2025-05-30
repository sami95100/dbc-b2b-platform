'use client';

import { useState } from 'react';
import { Upload, FileSpreadsheet, AlertTriangle, Check, X, Package, Calculator, TrendingUp } from 'lucide-react';

interface MissingProduct {
  sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  offered_price: number;
  calculated_price_dbc: number;
  vat_type: string;
  // Autres champs optionnels détectés
  [key: string]: any;
}

interface ValidProduct {
  sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  offered_price: number;
  existing_price_dbc: number;
  calculated_price_dbc: number;
  vat_type: string;
  action_required: string;
}

interface ImportResult {
  success: boolean;
  orderId?: string;
  orderName?: string;
  order?: any;
  totalProducts?: number;
  productsCreated?: number;
  productsUpdated?: number;
  totalAmount?: number;
  totalItems?: number;
  message?: string;
  error?: string;
}

interface OrderImportButtonProps {
  onImportComplete?: (result: ImportResult) => void;
}

export default function OrderImportButton({ onImportComplete }: OrderImportButtonProps) {
  const [importing, setImporting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [missingProducts, setMissingProducts] = useState<MissingProduct[]>([]);
  const [validProducts, setValidProducts] = useState<ValidProduct[]>([]);
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);

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

      // Analyser le fichier et calculer les prix DBC
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

      // Toujours demander confirmation pour permettre de déboguer
      setMissingProducts(result.missingProducts || []);
      setValidProducts(result.validProducts || []);
      setPendingOrderData(result.orderData);
      setShowConfirmDialog(true);

    } catch (error) {
      console.error('❌ Erreur import commande:', error);
      alert(`Erreur lors de l'import: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      onImportComplete?.({ success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' });
    } finally {
      setImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleConfirmImport = async (addToGatalog: boolean) => {
    try {
      setImporting(true);

      console.log('📦 Création de la commande...');
      const confirmResponse = await fetch('/api/orders/import/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addToGatalog,
          missingProducts,
          validProducts,
          orderData: pendingOrderData
        }),
      });

      const confirmResult = await confirmResponse.json();

      if (!confirmResponse.ok) {
        throw new Error(confirmResult.error || 'Erreur lors de la création de la commande');
      }

      setShowConfirmDialog(false);
      setMissingProducts([]);
      setValidProducts([]);
      setPendingOrderData(null);

      console.log('✅ Commande créée avec succès:', confirmResult);
      
      // Notifier le parent du succès
      onImportComplete?.(confirmResult);

    } catch (error) {
      console.error('❌ Erreur confirmation import:', error);
      alert(`Erreur lors de la confirmation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setImporting(false);
    }
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

      {/* Dialog de confirmation */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center space-x-2 mb-4">
              <Calculator className="h-6 w-6 text-blue-500" />
              <h3 className="text-lg font-bold text-gray-900">Confirmation d'import avec prix DBC</h3>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Analyse terminée : {validProducts.length} produit{validProducts.length > 1 ? 's' : ''} existant{validProducts.length > 1 ? 's' : ''}, 
              {missingProducts.length} produit{missingProducts.length > 1 ? 's' : ''} à créer.
              Les prix DBC ont été calculés selon les règles (marginaux: +1%, non-marginaux: +11%).
            </p>

            {/* Produits existants */}
            {validProducts.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
                  <Check className="h-5 w-5 mr-2" />
                  Produits existants ({validProducts.length})
                </h4>
                <div className="max-h-64 overflow-y-auto bg-gray-50 border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">SKU</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">Nom</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">Qté</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">Prix offert</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">Prix DBC actuel</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">Prix DBC calculé</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">VAT</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validProducts.map((product, index) => (
                        <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="py-2 px-3 font-mono text-gray-900 font-medium">{product.sku}</td>
                          <td className="py-2 px-3 text-gray-800">{product.product_name}</td>
                          <td className="py-2 px-3 text-gray-900 font-medium">{product.quantity}</td>
                          <td className="py-2 px-3 text-gray-900">{product.offered_price?.toFixed(2)}€</td>
                          <td className="py-2 px-3 text-blue-600 font-medium">{product.existing_price_dbc?.toFixed(2)}€</td>
                          <td className="py-2 px-3 font-semibold text-green-700">
                            {product.calculated_price_dbc > 0 ? `${product.calculated_price_dbc.toFixed(2)}€` : 'Existant'}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              product.vat_type === 'Marginal' 
                                ? 'bg-orange-100 text-orange-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {product.vat_type}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            {product.action_required ? (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                {product.action_required}
                              </span>
                            ) : (
                              <span className="text-gray-500 text-xs">Aucune</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Produits à créer */}
            {missingProducts.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-orange-800 mb-3 flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Produits à créer ({missingProducts.length})
                </h4>
                <div className="max-h-64 overflow-y-auto bg-gray-50 border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">SKU</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">Nom du produit</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">Quantité</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">Prix offert</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">Prix DBC calculé</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">VAT Type</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">Marge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {missingProducts.map((product, index) => {
                        const margin = product.vat_type === 'Marginal' ? '+1%' : '+11%';
                        const isMarginale = product.vat_type === 'Marginal';
                        return (
                          <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="py-2 px-3 font-mono text-gray-900 font-medium">{product.sku}</td>
                            <td className="py-2 px-3 text-gray-800">{product.product_name}</td>
                            <td className="py-2 px-3 text-gray-900 font-medium">{product.quantity}</td>
                            <td className="py-2 px-3 text-gray-900">{product.offered_price?.toFixed(2)}€</td>
                            <td className="py-2 px-3 font-semibold text-green-700">
                              {product.calculated_price_dbc?.toFixed(2)}€
                            </td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                isMarginale 
                                  ? 'bg-orange-100 text-orange-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {product.vat_type}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className={`flex items-center px-2 py-1 rounded text-xs font-medium ${
                                isMarginale 
                                  ? 'bg-orange-100 text-orange-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                <TrendingUp className="h-3 w-3 mr-1" />
                                {margin}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => handleConfirmImport(false)}
                disabled={importing}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                <span>Créer sans ajouter au catalogue</span>
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