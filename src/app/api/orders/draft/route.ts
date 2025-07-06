import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { calculateShippingCost } from '../../../../lib/shipping';

// Fonction helper pour vérifier supabaseAdmin
function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Configuration Supabase admin manquante - vérifiez SUPABASE_SERVICE_ROLE_KEY dans .env.local');
  }
  return supabaseAdmin;
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Récupération des commandes en brouillon...');
    
    const admin = getSupabaseAdmin();
    
    // Récupérer le userId depuis les paramètres URL
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      console.log('❌ userId manquant dans les paramètres');
      return NextResponse.json({
        error: 'userId requis'
      }, { status: 400 });
    }
    
    // Récupérer les commandes en brouillon pour cet utilisateur uniquement
    const { data: draftOrders, error: draftError } = await admin
      .from('orders')
      .select('id, name, created_at, total_amount, total_items')
      .eq('status', 'draft')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (draftError) {
      console.error('❌ Erreur récupération commandes brouillon:', draftError);
      throw new Error(`Erreur récupération commandes: ${draftError.message}`);
    }

    // Pour chaque commande, récupérer ses items
    const ordersWithItems = [];
    for (const order of draftOrders || []) {
      const { data: orderItems, error: itemsError } = await admin
        .from('order_items')
        .select('sku, quantity, unit_price, total_price, product_name')
        .eq('order_id', order.id);

      if (itemsError) {
        console.warn(`⚠️ Erreur récupération items pour commande ${order.id}:`, itemsError);
      }

      // Convertir les items en format attendu par le frontend
      const items: {[key: string]: number} = {};
      if (orderItems) {
        for (const item of orderItems) {
          items[item.sku] = item.quantity;
        }
      }

      ordersWithItems.push({
        ...order,
        items
      });
    }

    console.log('✅ Commandes brouillon trouvées:', ordersWithItems.length);

    return NextResponse.json({
      success: true,
      draftOrders: ordersWithItems,
      count: ordersWithItems.length
    });

  } catch (error) {
    console.error('❌ Erreur récupération commandes draft:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erreur interne', 
        details: error instanceof Error ? error.stack : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Création d\'une commande draft...');
    
    const admin = getSupabaseAdmin();
    
    const body = await request.json();
    const { name, items, totalAmount, totalItems, userId } = body;

    if (!userId) {
      return NextResponse.json({
        error: 'userId requis'
      }, { status: 400 });
    }
    
    // Vérifier s'il existe déjà une commande en brouillon pour cet utilisateur
    const { data: existingDraftOrders, error: draftCheckError } = await admin
      .from('orders')
      .select('id, name, created_at')
      .eq('status', 'draft')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (draftCheckError) {
      console.warn('⚠️ Erreur vérification commandes brouillon:', draftCheckError);
    } else if (existingDraftOrders && existingDraftOrders.length > 0) {
      const existingDraft = existingDraftOrders[0];
      console.log('❌ Commande brouillon existante trouvée:', existingDraft.id);
      
      return NextResponse.json({
        error: 'Une commande en brouillon existe déjà',
        existingDraft: {
          id: existingDraft.id,
          name: existingDraft.name,
          created_at: existingDraft.created_at
        },
        message: `Vous avez déjà une commande en brouillon: "${existingDraft.name}". Veuillez d'abord la supprimer ou la finaliser avant d'en créer une nouvelle.`
      }, { status: 409 });
    }

    console.log('📋 Paramètres reçus:');
    console.log('- Nom:', name);
    console.log('- Nombre d\'items:', Object.keys(items || {}).length);
    console.log('- Montant total:', totalAmount);
    console.log('- Items total:', totalItems);
    console.log('- User ID:', userId);

    // Validation des données
    if (!name || typeof name !== 'string') {
      throw new Error('Nom de commande requis');
    }

    if (!items || typeof items !== 'object') {
      throw new Error('Items de commande requis');
    }

    // Calculer les totaux si non fournis
    let calculatedTotalAmount = totalAmount || 0;
    let calculatedTotalItems = totalItems || 0;

    // Si les totaux ne sont pas fournis, les calculer depuis les items
    if (!totalAmount || !totalItems) {
      calculatedTotalItems = Object.values(items).reduce((sum: number, qty: any) => 
        sum + (typeof qty === 'number' ? qty : 0), 0
      );

      // Pour calculer le montant, on doit récupérer les prix depuis la base
      const skus = Object.keys(items);
      if (skus.length > 0) {
        const { data: products, error: productsError } = await admin
          .from('products')
          .select('sku, price_dbc')
          .in('sku', skus);

        if (productsError) {
          console.warn('⚠️ Erreur récupération prix:', productsError);
        } else {
          calculatedTotalAmount = Object.entries(items).reduce((sum: number, [sku, qty]) => {
            const product = products?.find(p => p.sku === sku);
            const quantity = typeof qty === 'number' ? qty : 0;
            return sum + (product ? product.price_dbc * quantity : 0);
          }, 0);
        }
      }
    }

    // Calculer les frais de livraison automatiquement
    const shippingCost = calculateShippingCost(calculatedTotalItems);
    
    // Créer la commande dans Supabase avec frais de livraison pré-calculés
    const orderData: any = {
      name,
      status: 'draft' as const,
      status_label: 'Brouillon',
      total_amount: Math.round(calculatedTotalAmount * 100) / 100,
      total_items: calculatedTotalItems,
      shipping_cost: shippingCost,
      customer_ref: 'DBC-CLIENT-001',
      vat_type: 'Bien d\'occasion - TVA calculée sur la marge',
      user_id: userId
    };

    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert([orderData])
      .select()
      .single();

    if (orderError) {
      console.error('❌ Erreur création commande:', orderError);
      throw new Error(`Erreur création commande: ${orderError.message}`);
    }

    console.log('✅ Commande créée:', order?.id);

    // Ajouter les items de commande
    if (Object.keys(items).length > 0) {
      // Récupérer les infos produits pour les items
      const skus = Object.keys(items);
      const { data: products, error: productsError } = await admin
        .from('products')
        .select('sku, product_name, price_dbc')
        .in('sku', skus);

      if (productsError) {
        console.warn('⚠️ Erreur récupération produits pour items:', productsError);
      }

      const orderItemsData = Object.entries(items).map(([sku, quantity]) => {
        const product = products?.find(p => p.sku === sku);
        const qty = typeof quantity === 'number' ? quantity : 0;
        const unitPrice = product?.price_dbc || 0;
        
        return {
          order_id: order.id,
          sku,
          product_name: product?.product_name || `Produit ${sku}`,
          quantity: qty,
          unit_price: unitPrice,
          total_price: unitPrice * qty
        };
      }).filter(item => item.quantity > 0);

      if (orderItemsData.length > 0) {
        const { error: itemsError } = await admin
          .from('order_items')
          .insert(orderItemsData);

        if (itemsError) {
          console.error('❌ Erreur ajout items:', itemsError);
          // Ne pas faire échouer la commande pour ça, juste avertir
        } else {
          console.log('✅ Items de commande ajoutés:', orderItemsData.length);
        }
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        name: order.name,
        status: order.status,
        status_label: order.status_label,
        total_amount: order.total_amount,
        total_items: order.total_items,
        created_at: order.created_at
      },
      message: `Commande "${order.name}" créée avec succès en tant que brouillon`
    });

  } catch (error) {
    console.error('❌ Erreur création commande draft:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erreur interne', 
        details: error instanceof Error ? error.stack : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 Mise à jour d\'une commande draft...');
    
    const admin = getSupabaseAdmin();
    
    const body = await request.json();
    const { orderId, name, items, totalAmount, totalItems, userId } = body;

    console.log('📋 Paramètres de mise à jour:');
    console.log('- ID commande:', orderId);
    console.log('- Nom:', name);
    console.log('- Nombre d\'items:', Object.keys(items || {}).length);
    console.log('- User ID:', userId);

    // Validation
    if (!orderId) {
      throw new Error('ID de commande requis');
    }

    if (!userId) {
      return NextResponse.json({
        error: 'userId requis'
      }, { status: 400 });
    }

    if (!items || typeof items !== 'object') {
      throw new Error('Items de commande requis');
    }

    // Vérifier que la commande appartient à l'utilisateur
    const { data: existingOrder, error: checkError } = await admin
      .from('orders')
      .select('id, user_id')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (checkError || !existingOrder) {
      console.error('❌ Commande non trouvée ou non autorisée:', checkError);
      return NextResponse.json({
        error: 'Commande non trouvée ou non autorisée'
      }, { status: 404 });
    }

    // Calculer les totaux
    let calculatedTotalAmount = totalAmount || 0;
    let calculatedTotalItems = totalItems || 0;

    calculatedTotalItems = Object.values(items).reduce((sum: number, qty: any) => 
      sum + (typeof qty === 'number' ? qty : 0), 0
    );

    // Récupérer les prix pour calculer le montant
    const skus = Object.keys(items);
    if (skus.length > 0) {
      const { data: products, error: productsError } = await admin
        .from('products')
        .select('sku, price_dbc')
        .in('sku', skus);

      if (!productsError && products) {
        calculatedTotalAmount = Object.entries(items).reduce((sum: number, [sku, qty]) => {
          const product = products.find(p => p.sku === sku);
          const quantity = typeof qty === 'number' ? qty : 0;
          return sum + (product ? product.price_dbc * quantity : 0);
        }, 0);
      }
    }

    // Recalculer les frais de livraison automatiquement
    const shippingCost = calculateShippingCost(calculatedTotalItems);
    
    // Mettre à jour la commande avec frais de livraison mis à jour
    const updateData: any = {
      total_amount: Math.round(calculatedTotalAmount * 100) / 100,
      total_items: calculatedTotalItems,
      shipping_cost: shippingCost,
      updated_at: new Date().toISOString()
    };

    if (name) {
      updateData.name = name;
    }

    const { data: order, error: orderError } = await admin
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .eq('user_id', userId)
      .select()
      .single();

    if (orderError) {
      console.error('❌ Erreur mise à jour commande:', orderError);
      throw new Error(`Erreur mise à jour commande: ${orderError.message}`);
    }

    console.log('✅ Commande mise à jour dans Supabase');

    // Supprimer les anciens items et ajouter les nouveaux
    const { error: deleteError } = await admin
      .from('order_items')
      .delete()
      .eq('order_id', orderId);

    if (deleteError) {
      console.warn('⚠️ Erreur suppression anciens items:', deleteError);
    }

    // Ajouter les nouveaux items
    if (Object.keys(items).length > 0) {
      const { data: products, error: productsError } = await admin
        .from('products')
        .select('sku, product_name, price_dbc')
        .in('sku', skus);

      if (!productsError && products) {
        const orderItemsData = Object.entries(items).map(([sku, quantity]) => {
          const product = products.find(p => p.sku === sku);
          const qty = typeof quantity === 'number' ? quantity : 0;
          const unitPrice = product?.price_dbc || 0;
          
          return {
            order_id: orderId,
            sku,
            product_name: product?.product_name || `Produit ${sku}`,
            quantity: qty,
            unit_price: unitPrice,
            total_price: unitPrice * qty
          };
        }).filter(item => item.quantity > 0);

        if (orderItemsData.length > 0) {
          const { error: itemsError } = await admin
            .from('order_items')
            .insert(orderItemsData);

          if (itemsError) {
            console.warn('⚠️ Erreur ajout nouveaux items:', itemsError);
          } else {
            console.log('✅ Nouveaux items ajoutés:', orderItemsData.length);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        name: order.name,
        status: order.status,
        status_label: order.status_label,
        total_amount: order.total_amount,
        total_items: order.total_items,
        updated_at: order.updated_at
      },
      message: `Commande "${order.name}" mise à jour avec succès`
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour commande draft:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erreur interne', 
        details: error instanceof Error ? error.stack : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// Supprimer les commandes en brouillon pour un utilisateur
export async function DELETE(request: Request) {
  try {
    console.log('🗑️ Suppression des commandes en brouillon...');

    const admin = getSupabaseAdmin();
    
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({
        error: 'userId requis'
      }, { status: 400 });
    }

    // Récupérer les commandes en brouillon pour cet utilisateur
    const { data: draftOrders, error: fetchError } = await admin
      .from('orders')
      .select('id, name')
      .eq('status', 'draft')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('❌ Erreur récupération commandes brouillon:', fetchError);
      return NextResponse.json({ 
        error: 'Erreur récupération commandes brouillon',
        details: fetchError.message 
      }, { status: 500 });
    }

    if (!draftOrders || draftOrders.length === 0) {
      console.log('ℹ️ Aucune commande en brouillon à supprimer');
      return NextResponse.json({ 
        message: 'Aucune commande en brouillon trouvée',
        deletedCount: 0 
      });
    }

    console.log(`🔍 ${draftOrders.length} commande(s) en brouillon trouvée(s):`, draftOrders.map((order: any) => order.name));

    // Supprimer les commandes en brouillon pour cet utilisateur
    const { error: deleteError } = await admin
      .from('orders')
      .delete()
      .eq('status', 'draft')
      .eq('user_id', userId);

    if (deleteError) {
      console.error('❌ Erreur suppression commandes brouillon:', deleteError);
      return NextResponse.json({ 
        error: 'Erreur suppression commandes brouillon',
        details: deleteError.message 
      }, { status: 500 });
    }

    console.log('✅ Commandes en brouillon supprimées:', draftOrders.length);

    return NextResponse.json({
      message: `${draftOrders.length} commande(s) en brouillon supprimée(s)`,
      deletedCount: draftOrders.length
    });

  } catch (error) {
    console.error('❌ Erreur suppression commandes draft:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erreur interne', 
        details: error instanceof Error ? error.stack : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
} 