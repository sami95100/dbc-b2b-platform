'use client';

import { useState } from 'react';
import { Upload, RefreshCw, CheckCircle, AlertCircle, X, Package, TrendingUp, FileText } from 'lucide-react';

interface UpdateStatus {
  loading: boolean;
  success: boolean;
  error: string | null;
  message: string | null;
  summary?: any;
}

export default function CatalogUpdateButton({ onUpdateComplete }: { onUpdateComplete?: () => void }) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    loading: false,
    success: false,
    error: null,
    message: null
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUpdateStatus({ loading: false, success: false, error: null, message: null });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUpdateStatus({ loading: true, success: false, error: null, message: null });

    try {
      const formData = new FormData();
      formData.append('catalog', selectedFile);

      const response = await fetch('/api/catalog/update', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        setUpdateStatus({
          loading: false,
          success: true,
          error: null,
          message: result.message || 'Catalogue mis à jour avec succès',
          summary: result.summary
        });
        
        // Appeler la fonction de callback pour rafraîchir les données
        if (onUpdateComplete) {
          setTimeout(() => {
            onUpdateComplete();
          }, 1000);
        }
      } else {
        setUpdateStatus({
          loading: false,
          success: false,
          error: result.error || 'Erreur lors de la mise à jour',
          message: null
        });
      }
    } catch (error) {
      setUpdateStatus({
        loading: false,
        success: false,
        error: 'Erreur de connexion',
        message: null
      });
    }
  };

  const resetModal = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setUpdateStatus({ loading: false, success: false, error: null, message: null });
  };

  return (
    <>
      {/* Bouton principal */}
      <button
        onClick={() => setShowUploadModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-xl hover:bg-opacity-90 hover:shadow-lg text-gray-700 transition-all duration-200 shadow-md"
      >
        <RefreshCw className="h-4 w-4" />
        Mettre à jour le catalogue
      </button>

      {/* Modal d'upload */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Mettre à jour le catalogue</h3>
              <button
                onClick={resetModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Zone d'upload */}
            {!updateStatus.success && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sélectionner le nouveau catalogue Excel
                </label>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="catalog-upload"
                  />
                  <label
                    htmlFor="catalog-upload"
                    className="cursor-pointer text-blue-600 hover:text-blue-700"
                  >
                    Cliquer pour sélectionner un fichier
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Formats acceptés: .xlsx, .xls
                  </p>
                </div>
                
                {selectedFile && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                    <strong>Fichier sélectionné:</strong> {selectedFile.name}
                    <br />
                    <strong>Taille:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                )}
              </div>
            )}

            {/* Status */}
            {updateStatus.loading && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-blue-800">Traitement en cours...</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">Application des marges DBC et import dans Supabase...</p>
              </div>
            )}

            {updateStatus.success && (
              <div className="mb-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-800 font-medium">{updateStatus.message}</span>
                  </div>
                </div>

                {/* Résumé détaillé */}
                {updateStatus.summary && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Résumé des modifications
                    </h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {updateStatus.summary.importedProducts}
                        </div>
                        <div className="text-xs text-gray-600">Produits traités</div>
                        <div className="text-xs text-gray-400 mt-1">Lignes du fichier Excel</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {updateStatus.summary.newSkus}
                        </div>
                        <div className="text-xs text-gray-600">Nouveaux SKU</div>
                        <div className="text-xs text-gray-400 mt-1">SKU qui n'existaient pas</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {updateStatus.summary.stats?.marginal || 0}
                        </div>
                        <div className="text-xs text-gray-600">Marginaux (1%)</div>
                        <div className="text-xs text-gray-400 mt-1">VAT Type = Marginal</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {updateStatus.summary.stats?.non_marginal || 0}
                        </div>
                        <div className="text-xs text-gray-600">Non marginaux (11%)</div>
                        <div className="text-xs text-gray-400 mt-1">Autres produits</div>
                      </div>
                    </div>

                    <div className="border-t pt-3 mt-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Produits avant:</span>
                        <span className="font-medium">{updateStatus.summary.oldProductCount}</span>
                        <span className="text-xs text-gray-400 ml-2">SKU avant import</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Produits après:</span>
                        <span className="font-medium">{updateStatus.summary.newProductCount}</span>
                        <span className="text-xs text-gray-400 ml-2">SKU après import</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Produits actifs:</span>
                        <span className="font-medium text-green-600">{updateStatus.summary.stats?.active_products || 0}</span>
                        <span className="text-xs text-gray-400 ml-2">Quantité ≠ 0</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">En rupture:</span>
                        <span className="font-medium text-red-600">{updateStatus.summary.stats?.out_of_stock || 0}</span>
                        <span className="text-xs text-gray-400 ml-2">Passés à quantité 0</span>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                      Traité le {new Date(updateStatus.summary.processedAt).toLocaleString('fr-FR')}
                    </div>

                    {/* Aperçu des nouveaux produits */}
                    {updateStatus.summary.newProducts && updateStatus.summary.newProducts.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Aperçu des nouveaux produits ({updateStatus.summary.newProducts.length})
                        </h5>
                        <div className="text-xs text-gray-500 mb-2">
                          SKU qui n'existaient pas ou qui étaient à quantité 0
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
                          {updateStatus.summary.newProducts.slice(0, 10).map((product: any, index: number) => (
                            <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <div className="flex-1">
                                <span className="font-medium">{product.sku}</span>
                                <span className="mx-2 text-gray-400">|</span>
                                <span className="text-gray-700">{product.product_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-green-600 font-medium">{product.price_dbc}€</span>
                                <span className="text-gray-500">x{product.quantity}</span>
                              </div>
                            </div>
                          ))}
                          {updateStatus.summary.newProducts.length > 10 && (
                            <div className="text-center text-gray-500 py-2">
                              ... et {updateStatus.summary.newProducts.length - 10} autres
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {updateStatus.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-red-800">{updateStatus.error}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              {updateStatus.success ? (
                <button
                  onClick={resetModal}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Fermer
                </button>
              ) : (
                <>
                  <button
                    onClick={resetModal}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={updateStatus.loading}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={!selectedFile || updateStatus.loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {updateStatus.loading ? 'Traitement...' : 'Mettre à jour'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
} 