'use client';

import { useState, useRef } from 'react';
import { Upload, RefreshCw, CheckCircle, AlertCircle, X, Package, TrendingUp, FileText } from 'lucide-react';

interface UpdateStatus {
  loading: boolean;
  progress: number;
  success: boolean;
  error: string | null;
  message: string | null;
  summary?: any;
}

export default function CatalogUpdateButton({ onUpdateComplete }: { onUpdateComplete?: () => void }) {
  const [showResults, setShowResults] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    loading: false,
    progress: 0,
    success: false,
    error: null,
    message: null
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleUpload(file);
    }
  };

  const handleUpload = async (file: File) => {
    setUpdateStatus({ 
      loading: true, 
      progress: 0,
      success: false, 
      error: null, 
      message: null 
    });
    setShowResults(true);

    try {
      const formData = new FormData();
      formData.append('catalog', file);

      // Progression plus réaliste
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress += 2 + Math.random() * 3; // Progression plus lente et régulière
        if (currentProgress > 90) {
          clearInterval(progressInterval);
          currentProgress = 90; // Rester à 90% jusqu'à la fin réelle
        }
        setUpdateStatus(prev => ({
          ...prev,
          progress: currentProgress
        }));
      }, 800); // Intervalle plus long

      const response = await fetch('/api/catalog/update', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);

      const result = await response.json();

      if (response.ok) {
        setUpdateStatus({
          loading: false,
          progress: 100,
          success: true,
          error: null,
          message: result.message || 'Catalogue mis à jour avec succès',
          summary: result.summary
        });
        
        // Sauvegarder les nouveaux SKU pour le filtre
        if (result.summary?.all_new_skus && result.summary.all_new_skus.length > 0) {
          localStorage.setItem('lastImportNewSKUs', JSON.stringify(result.summary.all_new_skus));
          localStorage.setItem('lastImportDate', new Date().toISOString());
          console.log('🔄 Sauvegarde des nouveaux SKU:', result.summary.all_new_skus.length);
        }
        
        // Appeler la fonction de callback pour rafraîchir les données
        if (onUpdateComplete) {
          setTimeout(() => {
            onUpdateComplete();
          }, 1000);
        }
      } else {
        setUpdateStatus({
          loading: false,
          progress: 0,
          success: false,
          error: result.error || 'Erreur lors de la mise à jour',
          message: null
        });
      }
    } catch (error) {
      setUpdateStatus({
        loading: false,
        progress: 0,
        success: false,
        error: 'Erreur de connexion',
        message: null
      });
    }
  };

  const resetStatus = () => {
    setShowResults(false);
    setUpdateStatus({ 
      loading: false, 
      progress: 0,
      success: false, 
      error: null, 
      message: null 
    });
  };

  return (
    <>
      {/* Bouton principal */}
      <button
        onClick={handleButtonClick}
        disabled={updateStatus.loading}
        className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-xl hover:bg-opacity-90 hover:shadow-lg text-gray-700 transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {updateStatus.loading ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        {updateStatus.loading ? 'Import en cours...' : 'Mettre à jour le catalogue'}
      </button>

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Modal de résultats */}
      {showResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {updateStatus.loading ? 'Import du catalogue en cours' : 
                 updateStatus.success ? 'Import terminé' : 'Erreur d\'import'}
              </h3>
              {!updateStatus.loading && (
                <button
                  onClick={resetStatus}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            
            {/* Barre de progression */}
            {updateStatus.loading && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Progression</span>
                  <span className="text-sm font-medium text-blue-600">{Math.round(updateStatus.progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${updateStatus.progress}%` }}
                  ></div>
                </div>
                                 <div className="mt-2 text-sm font-semibold text-gray-800 text-center">
                   {updateStatus.progress < 20 ? 'Lecture du fichier Excel...' :
                    updateStatus.progress < 40 ? 'Validation des données...' :
                    updateStatus.progress < 65 ? 'Application des marges DBC...' :
                    updateStatus.progress < 90 ? 'Import en base de données...' :
                    'Finalisation et calcul des statistiques...'}
                 </div>
              </div>
            )}

                         {/* Status */}
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
                         <div className="text-xs text-gray-700">Produits traités</div>
                         <div className="text-xs font-medium text-gray-700 mt-1">Lignes du fichier Excel</div>
                       </div>
                       
                       <div className="text-center">
                         <div className="text-2xl font-bold text-green-600">
                           {updateStatus.summary.newSkus}
                         </div>
                         <div className="text-xs text-gray-700">Nouveaux SKU</div>
                         <div className="text-xs font-medium text-gray-700 mt-1">SKU nouveaux ou remis en stock</div>
                       </div>
                       
                       <div className="text-center">
                         <div className="text-2xl font-bold text-purple-600">
                           {updateStatus.summary.stats?.marginal || 0}
                         </div>
                         <div className="text-xs text-gray-700">Marginaux (1%)</div>
                         <div className="text-xs font-medium text-gray-700 mt-1">VAT Type = Marginal</div>
                       </div>
                       
                       <div className="text-center">
                         <div className="text-2xl font-bold text-orange-600">
                           {updateStatus.summary.stats?.non_marginal || 0}
                         </div>
                         <div className="text-xs text-gray-700">Non marginaux (11%)</div>
                         <div className="text-xs font-medium text-gray-700 mt-1">Autres produits</div>
                       </div>
                     </div>

                     <div className="border-t pt-3 mt-3 space-y-2">
                       <div className="flex justify-between items-center text-sm">
                         <span className="text-gray-700">Produits avant:</span>
                         <div className="text-right">
                           <span className="font-medium text-gray-900">{updateStatus.summary.oldProductCount}</span>
                           <span className="text-xs font-medium text-gray-700 ml-2">SKU avant import</span>
                         </div>
                       </div>
                       <div className="flex justify-between items-center text-sm">
                         <span className="text-gray-700">Produits après:</span>
                         <div className="text-right">
                           <span className="font-medium text-gray-900">{updateStatus.summary.newProductCount}</span>
                           <span className="text-xs font-medium text-gray-700 ml-2">SKU après import</span>
                         </div>
                       </div>
                       <div className="flex justify-between items-center text-sm">
                         <span className="text-gray-700">Produits actifs:</span>
                         <div className="text-right">
                           <span className="font-medium text-green-600">{updateStatus.summary.stats?.active_products || 0}</span>
                           <span className="text-xs font-medium text-gray-700 ml-2">Quantité ≠ 0</span>
                         </div>
                       </div>
                       <div className="flex justify-between items-center text-sm">
                         <span className="text-gray-700">En rupture:</span>
                         <div className="text-right">
                           <span className="font-medium text-red-600">{updateStatus.summary.stats?.out_of_stock || 0}</span>
                           <span className="text-xs font-medium text-gray-700 ml-2">Passés à quantité 0</span>
                         </div>
                       </div>
                     </div>

                     <div className="mt-3 text-xs font-medium text-gray-700 border-t pt-2">
                       Traité le {new Date(updateStatus.summary.processedAt).toLocaleString('fr-FR')}
                     </div>

                     {/* Aperçu des nouveaux produits */}
                     {updateStatus.summary.newProducts && updateStatus.summary.newProducts.length > 0 && (
                       <div className="mt-4 border-t pt-4">
                         <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                           <Package className="h-4 w-4" />
                           Aperçu des nouveaux produits ({updateStatus.summary.newSkus})
                         </h5>
                         <div className="text-xs text-gray-700 mb-2">
                           {updateStatus.summary.newSkus} SKU nouveaux ou remis en stock (aperçu limité à 50)
                         </div>
                         <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
                           {updateStatus.summary.newProducts.slice(0, 10).map((product: any, index: number) => (
                             <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                               <div className="flex-1 min-w-0">
                                 <span className="font-medium text-gray-900">{product.sku}</span>
                                 <span className="mx-2 text-gray-400">|</span>
                                 <span className="text-gray-800 truncate">{product.product_name}</span>
                               </div>
                               <div className="flex items-center gap-2 flex-shrink-0">
                                 <span className="text-green-600 font-medium">{product.price_dbc}€</span>
                                 <span className="text-gray-800 font-medium">x{product.quantity}</span>
                               </div>
                             </div>
                           ))}
                           {updateStatus.summary.newSkus > 10 && (
                             <div className="text-center text-gray-800 py-2 text-sm font-medium">
                               ... et {updateStatus.summary.newSkus - 10} autres nouveaux produits
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
             {(updateStatus.success || updateStatus.error) && (
               <div className="flex gap-3 justify-end">
                 <button
                   onClick={resetStatus}
                   className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                 >
                   Fermer
                 </button>
               </div>
             )}
          </div>
        </div>
      )}
    </>
  );
} 