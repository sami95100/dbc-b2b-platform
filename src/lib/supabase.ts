import { createClient } from '@supabase/supabase-js'

// Mode développement - valeurs par défaut si pas configuré
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fake-project.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client avec privilèges administrateur pour les opérations backend
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Types pour TypeScript
export interface Product {
  sku: string
  item_group: string
  product_name: string
  appearance: string
  functionality: string
  boxed: string
  color: string
  cloud_lock: string | null
  additional_info: string | null
  quantity: number
  price: number
  campaign_price: number | null
  vat_type: string | null
  price_dbc: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

// Types pour les commandes
export interface Order {
  id: string
  name: string
  status: 'draft' | 'pending' | 'processing' | 'shipped' | 'delivered'
  status_label: string
  customer_ref?: string
  created_at: string
  updated_at: string
  total_amount: number
  total_items: number
  vat_type?: string
}

export interface OrderItem {
  id: string
  order_id: string
  sku: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

// Fonctions pour les commandes
export const orderService = {
  // Créer une nouvelle commande
  async createOrder(orderData: Omit<Order, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('orders')
      .insert([{
        ...orderData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Ajouter des items à une commande
  async addOrderItems(orderItems: Omit<OrderItem, 'id' | 'created_at'>[]) {
    const { data, error } = await supabase
      .from('order_items')
      .insert(orderItems.map(item => ({
        ...item,
        created_at: new Date().toISOString()
      })))
      .select()
    
    if (error) throw error
    return data
  },

  // Récupérer toutes les commandes
  async getOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Récupérer une commande par ID
  async getOrderById(orderId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('id', orderId)
      .single()
    
    if (error) throw error
    return data
  },

  // Mettre à jour une commande
  async updateOrder(orderId: string, updates: Partial<Order>) {
    const { data, error } = await supabase
      .from('orders')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Supprimer une commande
  async deleteOrder(orderId: string) {
    // D'abord supprimer les items
    await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId)
    
    // Puis supprimer la commande
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)
    
    if (error) throw error
  },

  // NOUVEAU : Valider une commande et décrémenter le stock
  async validateOrder(orderId: string, orderItems: {sku: string, quantity: number, product_name: string, unit_price: number}[]) {
    try {
      console.log('🔄 Validation de la commande:', orderId);
      
      // 1. Créer la commande dans Supabase avec un nouvel UUID
      const orderData = {
        name: `Commande ${new Date().toLocaleDateString('fr-FR')}`,
        status: 'validated' as const,
        status_label: 'Validée',
        total_amount: orderItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0),
        total_items: orderItems.reduce((sum, item) => sum + item.quantity, 0),
        customer_ref: 'DBC-CLIENT-001',
        vat_type: 'Bien d\'occasion - TVA calculée sur la marge, non récupérable'
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Ajouter les items de commande avec l'UUID généré
      const itemsData = orderItems.map(item => ({
        order_id: order.id, // Utiliser l'UUID généré
        sku: item.sku,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsData);

      if (itemsError) throw itemsError;

      // 3. Décrémenter le stock des produits
      for (const item of orderItems) {
        const { data: product, error: getError } = await supabase
          .from('products')
          .select('quantity')
          .eq('sku', item.sku)
          .single();

        if (getError) {
          console.error(`Erreur récupération produit ${item.sku}:`, getError);
          continue;
        }

        const newQuantity = Math.max(0, product.quantity - item.quantity);
        
        const { error: updateError } = await supabase
          .from('products')
          .update({ 
            quantity: newQuantity,
            is_active: newQuantity > 0 
          })
          .eq('sku', item.sku);

        if (updateError) {
          console.error(`Erreur mise à jour stock ${item.sku}:`, updateError);
        } else {
          console.log(`✅ Stock mis à jour pour ${item.sku}: ${product.quantity} → ${newQuantity}`);
        }
      }

      console.log('✅ Commande validée avec succès');
      return order;

    } catch (error) {
      console.error('❌ Erreur validation commande:', error);
      throw error;
    }
  },

  // NOUVEAU : Exporter une commande en Excel
  async exportOrderToExcel(orderId: string, orderData: any) {
    try {
      // Cette fonction sera implémentée avec une librairie Excel
      console.log('📊 Export Excel pour commande:', orderId);
      
      const workbook = {
        sheets: [{
          name: 'Commande',
          data: [
            ['SKU', 'Nom du produit', 'Quantité', 'Prix unitaire', 'Total'],
            ...orderData.items.map((item: any) => [
              item.sku,
              item.name,
              item.quantity,
              item.unitPrice.toFixed(2) + '€',
              (item.unitPrice * item.quantity).toFixed(2) + '€'
            ])
          ]
        }]
      };
      
      return workbook;
    } catch (error) {
      console.error('❌ Erreur export Excel:', error);
      throw error;
    }
  },

  // NOUVEAU : Revalider une commande après édition
  async revalidateEditedOrder(orderId: string, originalItems: any[], editedItems: {sku: string, quantity: number, product_name: string, unit_price: number}[]) {
    try {
      console.log('🔄 Revalidation de la commande éditée:', orderId);
      
      // 1. Calculer les différences entre original et édité
      const originalMap: {[key: string]: number} = {};
      const editedMap: {[key: string]: number} = {};
      
      originalItems.forEach(item => {
        originalMap[item.sku] = item.quantity;
      });
      
      editedItems.forEach(item => {
        editedMap[item.sku] = item.quantity;
      });
      
      // Produits à ajouter au stock (supprimés de la commande ou quantité réduite)
      const stockToAdd: {sku: string, quantity: number}[] = [];
      
      // Produits à retirer du stock (ajoutés à la commande ou quantité augmentée)
      const stockToRemove: {sku: string, quantity: number}[] = [];
      
      // Produits complètement supprimés de la commande (à supprimer du catalogue)
      const productsToRemoveFromCatalog: string[] = [];
      
      // Analyser les changements
      for (const sku in originalMap) {
        const originalQty = originalMap[sku];
        const editedQty = editedMap[sku] || 0;
        
        if (editedQty === 0) {
          // Produit complètement supprimé → remettre tout le stock + supprimer du catalogue
          stockToAdd.push({ sku, quantity: originalQty });
          productsToRemoveFromCatalog.push(sku);
          console.log(`🗑️ Produit ${sku} supprimé de la commande (${originalQty} → 0) + suppression catalogue`);
        } else if (editedQty < originalQty) {
          // Quantité réduite → remettre la différence en stock
          stockToAdd.push({ sku, quantity: originalQty - editedQty });
          console.log(`📈 Stock à ajouter pour ${sku}: +${originalQty - editedQty} (${originalQty} → ${editedQty})`);
        } else if (editedQty > originalQty) {
          // Quantité augmentée → retirer la différence du stock
          stockToRemove.push({ sku, quantity: editedQty - originalQty });
          console.log(`📉 Stock à retirer pour ${sku}: -${editedQty - originalQty} (${originalQty} → ${editedQty})`);
        }
      }
      
      // Nouveaux produits ajoutés à la commande
      for (const sku in editedMap) {
        const editedQty = editedMap[sku];
        if (!originalMap[sku] && editedQty > 0) {
          stockToRemove.push({ sku, quantity: editedQty });
          console.log(`➕ Nouveau produit ${sku}: -${editedQty} du stock`);
        }
      }
      
      // 2. Appliquer les changements de stock
      for (const { sku, quantity } of stockToAdd) {
        const { data: product, error: getError } = await supabaseAdmin
          .from('products')
          .select('quantity, is_active')
          .eq('sku', sku)
          .single();

        if (getError) {
          console.error(`Erreur récupération produit ${sku}:`, getError);
          continue;
        }

        const newQuantity = product.quantity + quantity;
        
        const { error: updateError } = await supabaseAdmin
          .from('products')
          .update({ 
            quantity: newQuantity,
            is_active: true // Réactiver si nécessaire
          })
          .eq('sku', sku);

        if (updateError) {
          console.error(`Erreur ajout stock ${sku}:`, updateError);
        } else {
          console.log(`✅ Stock augmenté pour ${sku}: ${product.quantity} → ${newQuantity}`);
        }
      }
      
      for (const { sku, quantity } of stockToRemove) {
        const { data: product, error: getError } = await supabaseAdmin
          .from('products')
          .select('quantity')
          .eq('sku', sku)
          .single();

        if (getError) {
          console.error(`Erreur récupération produit ${sku}:`, getError);
          continue;
        }

        if (product.quantity < quantity) {
          throw new Error(`Stock insuffisant pour ${sku} (demandé: ${quantity}, disponible: ${product.quantity})`);
        }

        const newQuantity = Math.max(0, product.quantity - quantity);
        
        const { error: updateError } = await supabaseAdmin
          .from('products')
          .update({ 
            quantity: newQuantity,
            is_active: newQuantity > 0 
          })
          .eq('sku', sku);

        if (updateError) {
          console.error(`Erreur retrait stock ${sku}:`, updateError);
        } else {
          console.log(`✅ Stock réduit pour ${sku}: ${product.quantity} → ${newQuantity}`);
        }
      }
      
      // 3. Supprimer les produits du catalogue si demandé
      for (const sku of productsToRemoveFromCatalog) {
        const { error: deleteError } = await supabaseAdmin
          .from('products')
          .update({ is_active: false })
          .eq('sku', sku);

        if (deleteError) {
          console.error(`Erreur désactivation produit ${sku}:`, deleteError);
        } else {
          console.log(`🗑️ Produit ${sku} désactivé du catalogue`);
        }
      }
      
      // 4. Mettre à jour la commande dans Supabase
      try {
        const { data: existingOrder, error: fetchError } = await supabaseAdmin
          .from('orders')
          .select('id')
          .eq('name', orderId.replace('IMP-', 'Import '))
          .single();

        if (!fetchError && existingOrder) {
          const totalAmount = editedItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
          const totalItems = editedItems.reduce((sum, item) => sum + item.quantity, 0);

          const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update({
              status: 'validated',
              status_label: 'Validée',
              total_amount: totalAmount,
              total_items: totalItems,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingOrder.id);

          if (updateError) {
            console.warn('⚠️ Erreur mise à jour commande Supabase:', updateError);
          } else {
            console.log('✅ Commande mise à jour dans Supabase');
            
            // Supprimer et recréer les items
            await supabaseAdmin
              .from('order_items')
              .delete()
              .eq('order_id', existingOrder.id);

            if (editedItems.length > 0) {
              const orderItemsForSupabase = editedItems.map(item => ({
                order_id: existingOrder.id,
                sku: item.sku,
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.unit_price * item.quantity
              }));

              const { error: itemsError } = await supabaseAdmin
                .from('order_items')
                .insert(orderItemsForSupabase);

              if (itemsError) {
                console.warn('⚠️ Erreur mise à jour items Supabase:', itemsError);
              } else {
                console.log('✅ Items de commande mis à jour dans Supabase');
              }
            }
          }
        }
      } catch (supabaseError) {
        console.warn('⚠️ Erreur générale mise à jour Supabase:', supabaseError);
      }

      console.log('✅ Revalidation terminée avec succès');
      return {
        stockAdded: stockToAdd,
        stockRemoved: stockToRemove,
        productsRemovedFromCatalog: productsToRemoveFromCatalog
      };

    } catch (error) {
      console.error('❌ Erreur revalidation commande éditée:', error);
      throw error;
    }
  }
} 