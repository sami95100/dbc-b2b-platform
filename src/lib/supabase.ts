import { createClient } from '@supabase/supabase-js'

// Configuration Supabase - SEULEMENT les variables publiques côté client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validation des variables d'environnement critiques
if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
}

if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
}

// Client principal avec clé publique seulement
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client admin SEULEMENT pour les API routes côté serveur
// ⚠️ ATTENTION: Ne jamais utiliser supabaseAdmin côté client !
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Debugging: Logger l'état de la clé service
console.log('🔧 Configuration Supabase Admin:');
console.log(`  - Service Key présente: ${supabaseServiceKey ? 'OUI' : 'NON'}`);
if (supabaseServiceKey) {
  console.log(`  - Longueur clé: ${supabaseServiceKey.length} caractères`);
  console.log(`  - Début clé: ${supabaseServiceKey.substring(0, 20)}...`);
}
console.log(`  - URL Supabase: ${supabaseUrl}`);

export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null // null si pas de clé service (dev mode)

console.log(`  - Client Admin créé: ${supabaseAdmin ? 'OUI' : 'NON'}`);
console.log('---');

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
  supplier_price?: number // Prix d'achat fournisseur (admin seulement)
  is_active: boolean
  created_at?: string
  updated_at?: string
}

// Types pour les commandes
export interface Order {
  id: string
  name: string
  status: 'draft' | 'validated' | 'shipping' | 'completed'
  status_label: string
  customer_ref?: string
  user_id?: string  // Liaison vers la table users
  created_at: string
  updated_at: string
  total_amount: number
  total_items: number
  vat_type?: string
}

// Interface pour les utilisateurs/clients
export interface User {
  id: string
  email: string
  company_name?: string
  contact_name?: string
  phone?: string
  address?: string
  role: 'client' | 'admin'
  is_active: boolean
  created_at: string
  updated_at: string
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

// Nouveau type pour les IMEI des articles de commande
export interface OrderItemImei {
  id: string
  order_item_id: string
  sku: string
  imei: string
  product_name: string
  appearance: string
  functionality: string
  boxed: string
  color: string | null
  cloud_lock: string | null
  additional_info: string | null
  supplier_price: number
  dbc_price: number
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

  // NOUVEAU : Valider une commande et décrémenter le stock (optimisé)
  async validateOrder(orderId: string, orderItems: {sku: string, quantity: number, product_name: string, unit_price: number}[]) {
    try {
      // 1. Vérifier le stock pour tous les produits en une seule requête
      const skus = orderItems.map(item => item.sku);
      const { data: products, error: stockError } = await supabase
        .from('products')
        .select('sku, quantity')
        .in('sku', skus);

      if (stockError) {
        console.error('❌ Erreur vérification stock:', stockError);
        throw stockError;
      }

      // 2. Valider la disponibilité de tous les produits
      const productMap = new Map(products?.map(p => [p.sku, p.quantity]) || []);
      
      for (const item of orderItems) {
        const availableStock = productMap.get(item.sku) || 0;
        if (availableStock < item.quantity) {
          throw new Error(`Stock insuffisant pour ${item.sku} (demandé: ${item.quantity}, disponible: ${availableStock})`);
        }
      }

      // 3. Mettre à jour le statut de la commande
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .update({
                  status: 'validated' as const,
        status_label: 'Validée',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (orderError) {
        console.error('❌ Erreur mise à jour statut commande:', orderError);
        throw orderError;
      }

      // 4. Décrémenter le stock en batch (tous les produits à la fois)
      const stockUpdates = orderItems.map(item => {
        const currentStock = productMap.get(item.sku) || 0;
        const newQuantity = Math.max(0, currentStock - item.quantity);
        return {
          sku: item.sku,
          quantity: newQuantity,
          is_active: newQuantity > 0
        };
      });

      // Effectuer toutes les mises à jour de stock
      for (const update of stockUpdates) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ 
            quantity: update.quantity
            // Ne plus désactiver les produits à 0 - les garder actifs pour recherche
          })
          .eq('sku', update.sku);

        if (updateError) {
          console.error(`Erreur mise à jour stock ${update.sku}:`, updateError);
          // Ne pas arrêter le processus pour une erreur de stock
        }
      }

      console.log('✅ Validation terminée - stock mis à jour');
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
        } else if (editedQty < originalQty) {
          // Quantité réduite → remettre la différence en stock
          stockToAdd.push({ sku, quantity: originalQty - editedQty });
        } else if (editedQty > originalQty) {
          // Quantité augmentée → retirer la différence du stock
          stockToRemove.push({ sku, quantity: editedQty - originalQty });
        }
      }
      
