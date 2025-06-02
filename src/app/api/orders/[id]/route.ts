import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

// Fonction helper pour vérifier supabaseAdmin
function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Configuration Supabase admin manquante - vérifiez SUPABASE_SERVICE_ROLE_KEY dans .env.local');
  }
  return supabaseAdmin;
}

// Fonction pour obtenir le label correct selon le statut
function getStatusLabel(status: string): string {
  switch (status) {
    case 'draft': return 'Brouillon';
    case 'pending_payment': return 'En attente de paiement';
    case 'shipping': return 'En cours de livraison';
    case 'completed': return 'Terminée';
    case 'cancelled': return 'Annulée';
    default: return status;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = getSupabaseAdmin();
    const orderId = params.id;
    
    console.log('🔍 Récupération commande spécifique:', orderId);
    
    // Récupérer la commande spécifique avec ses items
    const { data: order, error } = await admin
      .from('orders')
      .select(`
        id,
        name,
        status,
        status_label,
        customer_ref,
        created_at,
        updated_at,
        total_amount,
        total_items,
        vat_type,
        order_items (
          id,
          sku,
          product_name,
          quantity,
          unit_price,
          total_price
        )
      `)
      .eq('id', orderId)
      .single();

    if (error) {
      console.error('❌ Erreur récupération commande:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ 
          error: 'Commande non trouvée',
          success: false 
        }, { status: 404 });
      }
      throw error;
    }

    // S'assurer que le status_label est correct
    const correctedOrder = {
      ...order,
      status_label: getStatusLabel(order.status)
    };

    console.log('✅ Commande récupérée:', correctedOrder.id);

    return NextResponse.json({ 
      success: true, 
      order: correctedOrder
    });
    
  } catch (error) {
    console.error('❌ Erreur API récupération commande:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erreur interne',
      success: false 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = getSupabaseAdmin();
    const orderId = params.id;
    
    console.log('🗑️ Suppression de la commande:', orderId);
    
    // Supprimer d'abord les items de commande
    const { error: itemsError } = await admin
      .from('order_items')
      .delete()
      .eq('order_id', orderId);

    if (itemsError) {
      console.error('❌ Erreur suppression items:', itemsError);
      throw itemsError;
    }

    // Puis supprimer la commande
    const { error: orderError } = await admin
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (orderError) {
      console.error('❌ Erreur suppression commande:', orderError);
      throw orderError;
    }

    console.log('✅ Commande supprimée avec succès');

    return NextResponse.json({ 
      success: true,
      message: 'Commande supprimée avec succès',
      orderId: orderId,
      cleanupLocalStorage: true
    });
    
  } catch (error) {
    console.error('❌ Erreur API suppression:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erreur interne',
      success: false 
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = getSupabaseAdmin();
    const orderId = params.id;
    const body = await request.json();
    
    console.log('✏️ Mise à jour commande:', orderId);
    console.log('📋 Données reçues:', body);
    
    const { items, totalItems, totalAmount, status } = body;
    
    if (!items || !Array.isArray(items)) {
      throw new Error('Items de commande manquants ou invalides');
    }
    
    // Commencer une transaction
    // D'abord supprimer les anciens items
    const { error: deleteError } = await admin
      .from('order_items')
      .delete()
      .eq('order_id', orderId);
      
    if (deleteError) {
      console.error('❌ Erreur suppression anciens items:', deleteError);
      throw deleteError;
    }
    
    // Insérer les nouveaux items
    const orderItems = items.map((item: any) => ({
      order_id: orderId,
      sku: item.sku,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price
    }));
    
    const { error: insertError } = await admin
      .from('order_items')
      .insert(orderItems);
      
    if (insertError) {
      console.error('❌ Erreur insertion nouveaux items:', insertError);
      throw insertError;
    }
    
    // Mettre à jour la commande
    const updateStatus = status || 'pending_payment';
    const { error: updateError } = await admin
      .from('orders')
      .update({
        total_items: totalItems,
        total_amount: totalAmount,
        status: updateStatus,
        status_label: getStatusLabel(updateStatus),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
      
    if (updateError) {
      console.error('❌ Erreur mise à jour commande:', updateError);
      throw updateError;
    }
    
    console.log('✅ Commande mise à jour avec succès');
    console.log('📊 Nouveau total:', totalAmount, '€');
    console.log('📦 Nouveaux items:', totalItems);
    
    return NextResponse.json({ 
      success: true,
      message: 'Commande mise à jour avec succès',
      orderId: orderId,
      totalAmount,
      totalItems
    });
    
  } catch (error) {
    console.error('❌ Erreur API mise à jour:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erreur interne',
      success: false 
    }, { status: 500 });
  }
} 