'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth, withAuth } from '../../../../../lib/auth-context';
import AppHeader from '@/components/AppHeader';
import { supabase, Product, orderService } from '../../../../../lib/supabase';
import { calculateShippingCost } from '../../../../../lib/shipping';
import { 
  User, 
  LogOut, 
  ShoppingCart,
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
  Plus,
  Minus,
  Trash2,
  Check,
  FileSpreadsheet,
  Edit,
  Eye,
  ExternalLink
} from 'lucide-react';

function AdminOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const orderId = params.id as string;

  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editableQuantities, setEditableQuantities] = useState<{[key: string]: number}>({});
  const [editablePrices, setEditablePrices] = useState<{[key: string]: number}>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [validating, setValidating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [originalOrderItems, setOriginalOrderItems] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'sku' | 'imei'>('sku');
  const [imeiData, setImeiData] = useState<any[]>([]);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');

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
            currentStock: product.quantity, // Ajouter le stock actuel
            supplierPrice: product.price || 0 // Ajouter le prix fournisseur
          };
        } else {
          // Si le produit n'est pas dans le catalogue actuel, essayer de récupérer ses infos depuis Supabase
          console.warn('⚠️ Produit non trouvé dans le catalogue actuel:', orderItem.sku);
          console.log('🔍 Tentative de récupération depuis Supabase...');
          
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
            supplierPrice: 0,
            isUnavailable: true
          };
        }
      }) || [];

      console.log('📦 Items trouvés:', items.length);

              const freeShipping = supabaseOrder.free_shipping === true;
        
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
        shippingCost: freeShipping ? 0 : calculateShippingCost(supabaseOrder.total_items),
        freeShipping: freeShipping,
        customerRef: supabaseOrder.customer_ref,
        vatType: supabaseOrder.vat_type,
        source: 'supabase'
      });

      // Initialiser les quantités et prix éditables avec les valeurs actuelles
      const quantities = items.reduce((acc: any, item: any) => {
        acc[item.sku] = item.quantity;
        return acc;
      }, {});
      const prices = items.reduce((acc: any, item: any) => {
        acc[item.sku] = item.unitPrice;
        return acc;
      }, {});
      setEditableQuantities(quantities);
      setEditablePrices(prices);

      // Sauvegarder les items originaux pour les éditions
      setOriginalOrderItems(items.map((item: any) => ({
        sku: item.sku,
        quantity: item.quantity,
        product_name: item.name,
        unit_price: item.unitPrice
      })));

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

  const updateQuantity = (sku: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setEditableQuantities(prev => ({
      ...prev,
      [sku]: newQuantity
    }));

    // Mettre à jour orderDetail directement
    if (orderDetail) {
      const updatedItems = orderDetail.items.map((item: any) => 
        item.sku === sku ? { ...item, quantity: newQuantity } : item
      );
      
      const totalItems = updatedItems.reduce((sum: number, item: any) => 
        sum + (editableQuantities[item.sku] === undefined ? item.quantity : editableQuantities[item.sku]), 0
      );

      const totalAmount = updatedItems.reduce((sum: number, item: any) => {
        const qty = editableQuantities[item.sku] === undefined ? item.quantity : editableQuantities[item.sku];
        const price = editablePrices[item.sku] === undefined ? item.unitPrice : editablePrices[item.sku];
        return sum + (qty * price);
      }, 0);

      setOrderDetail((prev: any) => ({
        ...prev,
        items: updatedItems,
        totalItems,
        totalAmount
      }));
    }
  };

  const updatePrice = (sku: string, newPrice: number) => {
    if (newPrice < 0) return;
    
    setEditablePrices(prev => ({
      ...prev,
      [sku]: newPrice
    }));

    // Mettre à jour orderDetail directement
    if (orderDetail) {
      const updatedItems = orderDetail.items.map((item: any) => 
        item.sku === sku ? { ...item, unitPrice: newPrice } : item
      );
      
      const totalAmount = updatedItems.reduce((sum: number, item: any) => {
        const qty = editableQuantities[item.sku] === undefined ? item.quantity : editableQuantities[item.sku];
        const price = editablePrices[item.sku] === undefined ? item.unitPrice : editablePrices[item.sku];
        return sum + (qty * price);
      }, 0);

      setOrderDetail((prev: any) => ({
        ...prev,
        items: updatedItems,
        totalAmount
      }));
    }
  };

  const removeItem = (sku: string) => {
    if (!orderDetail) return;
    
    const updatedItems = orderDetail.items.filter((item: any) => item.sku !== sku);
    
    // Recalculer totaux
    const totalItems = updatedItems.length;
    const totalAmount = updatedItems.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
    
    setOrderDetail((prev: any) => ({
      ...prev,
      items: updatedItems,
      totalItems,
      totalAmount
    }));
    
    // Nettoyer les états
    setEditableQuantities(prev => {
      const newQuantities = { ...prev };
      delete newQuantities[sku];
      return newQuantities;
    });
    
    setEditablePrices(prev => {
      const newPrices = { ...prev };
      delete newPrices[sku];
      return newPrices;
    });
  };

  // Charger les données IMEI pour une commande
  const loadImeiData = async () => {
    if (!orderDetail) return;

    try {
      console.log('📱 Chargement des IMEI pour commande:', orderDetail.id);
      
      const { data: imei, error } = await supabase
        .from('order_item_imei')
        .select(`
          *,
          order_items!inner(order_id)
        `)
        .eq('order_items.order_id', orderDetail.id)
        .order('sku');

      if (error) {
        console.error('❌ Erreur chargement IMEI:', error);
        return;
      }

      console.log(`✅ ${imei?.length || 0} IMEI trouvés`);
      setImeiData(imei || []);
    } catch (error) {
      console.error('❌ Erreur chargement IMEI:', error);
    }
  };

  const validateOrder = async () => {
    if (!orderDetail) return;

    try {
      setValidating(true);
      console.log('✅ Validation commande:', orderDetail.id);
      
      const editedItems = orderDetail.items.map((item: any) => ({
        sku: item.sku,
        quantity: editableQuantities[item.sku] || item.quantity,
        product_name: item.name,
        unit_price: editablePrices[item.sku] || item.unitPrice
      }));

      const totalItems = editedItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
      const totalAmount = editedItems.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);

      const response = await fetch(`/api/orders/${orderDetail.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: editedItems,
          totalItems,
          totalAmount,
          status: 'pending_payment'
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la validation');
      }

      setOrderDetail((prev: any) => ({
        ...prev,
        status: 'pending_payment',
        status_label: 'En attente de paiement',
        totalItems,
        totalAmount
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
      router.push('/admin/orders');
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      alert('❌ Erreur lors de la suppression');
    }
  };

  // Import des IMEI
  const handleImeiImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      console.log('📱 Import IMEI pour commande:', orderDetail.id);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/orders/${orderDetail.id}/imei`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      console.log('✅ Import IMEI réussi:', data);
      
      // Recharger les détails de la commande et les IMEI
      await loadOrderDetail();
      await loadImeiData();
      
      // Afficher la modal de tracking après import réussi
      setShowShippingModal(true);
      
      alert(`✅ Import IMEI réussi: ${data.summary?.totalImei || 0} IMEI ajoutés`);

    } catch (error) {
      console.error('❌ Erreur import IMEI:', error);
      alert(`❌ ${error instanceof Error ? error.message : 'Erreur import IMEI'}`);
    }

    // Reset l'input file
    event.target.value = '';
  };

  // Mise à jour des informations de livraison
  const updateShipping = async () => {
    if (!trackingNumber.trim()) {
      alert('Veuillez saisir un numéro de tracking');
      return;
    }

    try {
      console.log('🚚 Mise à jour tracking:', trackingNumber);

      const response = await fetch(`/api/orders/${orderDetail.id}/shipping`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tracking_number: trackingNumber,
          status: 'shipping'
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      console.log('✅ Tracking mis à jour:', data);
      
      // Mettre à jour l'état local
      setOrderDetail({
        ...orderDetail,
        status: 'shipping',
        status_label: 'En cours de livraison',
        tracking_number: trackingNumber
      });

      setShowShippingModal(false);
      setTrackingNumber('');
      
      alert('✅ Informations de livraison mises à jour');

    } catch (error) {
      console.error('❌ Erreur mise à jour tracking:', error);
      alert(`❌ ${error instanceof Error ? error.message : 'Erreur mise à jour tracking'}`);
    }
  };

  // Finaliser la commande (passer en completed)
  const markAsCompleted = async () => {
    if (!orderDetail) return;

    try {
      const response = await fetch(`/api/orders/${orderDetail.id}/shipping`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tracking_number: orderDetail.tracking_number || '',
          status: 'completed'
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setOrderDetail({
        ...orderDetail,
        status: 'completed',
        status_label: 'Terminée'
      });

      alert('✅ Commande marquée comme terminée !');
    } catch (error) {
      console.error('❌ Erreur finalisation:', error);
      alert('❌ Erreur lors de la finalisation');
    }
  };

  const toggleFreeShipping = async () => {
    if (!orderDetail) return;

    const newFreeShipping = !orderDetail.freeShipping;
    
    try {
      console.log('🚚 Toggle free shipping:', {
        orderId: orderDetail.id,
        currentState: orderDetail.freeShipping,
        newState: newFreeShipping
      });

      const response = await fetch(`/api/orders/${orderDetail.id}/free-shipping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          freeShipping: newFreeShipping
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la modification de la livraison');
      }

      const result = await response.json();
      console.log('✅ API Response:', result);

      // Recharger les données depuis l'API pour forcer la mise à jour
      await loadOrderDetail();

      alert(`✅ ${result.message}`);
    } catch (error) {
      console.error('❌ Erreur:', error);
      alert('❌ Erreur lors de la modification de la livraison');
    }
  };

  // Export des données
  const exportData = async (type: 'sku' | 'imei', format: 'csv' | 'xlsx') => {
    try {
      console.log(`📊 Export ${type} en ${format}`);
      
      const response = await fetch(`/api/orders/${orderDetail.id}/export?type=${type}&format=${format}`);
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      // Télécharger le fichier
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `commande_${orderDetail.name}_${type}_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('✅ Export terminé');
    } catch (error) {
      console.error('❌ Erreur export:', error);
      alert(`❌ ${error instanceof Error ? error.message : 'Erreur export'}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Edit className="h-4 w-4" />;
      case 'pending_payment': return <Clock className="h-4 w-4" />;
      case 'shipping': return <Truck className="h-4 w-4" />;
      case 'completed': return <Check className="h-4 w-4" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getColorClass = (color: string | null) => {
    if (!color) return 'bg-gray-200 border-gray-300';
    
    switch (color.toLowerCase()) {
      case 'black': return 'bg-gray-800 border-gray-300';
      case 'white': return 'bg-white border-gray-300';
      case 'gold': return 'bg-yellow-300 border-yellow-400';
      case 'silver': return 'bg-gray-300 border-gray-400';
      case 'blue': return 'bg-blue-500 border-blue-600';
      case 'red': return 'bg-red-500 border-red-600';
      case 'green': return 'bg-green-500 border-green-600';
      case 'purple': return 'bg-purple-500 border-purple-600';
      case 'pink': return 'bg-pink-500 border-pink-600';
      case 'grey': case 'gray': return 'bg-gray-400 border-gray-500';
      default: return 'bg-gray-200 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending_payment': return 'bg-yellow-100 text-yellow-800';
      case 'validated': return 'bg-blue-100 text-blue-800';
      case 'shipping': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDisplayAppearance = (appearance: string, functionality: string) => {
    if (functionality === 'Minor Fault') {
      // Ajouter 'x' minuscule après le grade pour les Minor Fault
      // Gérer différents formats: "Grade C", "C", "Grade BC", "BC", etc.
      
      // Cas 1: Format "Grade X..." 
      const gradeMatch = appearance.match(/^(Grade [A-Z]+)(\+?)/i);
      if (gradeMatch) {
        const grade = gradeMatch[1]; // "Grade C"
        const plus = gradeMatch[2] || ''; // "+" ou ""
        const rest = appearance.substring(grade.length + plus.length).trim();
        return rest ? `${grade}x${plus} ${rest}` : `${grade}x${plus}`;
      }
      
      // Cas 2: Format simple "C...", "BC...", etc.
      const simpleGradeMatch = appearance.match(/^([A-Z]+)(\+?)(\s+.*)?$/i);
      if (simpleGradeMatch) {
        const grade = simpleGradeMatch[1]; // "C" ou "BC"
        const plus = simpleGradeMatch[2] || ''; // "+" ou ""
        const rest = simpleGradeMatch[3] || ''; // " reduced battery performance" ou ""
        return rest ? `${grade}x${plus}${rest}` : `${grade}x${plus}`;
      }
    }
    // Pour Working ou si pas de grade détecté, retourner tel quel
    return appearance;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dbc-light-green mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la commande...</p>
        </div>
      </div>
    );
  }

  if (!orderDetail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Commande introuvable</h3>
          <p className="text-gray-600 mb-4">Cette commande n'existe pas ou a été supprimée</p>
          <button
            onClick={() => router.push('/admin/orders')}
            className="bg-gradient-to-r from-dbc-bright-green to-emerald-400 text-dbc-dark-green py-2 px-6 rounded-xl hover:from-emerald-300 hover:to-emerald-500 hover:text-white font-semibold shadow-lg backdrop-blur-sm transition-all duration-200"
          >
            Retour aux commandes
          </button>
        </div>
      </div>
    );
  }

  const handleManualEdit = () => {
    setIsEditing(true);
  };

  const revalidateOrder = async () => {
    if (!orderDetail) return;

    try {
      setValidating(true);
      console.log('🔄 Revalidation commande:', orderDetail.id);
      
      const editedItems = orderDetail.items.map((item: any) => ({
        sku: item.sku,
        quantity: editableQuantities[item.sku] || item.quantity,
        product_name: item.name,
        unit_price: editablePrices[item.sku] || item.unitPrice
      }));

      const totalItems = editedItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
      const totalAmount = editedItems.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);

      const response = await fetch(`/api/orders/${orderDetail.id}/validate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: editedItems,
          totalItems,
          totalAmount,
          revalidation: true
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la revalidation');
      }

      setOrderDetail((prev: any) => ({
        ...prev,
        items: editedItems.map((editedItem: any, index: number) => ({
          ...prev.items[index],
          quantity: editedItem.quantity,
          unitPrice: editedItem.unit_price,
          totalPrice: editedItem.quantity * editedItem.unit_price
        })),
        totalItems,
        totalAmount
      }));

      setIsEditing(false);
      alert('✅ Commande revalidée avec succès !');
    } catch (error) {
      console.error('❌ Erreur revalidation:', error);
      alert('❌ Erreur lors de la revalidation');
    } finally {
      setValidating(false);
    }
  };

  const downloadInvoice = () => {
    // Ouvrir la facture dans un nouvel onglet (l'API génère du HTML avec auto-print)
    window.open(`/api/orders/${orderDetail.id}/invoice`, '_blank');
  };

  const exportToExcel = () => {
    // Utiliser l'API export existante avec le mode SKU et format Excel
    window.open(`/api/orders/${orderDetail.id}/export?type=sku&format=xlsx`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50">
      <AppHeader />
      <div className="max-w-[2000px] mx-auto px-8 py-6">
        {/* Navigation */}
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={() => router.push('/admin/catalog')}
            className="text-dbc-light-green hover:text-dbc-dark-green"
          >
            Catalogue
          </button>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <button
            onClick={() => router.push('/admin/orders')}
            className="text-dbc-light-green hover:text-dbc-dark-green"
          >
            Commandes
          </button>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <span className="text-gray-900 font-medium">{orderDetail.id}</span>
        </div>

        {/* Retour */}
        <button
          onClick={() => router.push('/admin/orders')}
          className="flex items-center space-x-2 text-dbc-light-green hover:text-dbc-dark-green mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Retour aux commandes</span>
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
              {orderDetail.customerRef && orderDetail.customerRef.startsWith('TRACKING:') && (
                <a
                  href={getFedExTrackingUrl(orderDetail.customerRef.replace('TRACKING:', ''))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-xs sm:text-sm text-blue-700 bg-blue-50/70 px-3 py-1.5 rounded-lg backdrop-blur-sm hover:bg-blue-100/80 hover:text-blue-800 transition-all duration-200 cursor-pointer group border border-blue-200/50 hover:border-blue-300/60 w-fit"
                >
                  <Truck className="h-3 w-3 sm:h-4 sm:w-4 group-hover:scale-110 transition-transform" />
                  <span className="truncate font-medium">{orderDetail.customerRef.replace('TRACKING:', '')}</span>
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
                    className="flex items-center justify-center space-x-1 px-3 py-2 bg-gradient-to-r from-dbc-bright-green to-emerald-400 text-dbc-dark-green rounded-lg hover:from-emerald-300 hover:to-emerald-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-200 text-sm"
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
                    className="flex items-center justify-center space-x-1 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-all duration-200 text-sm"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Excel</span>
                  </button>
                </>
              )}
              
              {orderDetail.status !== 'draft' && (
                <>
                  {/* Boutons facture et export - disponibles pour toutes les commandes validées */}
                  <button 
                    onClick={downloadInvoice}
                    className="flex items-center justify-center space-x-1 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 text-sm transition-all duration-200"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Facture</span>
                  </button>
                  
                  <button
                    onClick={exportToExcel}
                    className="flex items-center justify-center space-x-1 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-all duration-200 text-sm"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Excel</span>
                  </button>

                  {/* Boutons de progression du workflow */}
                  {orderDetail.status === 'pending_payment' && (
                    <label className="flex items-center justify-center space-x-1 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer text-sm text-gray-700 transition-all duration-200">
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleImeiImport}
                        className="hidden"
                      />
                      <Truck className="h-4 w-4" />
                      <span>Importer IMEI</span>
                    </label>
                  )}

                  {orderDetail.status === 'shipping' && (
                    <button
                      onClick={markAsCompleted}
                      className="flex items-center justify-center space-x-1 px-3 py-2 bg-gradient-to-r from-dbc-bright-green to-emerald-400 text-dbc-dark-green rounded-lg hover:from-emerald-300 hover:to-emerald-500 hover:text-white font-semibold transition-all duration-200 text-sm"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Terminée</span>
                    </button>
                  )}

                  {/* Bouton d'édition manuelle pour commandes en attente de paiement */}
                  {orderDetail.status === 'pending_payment' && !isEditing && (
                    <button
                      onClick={handleManualEdit}
                      className="flex items-center justify-center space-x-1 px-3 py-2 bg-white border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50 text-sm transition-all duration-200"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Éditer</span>
                    </button>
                  )}

                  {/* Bouton de revalidation si en cours d'édition */}
                  {isEditing && (
                    <button
                      onClick={revalidateOrder}
                      disabled={validating}
                      className="flex items-center justify-center space-x-1 px-3 py-2 bg-gradient-to-r from-dbc-bright-green to-emerald-400 text-dbc-dark-green rounded-lg hover:from-emerald-300 hover:to-emerald-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-200 text-sm"
                    >
                      {validating ? (
                        <>
                          <Clock className="h-4 w-4 animate-spin" />
                          <span>Revalidation...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          <span>Revalider</span>
                        </>
                      )}
                    </button>
                  )}
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
              
              {(orderDetail.status === 'pending_payment' || orderDetail.status === 'shipping' || orderDetail.status === 'completed') && (
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
                      className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>CSV</span>
                    </button>
                    <button
                      onClick={() => exportData(viewMode, 'xlsx')}
                      className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
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
                        {/* Header avec SKU, Quantité et Actions */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">
                              {item.sku}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-bold text-gray-900">
                              Qté: {isEditing ? editableQuantities[item.sku] : item.quantity}
                            </div>
                            {orderDetail.status === 'draft' && (
                              <button
                                onClick={() => removeItem(item.sku)}
                                className="p-1 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded transition-colors border border-red-200"
                                title="Supprimer ce produit"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Nom du produit */}
                        <h3 className="text-sm font-medium text-gray-900 mb-2">
                          {item.name}
                        </h3>

                        {/* Ligne avec états et couleur */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Grade */}
                            <span className={`text-xs font-medium px-1 py-0.5 rounded ${
                              item.appearance?.includes('A+') ? 'bg-purple-100 text-purple-800' :
                              item.appearance?.includes('A') && !item.appearance?.includes('AB') ? 'bg-blue-100 text-blue-800' :
                              item.appearance?.includes('B') ? 'bg-green-100 text-green-800' :
                              item.appearance?.includes('C+') ? 'bg-yellow-100 text-yellow-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {getDisplayAppearance(item.appearance, item.functionality)?.replace('Grade ', '') || 'N/A'}
                            </span>
                            
                            {/* Additional info juste à droite du grade */}
                            {item.additional_info && item.additional_info !== '-' && item.additional_info !== 'Produit épuisé ou non disponible' && (
                              <span className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                                {item.additional_info}
                              </span>
                            )}
                          </div>

                          {/* Couleur */}
                          {item.color && item.color !== 'N/A' && (
                            <div className="flex items-center gap-1">
                              <div className={`w-3 h-3 rounded border-2 border-gray-300 ${getColorClass(item.color)}`} title={item.color}></div>
                              <span className="text-xs text-gray-600">{item.color}</span>
                            </div>
                          )}
                        </div>

                        {/* Prix et marge sur même ligne */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <div className="text-sm space-x-2">
                            {item.supplierPrice && (
                              <>
                                <span className="font-bold text-blue-600">{item.supplierPrice.toFixed(2)}€</span>
                                <span className="text-xs text-gray-500">FX</span>
                              </>
                            )}
                            <span className="font-bold text-gray-900">
                              {isEditing ? (editablePrices[item.sku] || item.unitPrice).toFixed(2) : item.unitPrice.toFixed(2)}€
                            </span>
                            <span className="text-xs text-gray-500">DBC</span>
                          </div>
                          <div className="text-right text-sm">
                            {item.supplierPrice && item.unitPrice && (
                              <>
                                <span className="font-bold text-green-600">
                                  +{((isEditing ? editablePrices[item.sku] || item.unitPrice : item.unitPrice) - item.supplierPrice).toFixed(2)}€
                                </span>
                                <span className="text-xs text-gray-500 ml-1">Marge</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Total */}
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900">
                            {((isEditing ? editablePrices[item.sku] || item.unitPrice : item.unitPrice) * (isEditing ? editableQuantities[item.sku] : item.quantity)).toFixed(2)}€
                          </div>
                          <div className="text-xs text-gray-500">Total</div>
                        </div>

                        {/* Contrôles d'édition pour brouillons */}
                        {(orderDetail.status === 'draft' || isEditing) && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            {/* Contrôles quantité améliorés */}
                            <div className="flex items-center justify-center gap-2 bg-gray-50 rounded-lg p-3">
                              <button
                                onClick={() => updateQuantity(item.sku, (isEditing ? editableQuantities[item.sku] : item.quantity) - 1)}
                                className="flex items-center justify-center w-10 h-10 bg-white text-red-600 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors shadow-sm border border-gray-200 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={(isEditing ? editableQuantities[item.sku] : item.quantity) <= 1}
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <div className="mx-3 px-4 py-2 bg-white rounded-lg border border-gray-200 min-w-[3rem] shadow-sm">
                                <span className="text-lg font-bold text-gray-900 text-center block">
                                  {isEditing ? editableQuantities[item.sku] : item.quantity}
                                </span>
                              </div>
                              <button
                                onClick={() => updateQuantity(item.sku, (isEditing ? editableQuantities[item.sku] : item.quantity) + 1)}
                                className="flex items-center justify-center w-10 h-10 bg-white text-green-600 rounded-lg hover:bg-green-50 hover:text-green-700 transition-colors shadow-sm border border-gray-200 hover:border-green-300"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}

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
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Produit</th>
                        <th className="hidden xl:table-cell px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">États</th>
                        <th className="hidden 2xl:table-cell px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Couleur</th>
                        <th className="hidden 2xl:table-cell px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Emballage</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Qté</th>
                        <th className="hidden xl:table-cell px-3 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Prix fourn.</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Prix DBC</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Total</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
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
                                
                                {/* Additional info juste à droite du grade */}
                                {item.additional_info && item.additional_info !== '-' && item.additional_info !== 'Produit épuisé ou non disponible' && (
                                  <span className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                                    {item.additional_info}
                                  </span>
                                )}
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
                              
                              {/* Additional info juste à droite du grade sur desktop */}
                              {item.additional_info && item.additional_info !== '-' && item.additional_info !== 'Produit épuisé ou non disponible' && (
                                <span className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                                  {item.additional_info}
                                </span>
                              )}
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

                          {/* Quantité - Toujours visible */}
                          <td className="px-3 py-3 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  onClick={() => updateQuantity(item.sku, editableQuantities[item.sku] - 1)}
                                  className="p-1 text-gray-600 hover:text-gray-800"
                                  disabled={editableQuantities[item.sku] <= 1}
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="text-sm font-medium w-8 text-center text-gray-900">
                                  {editableQuantities[item.sku]}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.sku, editableQuantities[item.sku] + 1)}
                                  className="p-1 text-gray-600 hover:text-gray-800"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-sm font-medium text-gray-900 bg-gray-50 px-2 py-1 rounded">
                                {item.quantity}
                              </span>
                            )}
                          </td>

                          {/* Prix fournisseur - Visible XL+ */}
                          <td className="hidden xl:table-cell px-3 py-3 text-sm text-right font-medium text-gray-600">
                            {item.supplierPrice?.toFixed(2) || '0.00'}€
                          </td>

                          {/* Prix DBC - Toujours visible */}
                          <td className="px-3 py-3 text-right">
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editablePrices[item.sku]?.toFixed(2) || item.unitPrice.toFixed(2)}
                                onChange={(e) => updatePrice(item.sku, parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1 text-right border border-gray-300 rounded text-sm"
                              />
                            ) : (
                              <div className="text-sm font-medium text-gray-900">
                                {item.unitPrice.toFixed(2)}€
                              </div>
                            )}
                          </td>

                          {/* Total - Toujours visible */}
                          <td className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
                            {((editablePrices[item.sku] || item.unitPrice) * editableQuantities[item.sku]).toFixed(2)}€
                          </td>

                          {/* Actions - Toujours visible */}
                          <td className="px-3 py-3 text-center">
                            {orderDetail.status === 'draft' && (
                              <button
                                onClick={() => removeItem(item.sku)}
                                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                title="Supprimer ce produit"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
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
                        <div key={imei.id} className="bg-white rounded border shadow-sm p-3 transition-all duration-200">
                          {/* Header avec SKU et IMEI */}
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
                          </div>

                          {/* Nom du produit */}
                          <h3 className="text-sm font-medium text-gray-900 mb-2">
                            {imei.product_name}
                          </h3>

                          {/* Ligne avec états et couleur */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Grade */}
                              <span className={`text-xs font-medium px-1 py-0.5 rounded ${
                                imei.appearance?.includes('A+') ? 'bg-purple-100 text-purple-800' :
                                imei.appearance?.includes('A') && !imei.appearance?.includes('AB') ? 'bg-blue-100 text-blue-800' :
                                imei.appearance?.includes('B') ? 'bg-green-100 text-green-800' :
                                imei.appearance?.includes('C+') ? 'bg-yellow-100 text-yellow-800' :
                                'bg-orange-100 text-orange-800'
                              }`}>
                                {getDisplayAppearance(imei.appearance, imei.functionality)?.replace('Grade ', '') || 'N/A'}
                              </span>
                              
                              {/* Additional info juste à droite du grade */}
                              {imei.additional_info && imei.additional_info !== '-' && imei.additional_info !== 'Produit épuisé ou non disponible' && (
                                <span className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                                  {imei.additional_info}
                                </span>
                              )}
                            </div>

                            {/* Couleur */}
                            {imei.color && (
                              <div className="flex items-center gap-1">
                                <div className={`w-3 h-3 rounded border-2 border-gray-300 ${getColorClass(imei.color)}`} title={imei.color}></div>
                                <span className="text-xs text-gray-600">{imei.color}</span>
                              </div>
                            )}
                          </div>

                          {/* Prix et marge sur même ligne */}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                            <div className="text-sm space-x-2">
                              <span className="font-bold text-blue-600">{imei.supplier_price.toFixed(2)}€</span>
                              <span className="text-xs text-gray-500">FX</span>
                              <span className="font-bold text-gray-900">{imei.dbc_price.toFixed(2)}€</span>
                              <span className="text-xs text-gray-500">DBC</span>
                            </div>
                            <div className="text-right text-sm">
                              <span className="font-bold text-green-600">+{(imei.dbc_price - imei.supplier_price).toFixed(2)}€</span>
                              <span className="text-xs text-gray-500 ml-1">Marge</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Aucun IMEI trouvé pour cette commande.</p>
                      {orderDetail.status === 'pending_payment' && (
                        <p className="text-sm mt-2">Importez les IMEI pour passer en livraison.</p>
                      )}
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
                        <th className="hidden xl:table-cell px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Prix fourn.</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Prix DBC</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {imeiData.length > 0 ? (
                        imeiData.map((imei: any) => (
                          <tr key={imei.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-3 text-sm font-mono text-blue-600">{imei.sku}</td>
                            <td className="px-3 py-3 text-sm font-mono text-purple-600">{imei.imei}</td>
                            <td className="px-3 py-3">
                              <div className="text-sm text-gray-900 font-medium line-clamp-2">{imei.product_name}</div>
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
                                  {getDisplayAppearance(imei.appearance, imei.functionality)?.replace('Grade ', '') || 'N/A'}
                                </span>
                                
                                {/* Additional info juste à droite du grade */}
                                {imei.additional_info && imei.additional_info !== '-' && imei.additional_info !== 'Produit épuisé ou non disponible' && (
                                  <span className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                                    {imei.additional_info}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="hidden 2xl:table-cell px-3 py-3">
                              <div className="flex items-center space-x-2">
                                <div className={`w-3 h-3 rounded-full border ${getColorClass(imei.color)}`}></div>
                                <span className="text-sm text-gray-900">{imei.color || 'N/A'}</span>
                              </div>
                            </td>
                            <td className="hidden 2xl:table-cell px-3 py-3 text-sm text-gray-900">{imei.boxed}</td>
                            <td className="hidden xl:table-cell px-3 py-3 text-sm text-right font-medium text-gray-600">{imei.supplier_price.toFixed(2)}€</td>
                            <td className="px-3 py-3 text-right">
                              <div className="text-sm font-semibold text-gray-900">
                                {imei.dbc_price.toFixed(2)}€
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                            <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                            <p>Aucun IMEI trouvé pour cette commande.</p>
                            {orderDetail.status === 'pending_payment' && (
                              <p className="text-sm mt-2">Importez les IMEI pour passer en livraison.</p>
                            )}
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
                <span className="text-gray-800">Produits ({orderDetail.totalItems} articles)</span>
                <span className="font-medium text-gray-900">{orderDetail.totalAmount.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-800">Frais de livraison</span>
                <div className="flex items-center gap-2">
                  {orderDetail.freeShipping ? (
                    <span className="font-medium text-green-600">GRATUIT</span>
                  ) : (
                    <span className="font-medium text-gray-900">{orderDetail.shippingCost?.toFixed(2) || '0.00'}€</span>
                  )}
                  <button
                    onClick={toggleFreeShipping}
                    disabled={orderDetail.status === 'shipping' || orderDetail.status === 'completed'}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      orderDetail.status === 'shipping' || orderDetail.status === 'completed'
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : orderDetail.freeShipping
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                    title={orderDetail.status === 'shipping' || orderDetail.status === 'completed' 
                      ? 'Impossible de modifier la livraison gratuite après l\'import des IMEI' 
                      : ''}
                  >
                    {orderDetail.freeShipping ? 'Annuler' : 'Offrir'}
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-700">
                Bien d'occasion - TVA calculée sur la marge, non récupérable
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-semibold text-gray-900">Total HT</span>
                <span className="font-bold text-lg text-gray-900">
                  {(orderDetail.totalAmount + (orderDetail.shippingCost || 0)).toFixed(2)}€
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de configuration de livraison */}
      {showShippingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Configuration de la livraison
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numéro de tracking *
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 1Z999AA1234567890"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frais de livraison (pré-calculés automatiquement)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={orderDetail.shippingCost?.toFixed(2) || '0.00'}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600"
                  title="Les frais de livraison sont calculés automatiquement selon le nombre de produits"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {orderDetail.totalItems} articles = {orderDetail.shippingCost?.toFixed(2) || '0.00'}€
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowShippingModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Ignorer
              </button>
              <button
                onClick={updateShipping}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuth(AdminOrderDetailPage, 'admin'); 