      // Nouveaux produits ajoutés à la commande
      for (const sku in editedMap) {
        const editedQty = editedMap[sku];
        if (!originalMap[sku] && editedQty > 0) {
          stockToRemove.push({ sku, quantity: editedQty });
        }
      }
      
      // 2. Appliquer les changements de stock
      for (const { sku, quantity } of stockToAdd) {
        // TODO: Cette opération nécessite des privilèges admin - déplacer vers API route
        const { data: product, error: getError } = await supabase
          .from('products')
          .select('quantity, is_active')
          .eq('sku', sku)
          .single();

        if (getError) {
          console.error(`Erreur récupération produit ${sku}:`, getError);
          continue;
        }

        const newQuantity = product.quantity + quantity;
        
        // TODO: Cette opération nécessite des privilèges admin - déplacer vers API route
        const { error: updateError } = await supabase
          .from('products')
          .update({ 
            quantity: newQuantity,
            is_active: true // Réactiver si nécessaire
          })
          .eq('sku', sku);

        if (updateError) {
          console.error(`Erreur ajout stock ${sku}:`, updateError);
        } else {
        }
      }
      
      for (const { sku, quantity } of stockToRemove) {
        // TODO: Cette opération nécessite des privilèges admin - déplacer vers API route
        const { data: product, error: getError } = await supabase
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
        
        // TODO: Cette opération nécessite des privilèges admin - déplacer vers API route
        const { error: updateError } = await supabase
          .from('products')
          .update({ 
            quantity: newQuantity,
            is_active: newQuantity > 0 
          })
          .eq('sku', sku);

        if (updateError) {
          console.error(`Erreur retrait stock ${sku}:`, updateError);
        } else {
        }
      }
      
      // 3. Supprimer les produits du catalogue si demandé
      for (const sku of productsToRemoveFromCatalog) {
        // TODO: Cette opération nécessite des privilèges admin - déplacer vers API route
        const { error: deleteError } = await supabase
          .from('products')
          .update({ is_active: false })
          .eq('sku', sku);

        if (deleteError) {
          console.error(`Erreur désactivation produit ${sku}:`, deleteError);
        } else {
        }
      }
      
      // 4. Mettre à jour la commande dans Supabase
      try {
        // TODO: Cette opération nécessite des privilèges admin - déplacer vers API route
        const { data: existingOrder, error: fetchError } = await supabase
          .from('orders')
          .select('id')
          .eq('name', orderId.replace('IMP-', 'Import '))
          .single();

        if (!fetchError && existingOrder) {
          const totalAmount = editedItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
          const totalItems = editedItems.reduce((sum, item) => sum + item.quantity, 0);

          // TODO: Cette opération nécessite des privilèges admin - déplacer vers API route
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              status: 'pending_payment',
              status_label: 'En attente de paiement',
              total_amount: totalAmount,
              total_items: totalItems,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingOrder.id);

          if (updateError) {
            console.warn('⚠️ Erreur mise à jour commande Supabase:', updateError);
          } else {
            
            // Supprimer et recréer les items
            // TODO: Cette opération nécessite des privilèges admin - déplacer vers API route
            await supabase
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

              // TODO: Cette opération nécessite des privilèges admin - déplacer vers API route
              const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItemsForSupabase);

              if (itemsError) {
                console.warn('⚠️ Erreur mise à jour items Supabase:', itemsError);
              } else {
              }
            }
          }
        }
      } catch (supabaseError) {
        console.warn('⚠️ Erreur générale mise à jour Supabase:', supabaseError);
      }

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

