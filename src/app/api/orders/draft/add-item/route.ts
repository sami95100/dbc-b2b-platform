import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { sku, quantity, orderId, userId } = await request.json();

    if (!sku || !quantity || !orderId || !userId) {
      return NextResponse.json({ 
        error: 'SKU, quantity, orderId et userId requis' 
      }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ 
        error: 'Configuration Supabase manquante' 
      }, { status: 500 });
    }

    // Vérifier l'authentification côté client sera faite avant l'appel
    console.log(`📦 Ajout item ${sku} (qté: ${quantity}) à la commande ${orderId} pour utilisateur ${userId}`);

    // Récupérer les infos du produit
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('sku, product_name, price_dbc, quantity')
      .eq('sku', sku)
      .single();

    if (productError || !product) {
      return NextResponse.json({ 
        error: `Produit ${sku} non trouvé` 
      }, { status: 404 });
    }

    // Vérifier que la quantité demandée est disponible
    if (quantity > product.quantity) {
      return NextResponse.json({ 
        error: `Quantité demandée (${quantity}) supérieure au stock disponible (${product.quantity})` 
      }, { status: 400 });
    }

    // Vérifier que la commande existe et appartient à l'utilisateur
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, status')
      .eq('id', orderId)
      .eq('user_id', userId)
      .eq('status', 'draft')
      .single();

    if (orderError || !order) {
      return NextResponse.json({ 
        error: 'Commande draft non trouvée ou non autorisée' 
      }, { status: 404 });
    }

    // Calculer le prix total
    const unitPrice = product.price_dbc;
    const totalPrice = unitPrice * quantity;

    // Vérifier si l'item existe déjà dans la commande
    const { data: existingItem, error: checkError } = await supabaseAdmin
      .from('order_items')
      .select('id, quantity')
      .eq('order_id', orderId)
      .eq('sku', sku)
      .single();

    let result;

    if (existingItem) {
      // Mettre à jour la quantité existante
      const newQuantity = quantity; // Remplacer complètement la quantité
      const newTotalPrice = unitPrice * newQuantity;

      const { data: updatedItem, error: updateError } = await supabaseAdmin
        .from('order_items')
        .update({
          quantity: newQuantity,
          total_price: newTotalPrice
        })
        .eq('id', existingItem.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ 
          error: `Erreur mise à jour item: ${updateError.message}` 
        }, { status: 500 });
      }

      result = updatedItem;
    } else {
      // Créer un nouvel item
      const { data: newItem, error: insertError } = await supabaseAdmin
        .from('order_items')
        .insert({
          order_id: orderId,
          sku: sku,
          product_name: product.product_name,
          quantity: quantity,
          unit_price: unitPrice,
          total_price: totalPrice
        })
        .select()
        .single();

      if (insertError) {
        return NextResponse.json({ 
          error: `Erreur création item: ${insertError.message}` 
        }, { status: 500 });
      }

      result = newItem;
    }

    // Mettre à jour les totaux de la commande
    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select('quantity, total_price')
      .eq('order_id', orderId);

    if (itemsError) {
      console.warn('Erreur récupération items pour mise à jour totaux:', itemsError);
    } else {
      const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalAmount = orderItems.reduce((sum, item) => sum + item.total_price, 0);

      await supabaseAdmin
        .from('orders')
        .update({
          total_items: totalItems,
          total_amount: totalAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
    }

    console.log(`✅ Item ${sku} ajouté/mis à jour dans commande ${orderId}: ${quantity}x ${unitPrice}€`);

    return NextResponse.json({
      success: true,
      item: result,
      message: `${quantity}x ${product.product_name} ajouté à la commande`
    });

  } catch (error) {
    console.error('❌ Erreur ajout item:', error);
    return NextResponse.json({ 
      error: 'Erreur interne du serveur' 
    }, { status: 500 });
  }
} 