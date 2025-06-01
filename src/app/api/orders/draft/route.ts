import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Création d\'une commande draft...');
    
    const body = await request.json();
    const { name, items, totalAmount, totalItems } = body;

    console.log('📋 Paramètres reçus:');
    console.log('- Nom:', name);
    console.log('- Nombre d\'items:', Object.keys(items || {}).length);
    console.log('- Montant total:', totalAmount);
    console.log('- Items total:', totalItems);

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
        const { data: products, error: productsError } = await supabaseAdmin
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

    // Créer la commande dans Supabase
    const orderData = {
      name,
      status: 'draft' as const,
      status_label: 'Brouillon',
      total_amount: Math.round(calculatedTotalAmount * 100) / 100,
      total_items: calculatedTotalItems,
      customer_ref: 'DBC-CLIENT-001',
      vat_type: 'Bien d\'occasion - TVA calculée sur la marge'
    };

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert([orderData])
      .select()
      .single();

    if (orderError) {
      console.error('❌ Erreur création commande:', orderError);
      throw new Error(`Erreur création commande: ${orderError.message}`);
    }

    console.log('✅ Commande créée dans Supabase:', order.id);

    // Ajouter les items de commande
    if (Object.keys(items).length > 0) {
      // Récupérer les infos produits pour les items
      const skus = Object.keys(items);
      const { data: products, error: productsError } = await supabaseAdmin
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
        const { error: itemsError } = await supabaseAdmin
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
    
    const body = await request.json();
    const { orderId, name, items, totalAmount, totalItems } = body;

    console.log('📋 Paramètres de mise à jour:');
    console.log('- ID commande:', orderId);
    console.log('- Nom:', name);
    console.log('- Nombre d\'items:', Object.keys(items || {}).length);

    // Validation
    if (!orderId) {
      throw new Error('ID de commande requis');
    }

    if (!items || typeof items !== 'object') {
      throw new Error('Items de commande requis');
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
      const { data: products, error: productsError } = await supabaseAdmin
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

    // Mettre à jour la commande
    const updateData: any = {
      total_amount: Math.round(calculatedTotalAmount * 100) / 100,
      total_items: calculatedTotalItems,
      updated_at: new Date().toISOString()
    };

    if (name) {
      updateData.name = name;
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (orderError) {
      console.error('❌ Erreur mise à jour commande:', orderError);
      throw new Error(`Erreur mise à jour commande: ${orderError.message}`);
    }

    console.log('✅ Commande mise à jour dans Supabase');

    // Supprimer les anciens items et ajouter les nouveaux
    const { error: deleteError } = await supabaseAdmin
      .from('order_items')
      .delete()
      .eq('order_id', orderId);

    if (deleteError) {
      console.warn('⚠️ Erreur suppression anciens items:', deleteError);
    }

    // Ajouter les nouveaux items
    if (Object.keys(items).length > 0) {
      const { data: products, error: productsError } = await supabaseAdmin
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
          const { error: itemsError } = await supabaseAdmin
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