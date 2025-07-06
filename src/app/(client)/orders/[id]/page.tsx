'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth, withAuth } from '../../../../lib/auth-context';
import AppHeader from '@/components/AppHeader';
import { supabase, Product } from '../../../../lib/supabase';
import { 
  Package, 
  Calendar, 
  Euro,
  ChevronRight,
  ArrowLeft,
  CheckCircle,
  Truck, 
  Clock,
  AlertCircle,
  Download,
  FileText,
  Eye,
  FileSpreadsheet,
  Trash2,
  ExternalLink
} from 'lucide-react';

function ClientOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const orderId = params.id as string;

  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<'sku' | 'imei'>('sku');
  const [imeiData, setImeiData] = useState<any[]>([]);
  const [validating, setValidating] = useState(false);

  // Fonction pour générer l'URL de tracking FedEx
  const getFedExTrackingUrl = (trackingNumber: string) => {
    return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}&trkqual=${trackingNumber}~FX`;
  };

  const loadOrderDetail = async () => {
    try {
      setLoading(true);
      console.log('🔍 Chargement commande spécifique avec ID:', orderId);
      
      // Charger la commande spécifique via l'API optimisée
      const response = await fetch(`/api/orders/${orderId}`);
      const result = await response.json();

      if (!response.ok) {
        console.error('❌ Erreur API order:', result.error);
        if (response.status === 404) {
          console.log('❌ Commande non trouvée avec ID:', orderId);
          return;
        }
        throw new Error(result.error || 'Erreur de chargement');
      }

      const supabaseOrder = result.order;
      console.log('✅ Commande récupérée directement:', supabaseOrder.id);
      console.log('📦 Items de commande:', supabaseOrder.order_items?.length || 0);

      // Charger les produits spécifiques pour cette commande (même ceux épuisés)
      console.log('⏳ Chargement des produits pour cette commande...');
      const skus = supabaseOrder.order_items?.map((item: any) => item.sku) || [];
      
      // Charger TOUS les produits de ces SKUs (même désactivés ou épuisés)
      const { data: allOrderProducts, error: productsError } = await supabase
        .from('products')
        .select('*')
        .in('sku', skus);
      
      if (productsError) {
        console.error('❌ Erreur chargement produits:', productsError);
      }
      
      const currentProducts = allOrderProducts || [];
      console.log(`✅ ${currentProducts.length} produits chargés pour la commande`);
      setProducts(currentProducts);
      setProductsLoaded(true);

      // Construire les détails des articles avec les informations du catalogue
      const items = supabaseOrder.order_items?.map((orderItem: any) => {
        const product = currentProducts.find(p => p.sku === orderItem.sku);
        if (product) {
          console.log(`✅ Produit ${orderItem.sku} trouvé dans le catalogue (qté: ${product.quantity})`);
          return {
            sku: orderItem.sku,
            name: orderItem.product_name,
            appearance: product.appearance,
            functionality: product.functionality,
            color: product.color,
            boxed: product.boxed,
            additional_info: product.additional_info || '-',
            quantity: orderItem.quantity,
            unitPrice: orderItem.unit_price,
            totalPrice: orderItem.total_price,
            currentStock: product.quantity // Ajouter le stock actuel
          };
        } else {
          // Si le produit n'est pas dans le catalogue actuel, afficher infos basiques
          console.warn('⚠️ Produit non trouvé dans le catalogue actuel:', orderItem.sku);
          
          return {
            sku: orderItem.sku,
            name: orderItem.product_name,
            appearance: 'N/A',
            functionality: 'N/A',
            color: 'N/A',
            boxed: 'N/A',
            additional_info: 'Produit épuisé ou non disponible',
            quantity: orderItem.quantity,
            unitPrice: orderItem.unit_price,
            totalPrice: orderItem.total_price,
            currentStock: 0,
            isUnavailable: true
          };
        }
      }) || [];

      console.log('📦 Items trouvés:', items.length);

      setOrderDetail({
        id: supabaseOrder.id,
        name: supabaseOrder.name,
        status: supabaseOrder.status,
        status_label: supabaseOrder.status_label,
        createdAt: supabaseOrder.created_at,
        updatedAt: supabaseOrder.updated_at,
        items,
        totalItems: supabaseOrder.total_items,
        totalAmount: supabaseOrder.total_amount,
        customerRef: supabaseOrder.customer_ref,
        vatType: supabaseOrder.vat_type,
        source: 'supabase',
        tracking_number: supabaseOrder.tracking_number
      });

    } catch (error) {
      console.error('❌ Erreur lors du chargement de la commande:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      loadOrderDetail();
    }
  }, [orderId]);

  // Charger les IMEI quand on passe en mode IMEI
  useEffect(() => {
    if (viewMode === 'imei' && orderDetail) {
      loadImeiData();
    }
  }, [viewMode, orderDetail]);

  const loadImeiData = async () => {
    try {
      console.log('📱 Chargement des données IMEI pour la commande:', orderDetail.id);
      const response = await fetch(`/api/orders/${orderDetail.id}/imei/list`);
      const result = await response.json();

      if (response.ok) {
        setImeiData(result.imeiData || []);
        console.log('✅ Données IMEI chargées:', result.imeiData?.length || 0);
      } else {
        console.error('❌ Erreur chargement IMEI:', result.error);
        setImeiData([]);
      }
    } catch (error) {
      console.error('❌ Erreur réseau IMEI:', error);
      setImeiData([]);
    }
  };

  const exportData = async (type: 'sku' | 'imei', format: 'csv' | 'xlsx') => {
    try {
      console.log(`📤 Export ${type} en ${format}`);
      const response = await fetch(`/api/orders/${orderDetail.id}/export?type=${type}&format=${format}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `commande-${orderDetail.id}-${type}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        console.error('❌ Erreur export:', await response.text());
      }
    } catch (error) {
      console.error('❌ Erreur export:', error);
    }
  };

  const validateOrder = async () => {
    if (!orderDetail) return;

    try {
      setValidating(true);
      console.log('✅ Validation commande client:', orderDetail.id);
      
      const response = await fetch(`/api/orders/${orderDetail.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: orderDetail.items.map((item: any) => ({
            sku: item.sku,
            quantity: item.quantity,
            product_name: item.name,
            unit_price: item.unitPrice
          })),
          totalItems: orderDetail.totalItems,
          totalAmount: orderDetail.totalAmount,
          status: 'pending_payment'
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la validation');
      }

      setOrderDetail((prev: any) => ({
        ...prev,
        status: 'pending_payment',
        status_label: 'En attente de paiement'
      }));

      alert('✅ Commande validée avec succès !');
    } catch (error) {
      console.error('❌ Erreur validation:', error);
      alert('❌ Erreur lors de la validation');
    } finally {
      setValidating(false);
    }
  };

  const deleteOrder = async () => {
    if (!orderDetail) return;
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la commande "${orderDetail.name}" ?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/orders/${orderDetail.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      alert('✅ Commande supprimée avec succès !');
      router.push('/orders');
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      alert('❌ Erreur lors de la suppression');
    }
  };

  const exportToExcel = () => {
    exportData('sku', 'xlsx');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'shipping': return <Truck className="h-4 w-4 text-blue-600" />;
      case 'pending_payment': 
      case 'validated': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'draft': return <AlertCircle className="h-4 w-4 text-gray-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getColorClass = (color: string | null) => {
    if (!color) return '';
    
    const colorMap: {[key: string]: string} = {
      'Black': 'bg-gray-800',
      'White': 'bg-gray-100 border',
      'Space Gray': 'bg-gray-600',
      'Silver': 'bg-gray-300',
      'Gold': 'bg-yellow-400',
      'Rose Gold': 'bg-pink-300',
      'Red': 'bg-red-500',
      'Blue': 'bg-blue-500',
      'Green': 'bg-green-500',
      'Purple': 'bg-purple-500',
      'Yellow': 'bg-yellow-500',
      'Pink': 'bg-pink-500',
    };
    
    return colorMap[color] || 'bg-gray-400';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'shipping': return 'bg-blue-100 text-blue-800';
      case 'pending_payment': 
      case 'validated': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getDisplayFunctionality = (functionality: string) => {
    if (functionality === 'Minor Fault') {
      return 'Grades X';
    }
    if (functionality === 'Working') {
      return 'Stockage de base';
    }
    return functionality;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dbc-dark-green mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la commande...</p>
        </div>
      </div>
    );
  }

  if (!orderDetail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Commande introuvable</h1>
          <p className="text-gray-600 mb-4">Cette commande n'existe pas ou vous n'avez pas accès.</p>
          <button
            onClick={() => router.push('/orders')}
            className="px-4 py-2 bg-dbc-dark-green text-white rounded-lg hover:bg-opacity-90"
          >
            Retour aux commandes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50">
      <AppHeader />
      <div className="max-w-[2000px] mx-auto px-8 py-6">
        {/* Navigation */}
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={() => router.push('/catalog')}
            className="text-dbc-light-green hover:text-dbc-dark-green"
          >
            Catalogue
          </button>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <button
            onClick={() => router.push('/orders')}
            className="text-dbc-light-green hover:text-dbc-dark-green"
          >
            Mes commandes
          </button>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <span className="text-gray-900 font-medium">{orderDetail.id}</span>
        </div>

        {/* Retour */}
        <button
          onClick={() => router.push('/orders')}
          className="flex items-center space-x-2 text-dbc-light-green hover:text-dbc-dark-green mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Retour à mes commandes</span>
        </button>

        {/* Informations de la commande */}
        <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2 break-words">
                {orderDetail.name || `Commande ${orderDetail.id}`}
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(orderDetail.status)} w-fit`}>
                  {getStatusIcon(orderDetail.status)}
                  <span>{orderDetail.status_label}</span>
                </span>
                <div className="flex items-center text-xs sm:text-sm text-gray-600">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span className="truncate">Créée le {formatDate(orderDetail.createdAt)}</span>
                </div>
                {orderDetail.tracking_number && (
                  <a
                    href={getFedExTrackingUrl(orderDetail.tracking_number)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-xs sm:text-sm text-blue-700 bg-blue-50/70 px-3 py-1.5 rounded-lg backdrop-blur-sm hover:bg-blue-100/80 hover:text-blue-800 transition-all duration-200 cursor-pointer group border border-blue-200/50 hover:border-blue-300/60 w-fit"
                  >
                    <Truck className="h-3 w-3 sm:h-4 sm:w-4 group-hover:scale-110 transition-transform" />
                    <span className="truncate font-medium">Tracking: {orderDetail.tracking_number}</span>
                    <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:flex-shrink-0">
              {orderDetail.status === 'draft' && (
                <>
                  <button
                    onClick={deleteOrder}
                    className="flex items-center justify-center space-x-1 px-3 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm transition-all duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Supprimer</span>
                  </button>
                  <button
                    onClick={validateOrder}
                    disabled={validating}
                    className="flex items-center justify-center space-x-1 px-3 py-2 bg-white/50 hover:bg-white/70 text-gray-800 hover:text-gray-900 rounded-lg font-semibold transition-all duration-200 text-sm backdrop-blur-md border border-white/60 hover:border-white/80 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {validating ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin" />
                        <span>Validation...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span>Valider</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={exportToExcel}
                    className="flex items-center justify-center space-x-1 px-3 py-2 bg-white/50 hover:bg-white/70 text-gray-800 hover:text-gray-900 rounded-lg transition-all duration-200 text-sm backdrop-blur-md border border-white/60 hover:border-white/80 hover:shadow-md"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Excel</span>
                  </button>
                </>
              )}
              
              {orderDetail.status !== 'draft' && (
                <>
                  <button
                    onClick={() => exportData(viewMode, 'csv')}
                    className="flex items-center justify-center space-x-1 px-3 py-2 bg-white/50 hover:bg-white/70 text-gray-800 hover:text-gray-900 rounded-lg transition-all duration-200 text-sm backdrop-blur-md border border-white/60 hover:border-white/80 hover:shadow-md"
                  >
                    <Download className="h-4 w-4" />
                    <span>CSV</span>
                  </button>
                  <button
                    onClick={() => exportData(viewMode, 'xlsx')}
                    className="flex items-center justify-center space-x-1 px-3 py-2 bg-white/50 hover:bg-white/70 text-gray-800 hover:text-gray-900 rounded-lg transition-all duration-200 text-sm backdrop-blur-md border border-white/60 hover:border-white/80 hover:shadow-md"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Excel</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Afficher la référence client seulement si elle ne commence pas par TRACKING: */}
            {orderDetail.customerRef && !orderDetail.customerRef.startsWith('TRACKING:') && (
              <div>
                <p className="text-sm text-gray-800 mb-1 font-medium">Référence client</p>
                <p className="font-medium text-gray-900">{orderDetail.customerRef}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-800 mb-1 font-medium">Régime TVA</p>
              <p className="text-sm text-gray-700">{orderDetail.vatType}</p>
            </div>
          </div>
        </div>

        {/* Tableau des produits - Version Responsive */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="p-4 border-b bg-gray-50">
            <div className="flex flex-col space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">Détail des produits</h2>
              
              {(orderDetail.status === 'shipping' || orderDetail.status === 'completed') && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Switch vue SKU/IMEI */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setViewMode('sku')}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        viewMode === 'sku' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      SKU
                    </button>
                    <button
                      onClick={() => setViewMode('imei')}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        viewMode === 'imei' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      IMEI
                    </button>
                  </div>

                  {/* Boutons d'export */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => exportData(viewMode, 'csv')}
                      className="flex items-center justify-center space-x-1 px-3 py-2 bg-white/50 hover:bg-white/70 text-gray-800 hover:text-gray-900 rounded-lg transition-all duration-200 text-sm backdrop-blur-md border border-white/60 hover:border-white/80 hover:shadow-md"
                    >
                      <Download className="h-4 w-4" />
                      <span>CSV</span>
                    </button>
                    <button
                      onClick={() => exportData(viewMode, 'xlsx')}
                      className="flex items-center justify-center space-x-1 px-3 py-2 bg-white/50 hover:bg-white/70 text-gray-800 hover:text-gray-900 rounded-lg transition-all duration-200 text-sm backdrop-blur-md border border-white/60 hover:border-white/80 hover:shadow-md"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>Excel</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Contenu responsive sans scroll horizontal */}
          <div>
            {viewMode === 'sku' ? (
              <>
                {/* Vue Mobile - Cards responsive */}
                <div className="block lg:hidden">
                  <div className="space-y-3 p-4">
                    {orderDetail.items.map((item: any) => (
                      <div key={item.sku} className="bg-white rounded border shadow-sm p-3 transition-all duration-200">
                        {/* Header avec SKU et Quantité */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">
                              {item.sku}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-gray-900">Qté: {item.quantity}</div>
                          </div>
                        </div>

                        {/* Nom du produit */}
                        <h3 className="text-sm font-medium text-gray-900 mb-2">
                          {item.name}
                        </h3>

                        {/* Ligne avec états et couleur */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Grade */}
                            <span className={`text-xs font-medium px-1 py-0.5 rounded ${
                              item.appearance?.includes('A+') ? 'bg-purple-100 text-purple-800' :
                              item.appearance?.includes('A') && !item.appearance?.includes('AB') ? 'bg-blue-100 text-blue-800' :
                              item.appearance?.includes('B') ? 'bg-green-100 text-green-800' :
                              item.appearance?.includes('C+') ? 'bg-yellow-100 text-yellow-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {getDisplayAppearance(item.appearance, item.functionality)?.replace('Grade ', '') || ''}
                            </span>

                            {/* Additional Info - seulement si non vide */}
                            {item.additional_info && item.additional_info !== '-' && item.additional_info.trim() && (
                              <span className="text-xs px-1 py-0.5 bg-gray-100 text-gray-700 rounded border">
                                {item.additional_info}
                              </span>
                            )}
                          </div>

                          {/* Couleur */}
                          {item.color && (
                            <div className="flex items-center gap-1">
                              <div className={`w-3 h-3 rounded border-2 border-gray-300 ${getColorClass(item.color)}`} title={item.color}></div>
                              <span className="text-xs text-gray-600">{item.color}</span>
                            </div>
                          )}
                        </div>

                        {/* Prix sur même ligne */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <div className="text-sm">
                            <span className="font-bold text-gray-900">{item.unitPrice.toFixed(2)}€</span>
                            <span className="text-xs text-gray-500 ml-1">DBC</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-gray-900">{item.totalPrice.toFixed(2)}€</div>
                            <div className="text-xs text-gray-500">Total</div>
                          </div>
                        </div>

                        {/* Badge indisponible si nécessaire */}
                        {item.isUnavailable && (
                          <div className="mt-2 inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded w-full justify-center">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Produit non disponible
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vue Desktop - Tableau Responsive (≥1024px) */}
                <div className="hidden lg:block">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produit</th>
                        <th className="hidden xl:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">États</th>
                        <th className="hidden 2xl:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Couleur</th>
                        <th className="hidden 2xl:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Emballage</th>
                        <th className="hidden 2xl:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Infos</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qté</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Prix</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orderDetail.items.map((item: any) => (
                        <tr key={item.sku} className="hover:bg-gray-50 transition-colors">
                          {/* Produit - Toujours visible */}
                          <td className="px-3 py-3">
                            <div className="max-w-xs">
                              <div className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded inline-block mb-1">
                                {item.sku}
                              </div>
                              <div className="text-sm font-medium text-gray-900 line-clamp-2">{item.name}</div>
                              {/* États sur mobile et tablet */}
                              <div className="xl:hidden flex flex-wrap gap-1 mt-1">
                                <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded ${
                                  item.appearance?.includes('A+') ? 'bg-purple-100 text-purple-800' :
                                  item.appearance?.includes('A') && !item.appearance?.includes('AB') ? 'bg-blue-100 text-blue-800' :
                                  item.appearance?.includes('B') ? 'bg-green-100 text-green-800' :
                                  item.appearance?.includes('C+') ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-orange-100 text-orange-800'
                                }`}>
                                  {getDisplayAppearance(item.appearance, item.functionality)?.replace('Grade ', '') || 'N/A'}
                                </span>
                                <span className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800">
                                  {getDisplayFunctionality(item.functionality) || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* États - Visible XL+ */}
                          <td className="hidden xl:table-cell px-3 py-3">
                            <div className="flex flex-wrap gap-1">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                                item.appearance?.includes('A+') ? 'bg-purple-100 text-purple-800' :
                                item.appearance?.includes('A') && !item.appearance?.includes('AB') ? 'bg-blue-100 text-blue-800' :
                                item.appearance?.includes('B') ? 'bg-green-100 text-green-800' :
                                item.appearance?.includes('C+') ? 'bg-yellow-100 text-yellow-800' :
                                'bg-orange-100 text-orange-800'
                              }`}>
                                {getDisplayAppearance(item.appearance, item.functionality)?.replace('Grade ', '') || 'N/A'}
                              </span>
                            </div>
                          </td>

                          {/* Couleur - Visible 2XL+ */}
                          <td className="hidden 2xl:table-cell px-3 py-3">
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full border ${getColorClass(item.color)}`}></div>
                              <span className="text-sm text-gray-900">{item.color || 'N/A'}</span>
                            </div>
                          </td>

                          {/* Emballage - Visible 2XL+ */}
                          <td className="hidden 2xl:table-cell px-3 py-3 text-sm text-gray-900">
                            {item.boxed || 'N/A'}
                          </td>

                          {/* Infos - Visible 2XL+ */}
                          <td className="hidden 2xl:table-cell px-3 py-3 text-sm text-gray-800 max-w-32 truncate">
                            {item.additional_info && item.additional_info !== '-' ? item.additional_info : 'N/A'}
                          </td>

                          {/* Quantité - Toujours visible */}
                          <td className="px-3 py-3 text-center">
                            <span className="text-sm font-medium text-gray-900 bg-gray-50 px-2 py-1 rounded">
                              {item.quantity}
                            </span>
                          </td>

                          {/* Prix unitaire - Toujours visible */}
                          <td className="px-3 py-3 text-right text-sm font-medium text-gray-900">
                            {item.unitPrice.toFixed(2)}€
                          </td>

                          {/* Total - Toujours visible */}
                          <td className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
                            {item.totalPrice.toFixed(2)}€
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              // Vue IMEI - Version Responsive
              <>
                {/* Vue Mobile IMEI - Cards responsive */}
                <div className="block lg:hidden">
                  {imeiData.length > 0 ? (
                    <div className="space-y-3 p-4">
                      {imeiData.map((imei: any) => (
                        <div key={imei.imei} className="bg-white rounded border shadow-sm p-3 transition-all duration-200">
                          {/* Header avec SKU, IMEI et Prix */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 overflow-hidden">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                  {imei.sku}
                                </div>
                                <div className="text-sm font-mono text-purple-600 bg-purple-50 px-2 py-1 rounded">
                                  {imei.imei}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-gray-900">{imei.dbc_price.toFixed(2)}€</div>
                              <div className="text-xs text-gray-500">DBC</div>
                            </div>
                          </div>

                          {/* Nom du produit */}
                          <h3 className="text-sm font-medium text-gray-900 mb-2">
                            {imei.product_name}
                          </h3>

                          {/* Ligne avec états et couleur */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Grade */}
                              <span className={`text-xs font-medium px-1 py-0.5 rounded ${
                                imei.appearance?.includes('A+') ? 'bg-purple-100 text-purple-800' :
                                imei.appearance?.includes('A') && !imei.appearance?.includes('AB') ? 'bg-blue-100 text-blue-800' :
                                imei.appearance?.includes('B') ? 'bg-green-100 text-green-800' :
                                imei.appearance?.includes('C+') ? 'bg-yellow-100 text-yellow-800' :
                                'bg-orange-100 text-orange-800'
                              }`}>
                                {getDisplayAppearance(imei.appearance, imei.functionality)?.replace('Grade ', '') || ''}
                              </span>
                            </div>

                            {/* Couleur */}
                            {imei.color && (
                              <div className="flex items-center gap-1">
                                <div className={`w-3 h-3 rounded border-2 border-gray-300 ${getColorClass(imei.color)}`} title={imei.color}></div>
                                <span className="text-xs text-gray-600">{imei.color}</span>
                              </div>
                            )}
                          </div>

                          {/* Info supplémentaire */}
                          {imei.additional_info && (
                            <div className="mt-2">
                              <span className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                                {imei.additional_info}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Aucun IMEI trouvé pour cette commande.</p>
                    </div>
                  )}
                </div>

                {/* Vue Desktop IMEI - Tableau Responsive (≥1024px) */}
                <div className="hidden lg:block">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IMEI</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produit</th>
                        <th className="hidden xl:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">États</th>
                        <th className="hidden 2xl:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Couleur</th>
                        <th className="hidden 2xl:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Emballage</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Prix DBC</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {imeiData.length > 0 ? (
                        imeiData.map((imei: any) => (
                          <tr key={imei.imei} className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-3 text-sm font-mono text-blue-600">{imei.sku}</td>
                            <td className="px-3 py-3 text-sm font-mono text-purple-600">{imei.imei}</td>
                            <td className="px-3 py-3">
                              <div className="text-sm text-gray-900 font-medium line-clamp-2">{imei.product_name}</div>
                              {/* États sur mobile et tablet */}
                              <div className="xl:hidden flex flex-wrap gap-1 mt-1">
                                <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded ${
                                  imei.appearance?.includes('A+') ? 'bg-purple-100 text-purple-800' :
                                  imei.appearance?.includes('A') && !imei.appearance?.includes('AB') ? 'bg-blue-100 text-blue-800' :
                                  imei.appearance?.includes('B') ? 'bg-green-100 text-green-800' :
                                  imei.appearance?.includes('C+') ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-orange-100 text-orange-800'
                                }`}>
                                  {getDisplayAppearance(imei.appearance, imei.functionality)?.replace('Grade ', '') || ''}
                                </span>
                              </div>
                            </td>
                            <td className="hidden xl:table-cell px-3 py-3">
                              <div className="flex flex-wrap gap-1">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                                  imei.appearance?.includes('A+') ? 'bg-purple-100 text-purple-800' :
                                  imei.appearance?.includes('A') && !imei.appearance?.includes('AB') ? 'bg-blue-100 text-blue-800' :
                                  imei.appearance?.includes('B') ? 'bg-green-100 text-green-800' :
                                  imei.appearance?.includes('C+') ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-orange-100 text-orange-800'
                                }`}>
                                  {getDisplayAppearance(imei.appearance, imei.functionality)?.replace('Grade ', '') || ''}
                                </span>
                                {imei.additional_info && (
                                  <span className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                                    {imei.additional_info}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="hidden 2xl:table-cell px-3 py-3">
                              <div className="flex items-center space-x-2">
                                <div className={`w-3 h-3 rounded-full border ${getColorClass(imei.color)}`}></div>
                                <span className="text-sm text-gray-900">{imei.color || '-'}</span>
                              </div>
                            </td>
                            <td className="hidden 2xl:table-cell px-3 py-3 text-sm text-gray-900">{imei.boxed}</td>
                            <td className="px-3 py-3 text-sm text-right font-semibold text-gray-900">{imei.dbc_price.toFixed(2)}€</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                            <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                            <p>Aucun IMEI trouvé pour cette commande.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Récapitulatif */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="max-w-xs ml-auto">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-800">Total ({orderDetail.totalItems} articles)</span>
                <span className="font-medium text-gray-900">{orderDetail.totalAmount.toFixed(2)}€</span>
              </div>
              <div className="text-xs text-gray-700">
                Bien d'occasion - TVA calculée sur la marge, non récupérable
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-semibold text-gray-900">Total HT</span>
                <span className="font-bold text-lg text-gray-900">{orderDetail.totalAmount.toFixed(2)}€</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(ClientOrderDetailPage, 'client');