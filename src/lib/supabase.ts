import { createClient } from '@supabase/supabase-js'

// Mode développement - valeurs par défaut si pas configuré
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fake-project.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
        status: 'pending' as const,
        status_label: 'En attente',
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
  }
} 