// Configuration pour admin (server-side seulement)
export const getSupabaseAdmin = () => {
  if (typeof window !== 'undefined') {
    console.warn('⚠️ getSupabaseAdmin ne doit être utilisé que côté serveur');
    return null;
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY manquante');
    return null;
  }

  // Debugging: Logger l'état de la clé service
  console.log('🔑 Service key présente:', serviceKey.substring(0, 20) + '...');

  try {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  } catch (error) {
    console.error('❌ Erreur création client admin:', error);
    return null;
  }
};

// Fonctions utilitaires pour les opérations admin
export const supabaseOperations = {
  // Créer un utilisateur
  async createUser(email: string, password: string, userData: any) {
    // Cette opération nécessite des privilèges admin
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) return { error: 'Client admin non disponible' };

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: userData,
      email_confirm: true
    });

    if (error) return { error };

    // Créer l'entrée dans la table users
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: data.user.id,
        email: data.user.email,
        ...userData
      });

    return { data, error: userError };
  },

  // Mettre à jour un utilisateur
  async updateUser(userId: string, updates: any) {
    // Cette opération nécessite des privilèges admin
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) return { error: 'Client admin non disponible' };

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      updates
    );

    if (error) return { error };

    // Mettre à jour la table users
    const { error: userError } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', userId);

    return { data, error: userError };
  },

  // Supprimer un utilisateur
  async deleteUser(userId: string) {
    // Cette opération nécessite des privilèges admin
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) return { error: 'Client admin non disponible' };
    
    // Supprimer de la table users d'abord
    const { error: userError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (userError) return { error: userError };

    // Puis supprimer l'auth user
    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    return { data, error };
  },

  // Lister tous les utilisateurs  
  async listUsers(page = 1, perPage = 50) {
    // Cette opération nécessite des privilèges admin
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) return { error: 'Client admin non disponible' };

    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage
    });

    return { data, error };
  },

  // Obtenir un utilisateur par ID
  async getUserById(userId: string) {
    // Cette opération nécessite des privilèges admin
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) return { error: 'Client admin non disponible' };

    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    return { data, error };
  },

  // Créer un client avec un code unique
  async createClientWithCode(email: string, password: string, clientData: any) {
    // Cette opération nécessite des privilèges admin
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) return { error: 'Client admin non disponible' };

    // Générer un code client unique
    const clientCode = `CLI${Date.now()}`;
    
    const result = await this.createUser(email, password, {
      ...clientData,
      user_type: 'client',
      client_code: clientCode
    });

    return result;
  },

  // Réinitialiser le mot de passe d'un utilisateur
  async resetUserPassword(userId: string, newPassword: string) {
    // Cette opération nécessite des privilèges admin
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) return { error: 'Client admin non disponible' };

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    return { data, error };
  },

  // Obtenir les statistiques des utilisateurs
  async getUserStats() {
    // Cette opération nécessite des privilèges admin
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) return { error: 'Client admin non disponible' };

    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('user_type, created_at');

    if (error) return { error };

    const stats = {
      total: users.length,
      admins: users.filter(u => u.user_type === 'admin').length,
      clients: users.filter(u => u.user_type === 'client').length,
      recent: users.filter(u => {
        const created = new Date(u.created_at);
        const week = new Date();
        week.setDate(week.getDate() - 7);
        return created > week;
      }).length
    };

    return { data: stats, error: null };
  },

  // Récupérer les statistiques du dashboard pour l'admin
  async getDashboardStats() {
    try {
      const admin = getSupabaseAdmin();
      if (!admin) return { error: 'Client admin non disponible' };

      // Utiliser les fonctions SQL
      const [marginResult, modelsResult, debugResult] = await Promise.all([
        admin.rpc('get_total_margin_completed_orders'),
        admin.rpc('get_top_selling_models_completed_orders', { limit_count: 5 }),
        admin.rpc('debug_margin_data')
      ]);

      if (marginResult.error || modelsResult.error || debugResult.error) {
        return { 
          error: marginResult.error?.message || modelsResult.error?.message || debugResult.error?.message 
        };
      }

      const stats = {
        totalMargin: marginResult.data || 0,
        topModels: modelsResult.data || [],
        debug: debugResult.data?.[0] || {}
      };

      return { data: stats, error: null };
    } catch (error) {
      console.error('Erreur fonction getDashboardStats:', error);
      return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }
}; 