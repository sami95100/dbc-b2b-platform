'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DBCLogo from '../../../components/DBCLogo';
import { supabase, Product, orderService } from '../../../lib/supabase';
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
  Edit
} from 'lucide-react';

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editableQuantities, setEditableQuantities] = useState<{[key: string]: number}>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [validating, setValidating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [originalOrderItems, setOriginalOrderItems] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'sku' | 'imei'>('sku');
  const [imeiData, setImeiData] = useState<any[]>([]);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const router = useRouter();

  // Charger les produits depuis Supabase
  const loadProducts = async () => {
    try {
      console.log('📦 Chargement des produits pour la commande...');
      
      // Charger TOUS les produits par batch
      let allProducts: Product[] = [];
      const batchSize = 1000;
      let hasMore = true;
      let currentBatch = 0;
      
      while (hasMore) {
        const from = currentBatch * batchSize;
        const to = from + batchSize - 1;
        
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .range(from, to);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allProducts = [...allProducts, ...data];
          console.log(`✅ Batch ${currentBatch + 1}: ${data.length} produits (total: ${allProducts.length})`);
          
          if (data.length < batchSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
        
        currentBatch++;
        
        // Sécurité
        if (currentBatch > 50) {
          console.warn('⚠️ Arrêt sécurité après 50 batchs');
          break;
        }
      }
      
      console.log('✅ Total produits chargés:', allProducts.length);
      setProducts(allProducts);
      setProductsLoaded(true);
    } catch (err) {
      console.error('Erreur chargement produits:', err);
      setProducts([]);
      setProductsLoaded(true);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const loadOrderDetail = async () => {
    try {
      setLoading(true);
      console.log('🔍 Chargement commande Supabase avec ID:', params.id);
      
      // Charger la commande depuis Supabase avec son UUID
      const { data: supabaseOrder, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('id', params.id)
        .single();

      if (error) {
        console.error('❌ Erreur chargement commande:', error);
        throw error;
      }

      if (!supabaseOrder) {
        console.log('❌ Commande non trouvée avec ID:', params.id);
        return;
      }

      console.log('✅ Commande Supabase trouvée:', supabaseOrder.id);
      console.log('📦 Items de commande:', supabaseOrder.order_items?.length || 0);

      // Si les produits ne sont pas encore chargés, attendre et recharger
      let currentProducts = products;
      if (!productsLoaded || products.length === 0) {
        console.log('⏳ Produits pas encore chargés, rechargement...');
        await loadProducts();
        
        // Attendre que les produits soient vraiment mis à jour
        const { data: freshProducts, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true);
          
        if (!productsError && freshProducts) {
          currentProducts = freshProducts;
          console.log('✅ Produits rechargés:', currentProducts.length);
        }
      }

      // Construire les détails des articles avec les informations du catalogue
      const items = supabaseOrder.order_items?.map((orderItem: any) => {
        const product = currentProducts.find(p => p.sku === orderItem.sku);
        if (product) {
          console.log(`✅ Produit ${orderItem.sku} trouvé dans le catalogue`);
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
            totalPrice: orderItem.total_price
          };
        } else {
          // Si le produit n'est pas dans le catalogue, utiliser les données de la commande
          console.warn('⚠️ Produit non trouvé dans le catalogue:', orderItem.sku);
          return {
            sku: orderItem.sku,
            name: orderItem.product_name,
            appearance: '-',
            functionality: '-',
            color: '-',
            boxed: '-',
            additional_info: '-',
            quantity: orderItem.quantity,
            unitPrice: orderItem.unit_price,
            totalPrice: orderItem.total_price
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
        source: 'supabase'
      });

      // Initialiser les quantités éditables avec les quantités actuelles
      const quantities = items.reduce((acc: any, item: any) => {
        acc[item.sku] = item.quantity;
        return acc;
      }, {});
      setEditableQuantities(quantities);

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
    if (productsLoaded) {
      loadOrderDetail();
    }
  }, [params.id, productsLoaded, products]);

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
      
      const totalAmount = updatedItems.reduce((sum: number, item: any) => 
        sum + (item.unitPrice * (editableQuantities[item.sku] === undefined ? item.quantity : editableQuantities[item.sku])), 0
      );

      const updatedOrder = {
        ...orderDetail,
        items: updatedItems,
        totalItems,
        totalAmount
      };

      setOrderDetail(updatedOrder);

      // Note: Les changements seront sauvegardés dans Supabase lors de la revalidation
    }
  };

  const removeItem = (sku: string) => {
    if (!orderDetail) return;

    const newItems = orderDetail.items.filter((item: any) => item.sku !== sku);
    const newEditableQuantities = { ...editableQuantities };
    delete newEditableQuantities[sku];

    const updatedOrder = {
      ...orderDetail,
      items: newItems,
      totalItems: newItems.reduce((sum: number, item: any) => sum + editableQuantities[item.sku], 0),
      totalAmount: newItems.reduce((sum: number, item: any) => sum + (item.unitPrice * editableQuantities[item.sku]), 0)
    };

    setOrderDetail(updatedOrder);
    setEditableQuantities(newEditableQuantities);

    // Note: Les changements seront sauvegardés dans Supabase lors de la revalidation
  };

  const validateOrder = async () => {
    console.log('🚀 DÉBUT VALIDATION - validateOrder appelée');
    console.log('📊 orderDetail:', orderDetail);
    console.log('📦 orderDetail.items:', orderDetail?.items);
    console.log('🔢 orderDetail.items.length:', orderDetail?.items?.length);

    if (!orderDetail || orderDetail.items.length === 0) {
      console.log('❌ ARRÊT: Aucun produit dans la commande');
      alert('Aucun produit dans la commande à valider');
      return;
    }

    console.log('✅ Commande valide, début du processus de validation');
    setValidating(true);
    
    try {
      console.log('🔄 Validation de la commande:', params.id);
      console.log('📦 Items à valider:', orderDetail.items.length);
      console.log('📋 Détail des items:', orderDetail.items);
      console.log('🔧 editableQuantities:', editableQuantities);
      
      // Vérifier la connexion Supabase
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      console.log('🌐 Supabase URL:', supabaseUrl);
      
      // FORCER la validation même en mode démo pour décrémenter le stock
      console.log('🔄 Validation en mode production - décrémentation du stock');
      
      console.log('🔍 ÉTAPE 1: Vérification du stock pour chaque produit...');
      // Vérifier que tous les produits sont encore disponibles
      for (let i = 0; i < orderDetail.items.length; i++) {
        const item = orderDetail.items[i];
        const quantityToOrder = editableQuantities[item.sku] || item.quantity;
        
        console.log(`🔍 Vérification produit ${i + 1}/${orderDetail.items.length}:`);
        console.log(`  - SKU: ${item.sku}`);
        console.log(`  - Nom: ${item.name}`);
        console.log(`  - Quantité demandée: ${quantityToOrder}`);
        
        try {
          const { data: product, error } = await supabase
            .from('products')
            .select('quantity')
            .eq('sku', item.sku)
            .single();

          console.log(`  - Résultat requête Supabase:`, { data: product, error });

          if (error) {
            console.error(`❌ Erreur Supabase pour ${item.sku}:`, error);
            throw new Error(`Erreur lors de la vérification du stock pour ${item.sku}: ${error.message}`);
          }

          console.log(`  - Stock disponible: ${product?.quantity || 'N/A'}`);

          if (!product || product.quantity < quantityToOrder) {
            console.error(`❌ Stock insuffisant pour ${item.sku}:`);
            console.error(`  - Demandé: ${quantityToOrder}`);
            console.error(`  - Disponible: ${product ? product.quantity : 0}`);
            throw new Error(`Stock insuffisant pour ${item.sku} (demandé: ${quantityToOrder}, disponible: ${product ? product.quantity : 0})`);
          }

          console.log(`✅ Stock OK pour ${item.sku}`);
        } catch (itemError) {
          console.error(`❌ Erreur lors de la vérification du produit ${item.sku}:`, itemError);
          throw itemError;
        }
      }
      
      console.log('✅ ÉTAPE 1 TERMINÉE: Tous les stocks sont OK');
      
      console.log('🔧 ÉTAPE 2: Préparation des données pour orderService...');
      // Préparer les données pour Supabase
      const orderItems = orderDetail.items.map((item: { sku: string; name: string; quantity: number; unitPrice: number }) => {
        const finalQuantity = editableQuantities[item.sku] || item.quantity;
        const orderItem = {
          sku: item.sku,
          quantity: finalQuantity,
          product_name: item.name,
          unit_price: item.unitPrice
        };
        console.log(`  - Item préparé:`, orderItem);
        return orderItem;
      });

      console.log('📋 Items finaux pour orderService:', orderItems);
      console.log('🎯 Paramètres orderService.validateOrder:', {
        orderId: params.id,
        itemsCount: orderItems.length
      });

      console.log('🚀 ÉTAPE 3: Appel orderService.validateOrder...');
      // Valider via le service
      const serviceResult = await orderService.validateOrder(params.id, orderItems);
      console.log('✅ ÉTAPE 3 TERMINÉE: orderService.validateOrder retour:', serviceResult);

      console.log('🔄 ÉTAPE 4: Mise à jour du statut local...');
      // Mettre à jour le statut local
      const updatedOrder = {
        ...orderDetail,
        status: 'pending_payment',
        status_label: 'En attente de paiement',
        items: orderDetail.items.filter((item: any) => (editableQuantities[item.sku] || item.quantity) > 0),
        editHistory: {
          ...orderDetail.editHistory,
          revalidatedAt: new Date().toISOString(),
          changes: serviceResult
        }
      };
      console.log('📝 updatedOrder:', updatedOrder);
      setOrderDetail(updatedOrder);

      console.log('💾 ÉTAPE 5: Mise à jour localStorage...');
      // Mettre à jour localStorage
      const savedOrders = localStorage.getItem('draftOrders');
      console.log('📁 savedOrders depuis localStorage:', savedOrders);
      
      if (savedOrders) {
        const draftOrders = JSON.parse(savedOrders);
        console.log('📋 draftOrders parsé:', draftOrders);
        console.log('🔍 Commande actuelle dans draftOrders:', draftOrders[params.id]);
        
        draftOrders[params.id] = {
          ...draftOrders[params.id],
          status: 'pending_payment',
          status_label: 'En attente de paiement'
        };
        console.log('📝 draftOrders mis à jour:', draftOrders[params.id]);
        
        localStorage.setItem('draftOrders', JSON.stringify(draftOrders));
        console.log('💾 localStorage mis à jour');
        
        // Supprimer de la commande active
        const currentOrder = localStorage.getItem('currentDraftOrder');
        console.log('🎯 currentDraftOrder:', currentOrder);
        if (currentOrder === params.id) {
          localStorage.removeItem('currentDraftOrder');
          console.log('🗑️ currentDraftOrder supprimé');
        }
      }

      console.log('✅ VALIDATION TERMINÉE AVEC SUCCÈS !');
      alert('✅ Commande validée avec succès ! Le stock a été mis à jour.');
      router.push('/orders'); // Rediriger vers la liste des commandes

    } catch (error) {
      console.error('❌ ERREUR LORS DE LA VALIDATION:', error);
      console.error('❌ Type d\'erreur:', typeof error);
      console.error('❌ error.name:', (error as any)?.name);
      console.error('❌ error.message:', (error as any)?.message);
      console.error('❌ error.stack:', (error as any)?.stack);
      
      // Message d'erreur plus détaillé
      let errorMessage = '❌ Erreur lors de la validation de la commande';
      if (error instanceof Error) {
        console.log('🔍 Analyse du type d\'erreur...');
        if (error.message.includes('not authenticated')) {
          console.log('🔐 Erreur d\'authentification détectée');
          errorMessage += '\n\nProblème d\'authentification avec Supabase. Veuillez vous reconnecter.';
        } else if (error.message.includes('network')) {
          console.log('🌐 Erreur réseau détectée');
          errorMessage += '\n\nProblème de connexion réseau. Vérifiez votre connexion internet.';
        } else if (error.message.includes('Stock insuffisant')) {
          console.log('📦 Erreur de stock détectée');
          errorMessage += '\n\n' + error.message + '\nLe stock a peut-être été mis à jour par un autre utilisateur.';
        } else {
          console.log('❓ Autre type d\'erreur');
          errorMessage += '\n\n' + error.message;
        }
      }
      
      console.log('💬 Message d\'erreur final:', errorMessage);
      alert(errorMessage);
    } finally {
      console.log('🏁 FINALLY: Remise à zéro du state validating');
      setValidating(false);
    }
  };

  const deleteOrder = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette commande ?')) {
      try {
        // Supprimer d'abord les items de commande
        const { error: itemsError } = await supabase
          .from('order_items')
          .delete()
          .eq('order_id', params.id);

        if (itemsError) throw itemsError;

        // Puis supprimer la commande
        const { error: orderError } = await supabase
          .from('orders')
          .delete()
          .eq('id', params.id);

        if (orderError) throw orderError;

        alert('✅ Commande supprimée avec succès');
        router.push('/orders');
      } catch (error) {
        console.error('❌ Erreur lors de la suppression:', error);
        alert('❌ Erreur lors de la suppression de la commande');
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5" />;
      case 'shipping': return <Truck className="h-5 w-5" />;
      case 'pending_payment': return <AlertCircle className="h-5 w-5" />;
      case 'draft': return <Package className="h-5 w-5" />;
      default: return <Package className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'shipping': return 'bg-blue-100 text-blue-800';
      case 'pending_payment': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const exportToExcel = () => {
    if (!orderDetail) return;

    try {
      // Import dynamique de xlsx
      import('xlsx').then((XLSX) => {
        // Créer les données pour Excel
        const worksheetData = [
          // Headers
          ['SKU', 'Nom du produit', 'Apparence', 'Fonctionnalité', 'Informations', 'Couleur', 'Emballage', 'Quantité', 'Prix unitaire', 'Total'],
          // Données
          ...orderDetail.items.map((item: any) => [
            item.sku,
            item.name,
            item.appearance,
            item.functionality,
            item.additional_info,
            item.color,
            item.boxed,
            editableQuantities[item.sku] || item.quantity,
            item.unitPrice,
            (item.unitPrice * (editableQuantities[item.sku] || item.quantity))
          ])
        ];

        // Ajouter une ligne de total
        const totalQty = orderDetail.items.reduce((sum: number, item: any) => sum + (editableQuantities[item.sku] || item.quantity), 0);
        const totalAmount = orderDetail.items.reduce((sum: number, item: any) => sum + (item.unitPrice * (editableQuantities[item.sku] || item.quantity)), 0);
        
        worksheetData.push(['', '', '', '', '', '', '', 'TOTAL:', totalQty, '', totalAmount.toFixed(2)]);

        // Créer le workbook et worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

        // Styling des headers (optionnel - certaines versions le supportent)
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:K1');
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
          if (!worksheet[cellAddress]) continue;
          worksheet[cellAddress].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: 'CCCCCC' } }
          };
        }

        // Ajuster la largeur des colonnes
        worksheet['!cols'] = [
          { width: 15 }, // SKU
          { width: 30 }, // Nom du produit
          { width: 10 }, // Apparence
          { width: 10 }, // Fonctionnalité
          { width: 20 }, // Informations
          { width: 10 }, // Couleur
          { width: 15 }, // Emballage
          { width: 8 },  // Quantité
          { width: 12 }, // Prix unitaire
          { width: 12 }  // Total
        ];

        // Ajouter le worksheet au workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Commande');

        // Créer le nom de fichier
        const fileName = `commande_${params.id}_${new Date().toISOString().split('T')[0]}.xlsx`;

        // Télécharger le fichier
        XLSX.writeFile(workbook, fileName);

        console.log('📊 Export Excel XLSX terminé');
      });
    } catch (error) {
      console.error('❌ Erreur export Excel:', error);
      alert('❌ Erreur lors de l\'export Excel');
    }
  };

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

  // Nouvelles fonctions d'édition
  const handleEditByImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      console.log('📁 Début d\'édition par import pour la commande:', params.id);

      const formData = new FormData();
      formData.append('file', file);

      // Appeler l'API d'édition par import
      const response = await fetch(`/api/orders/import?orderId=${params.id}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      console.log('📋 Résultat édition:', data);

      // Si des changements sont détectés, afficher la confirmation
      if (data.hasChanges) {
        // Rediriger vers une page de confirmation d'édition
        // ou afficher un modal de confirmation
        if (window.confirm(
          `Édition détectée:\n` +
          `- ${data.validProducts?.length || 0} produits existants\n` +
          `- ${data.missingProducts?.length || 0} produits à créer\n` +
          `- ${data.editData?.productsToUpdate || 0} produits à mettre à jour\n\n` +
          `Voulez-vous confirmer l'édition ?`
        )) {
          // Confirmer l'édition
          const confirmResponse = await fetch('/api/orders/import/edit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              orderId: params.id,
              addToGatalog: true, // Par défaut, ajouter les produits manquants
              validProducts: data.validProducts,
              missingProducts: data.missingProducts,
              editData: data.editData
            }),
          });

          const confirmData = await confirmResponse.json();
          
          if (confirmData.success) {
            // Mettre à jour la commande localement
            const updatedOrder = confirmData.order;
            setOrderDetail(updatedOrder);

            // Mettre à jour localStorage
            const savedOrders = localStorage.getItem('draftOrders');
            if (savedOrders) {
              const draftOrders = JSON.parse(savedOrders);
              draftOrders[params.id] = updatedOrder;
              localStorage.setItem('draftOrders', JSON.stringify(draftOrders));
            }

            alert(`✅ ${confirmData.message}`);
            // Rafraîchir la page pour afficher les changements
            window.location.reload();
          } else {
            throw new Error(confirmData.error || 'Erreur lors de l\'édition');
          }
        }
      } else {
        alert('ℹ️ Aucun changement détecté dans le fichier Excel.');
      }

    } catch (error) {
      console.error('❌ Erreur édition par import:', error);
      alert(`❌ Erreur lors de l'édition par import: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }

    // Réinitialiser le champ file
    event.target.value = '';
  };

  const handleManualEdit = () => {
    try {
      // Sauvegarder l'état original des items avant édition
      if (orderDetail && orderDetail.items) {
        const originalItems = orderDetail.items.map((item: any) => ({
          sku: item.sku,
          quantity: item.quantity,
          product_name: item.name,
          unit_price: item.unitPrice
        }));
        setOriginalOrderItems(originalItems);
        
        // Initialiser les quantités éditables avec les quantités actuelles
        const currentQuantities = orderDetail.items.reduce((acc: any, item: any) => {
          acc[item.sku] = item.quantity;
          return acc;
        }, {});
        setEditableQuantities(currentQuantities);
      }

      // Changer le statut en "editing"
      const updatedOrder = {
        ...orderDetail,
        status: 'pending_payment',
        status_label: 'En attente de paiement',
        editHistory: {
          ...orderDetail.editHistory,
          manualEditStarted: new Date().toISOString()
        }
      };

      setOrderDetail(updatedOrder);

      // Mettre à jour localStorage
      const savedOrders = localStorage.getItem('draftOrders');
      if (savedOrders) {
        const draftOrders = JSON.parse(savedOrders);
        draftOrders[params.id] = updatedOrder;
        localStorage.setItem('draftOrders', JSON.stringify(draftOrders));
      }

      // Activer le mode édition pour les quantités
      setIsEditing(true);

      alert('📝 Mode édition manuel activé. Vous pouvez maintenant modifier les quantités.');

    } catch (error) {
      console.error('❌ Erreur édition manuelle:', error);
      alert('❌ Erreur lors de l\'activation du mode édition');
    }
  };

  const revalidateOrder = async () => {
    if (!orderDetail || !originalOrderItems || originalOrderItems.length === 0) {
      alert('❌ Impossible de revalider : données originales manquantes');
      return;
    }

    try {
      setValidating(true);

      // Préparer les items édités
      const editedItems = orderDetail.items
        .filter((item: any) => (editableQuantities[item.sku] || item.quantity) > 0)
        .map((item: { sku: string; name: string; quantity: number; unitPrice: number }) => ({
          sku: item.sku,
          quantity: editableQuantities[item.sku] || item.quantity,
          product_name: item.name,
          unit_price: item.unitPrice
        }));

      console.log('📊 Revalidation avec comparaison:');
      console.log('- Items originaux:', originalOrderItems.length);
      console.log('- Items édités:', editedItems.length);

      // Utiliser la nouvelle méthode de revalidation
      const result = await orderService.revalidateEditedOrder(params.id, originalOrderItems, editedItems);

      // Mettre à jour le statut local vers "pending_payment"
      const updatedOrder = {
        ...orderDetail,
        status: 'pending_payment',
        status_label: 'En attente de paiement',
        items: orderDetail.items.filter((item: any) => (editableQuantities[item.sku] || item.quantity) > 0),
        editHistory: {
          ...orderDetail.editHistory,
          revalidatedAt: new Date().toISOString(),
          changes: result
        }
      };

      // Recalculer les totaux
      const totalItems = editedItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
      const totalAmount = editedItems.reduce((sum: number, item: any) => sum + (item.unit_price * item.quantity), 0);
      
      updatedOrder.totalItems = totalItems;
      updatedOrder.totalAmount = totalAmount;

      setOrderDetail(updatedOrder);

      // Mettre à jour localStorage
      const savedOrders = localStorage.getItem('draftOrders');
      if (savedOrders) {
        const draftOrders = JSON.parse(savedOrders);
        draftOrders[params.id] = updatedOrder;
        localStorage.setItem('draftOrders', JSON.stringify(draftOrders));
      }

      // Désactiver le mode édition
      setIsEditing(false);

      // Message de succès détaillé
      let message = '✅ Commande revalidée avec succès !\n\n';
      if (result.stockAdded.length > 0) {
        message += `📈 Stock restauré pour ${result.stockAdded.length} produits\n`;
      }
      if (result.stockRemoved.length > 0) {
        message += `📉 Stock décrémenté pour ${result.stockRemoved.length} produits\n`;
      }
      if (result.productsRemovedFromCatalog.length > 0) {
        message += `🗑️ ${result.productsRemovedFromCatalog.length} produits désactivés du catalogue`;
      }

      alert(message);

    } catch (error) {
      console.error('❌ Erreur revalidation:', error);
      
      let errorMessage = '❌ Erreur lors de la revalidation de la commande';
      if (error instanceof Error) {
        if (error.message.includes('Stock insuffisant')) {
          errorMessage += '\n\n' + error.message;
        } else {
          errorMessage += '\n\n' + error.message;
        }
      }
      
      alert(errorMessage);
    } finally {
      setValidating(false);
    }
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
      
      alert(`✅ Import IMEI réussi: ${data.summary.totalImei} IMEI ajoutés`);

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
      console.log('🚚 Mise à jour tracking:', trackingNumber, shippingCost);

      const response = await fetch(`/api/orders/${orderDetail.id}/shipping`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tracking_number: trackingNumber,
          shipping_cost: parseFloat(shippingCost) || 0,
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
        tracking_number: trackingNumber,
        shipping_cost: parseFloat(shippingCost) || 0
      });

      setShowShippingModal(false);
      setTrackingNumber('');
      setShippingCost('');
      
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
            onClick={() => router.push('/orders')}
            className="bg-dbc-light-green text-white py-2 px-6 rounded-lg hover:bg-green-600 transition-colors"
          >
            Retour aux commandes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-dbc-dark-green shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <DBCLogo />
                <h1 className="text-xl font-bold text-white">DBC Electronics</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => router.push('/orders')}
                className="relative hover:text-dbc-bright-green transition-colors"
              >
                <ShoppingCart className="h-6 w-6 text-white" />
              </button>
              
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-white" />
                <span className="text-sm text-white">Demo User</span>
              </div>
              
              <button className="text-white hover:text-dbc-bright-green transition-colors">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
          <span>Retour aux commandes</span>
        </button>

        {/* Informations de la commande */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {orderDetail.name || `Commande ${orderDetail.id}`}
              </h1>
              <div className="flex items-center space-x-4">
                <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(orderDetail.status)}`}>
                  {getStatusIcon(orderDetail.status)}
                  <span>{orderDetail.status_label}</span>
                </span>
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-1" />
                  Créée le {new Date(orderDetail.createdAt).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {orderDetail.status === 'draft' && (
                <>
                  <button
                    onClick={deleteOrder}
                    className="flex items-center space-x-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Supprimer</span>
                  </button>
                  <div className="flex space-x-3">
                    <button
                      onClick={validateOrder}
                      disabled={validating}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {validating ? (
                        <>
                          <Clock className="h-4 w-4 animate-spin" />
                          <span>Validation...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          <span>Valider la commande</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={exportToExcel}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>Export Excel</span>
                    </button>
                  </div>
                </>
              )}
              
              {orderDetail.status !== 'draft' && (
                <>
                  {/* Boutons de progression du workflow */}
                  {orderDetail.status === 'pending_payment' && (
                    <div className="flex space-x-3">
                      <label className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer text-sm">
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleImeiImport}
                          className="hidden"
                        />
                        <Truck className="h-4 w-4" />
                        <span>Importer IMEI</span>
                      </label>
                    </div>
                  )}

                  {orderDetail.status === 'shipping' && (
                    <div className="flex space-x-3">
                      <button
                        onClick={markAsCompleted}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Marquer comme terminée</span>
                      </button>
                    </div>
                  )}

                  {/* Boutons d'édition pour commandes en attente de paiement */}
                  {orderDetail.status === 'pending_payment' && (
                    <div className="flex space-x-3">
                      {/* Édition par import */}
                      <label className="flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 cursor-pointer text-sm">
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleEditByImport}
                          className="hidden"
                        />
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>Éditer par import</span>
                      </label>

                      {/* Édition manuelle */}
                      <button
                        onClick={handleManualEdit}
                        className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Éditer manuellement</span>
                      </button>
                    </div>
                  )}

                  {/* Bouton de revalidation si en cours d'édition */}
                  {isEditing && (
                    <button
                      onClick={revalidateOrder}
                      disabled={validating}
                      className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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

                  <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                    <FileText className="h-4 w-4" />
                    <span>Facture</span>
                  </button>
                  
                  <button
                    onClick={exportToExcel}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Export Excel</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-800 mb-1 font-medium">Référence client</p>
              <p className="font-medium text-gray-900">{orderDetail.customerRef}</p>
            </div>
            <div>
              <p className="text-sm text-gray-800 mb-1 font-medium">Régime TVA</p>
              <p className="text-sm text-gray-700">{orderDetail.vatType}</p>
            </div>
          </div>
        </div>

        {/* Tableau des produits */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden mb-6">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Détail des produits</h2>
            
            <div className="flex items-center space-x-4">
              {/* Switch vue SKU/IMEI */}
              {(orderDetail.status === 'shipping' || orderDetail.status === 'completed') && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode('sku')}
                    className={`px-3 py-1 text-sm rounded ${
                      viewMode === 'sku' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Vue SKU
                  </button>
                  <button
                    onClick={() => setViewMode('imei')}
                    className={`px-3 py-1 text-sm rounded ${
                      viewMode === 'imei' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Vue IMEI
                  </button>
                </div>
              )}

              {/* Boutons d'export */}
              {(orderDetail.status === 'shipping' || orderDetail.status === 'completed') && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => exportData(viewMode, 'csv')}
                    className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    <Download className="h-4 w-4" />
                    <span>CSV</span>
                  </button>
                  <button
                    onClick={() => exportData(viewMode, 'xlsx')}
                    className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Excel</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="w-full">
            {viewMode === 'sku' ? (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom du produit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Apparence</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fonctionnalité</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Informations</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Couleur</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Emballage</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qté</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Prix unit.</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    {orderDetail.status === 'draft' && (
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orderDetail.items.map((item: any) => (
                    <tr key={item.sku}>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">{item.sku}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                          item.appearance === 'Grade A+' ? 'bg-green-100 text-green-800' :
                          item.appearance === 'Grade A' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.appearance.replace('Grade ', '')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
                          {item.functionality}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">{item.additional_info}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full border ${getColorClass(item.color)}`}></div>
                          <span>{item.color}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.boxed}</td>
                      <td className="px-4 py-3 text-center">
                        {(orderDetail.status === 'draft' || orderDetail.status === 'pending_payment' || isEditing) ? (
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
                          <span className="text-sm font-medium text-gray-900">{item.quantity}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{item.unitPrice.toFixed(2)}€</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                        {(item.unitPrice * editableQuantities[item.sku]).toFixed(2)}€
                      </td>
                      {(orderDetail.status === 'draft' || orderDetail.status === 'pending_payment' || isEditing) && (
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => removeItem(item.sku)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Supprimer ce produit"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              // Vue IMEI
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IMEI</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom du produit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Apparence</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fonctionnalité</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Couleur</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Emballage</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Prix fourn.</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Prix DBC</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {imeiData.length > 0 ? (
                    imeiData.map((imei: any) => (
                      <tr key={imei.imei}>
                        <td className="px-4 py-3 text-sm font-mono text-gray-900">{imei.sku}</td>
                        <td className="px-4 py-3 text-sm font-mono text-blue-600">{imei.imei}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{imei.product_name}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                            imei.appearance === 'Grade A+' ? 'bg-green-100 text-green-800' :
                            imei.appearance === 'Grade A' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {imei.appearance.replace('Grade ', '')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
                            {imei.functionality}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full border ${getColorClass(imei.color)}`}></div>
                            <span>{imei.color || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{imei.boxed}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{imei.supplier_price.toFixed(2)}€</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">{imei.dbc_price.toFixed(2)}€</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                        Aucun IMEI trouvé pour cette commande.
                        {orderDetail.status === 'pending_payment' && (
                          <span> Importez les IMEI pour passer en livraison.</span>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
                  Frais de livraison (optionnel)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
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