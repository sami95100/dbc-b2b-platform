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
    case 'pending': return 'En attente';
    case 'validated': return 'Validée';
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

    // Récupérer la commande spécifique avec ses items et informations client
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
        user_id,
        free_shipping,
        users (
          id,
          company_name,
          contact_name,
          email
        ),
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

    // S'assurer que le status_label est correct et extraire le tracking
    const { users, ...orderWithoutUsers } = order;
    const correctedOrder = {
      ...orderWithoutUsers,
      status_label: getStatusLabel(order.status),
      tracking_number: order.customer_ref?.startsWith('TRACKING:') 
        ? order.customer_ref.replace('TRACKING:', '') 
        : null,
      client: users // Mapper 'users' vers 'client' pour la compatibilité frontend
    };

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

    console.log('🗑️ API DELETE - Début suppression commande:', orderId);

    // Vérifier d'abord que la commande existe
    const { data: existingOrder, error: checkError } = await admin
      .from('orders')
      .select('id, name, status')
      .eq('id', orderId)
      .single();

    if (checkError) {
      console.error('❌ Erreur vérification existence commande:', checkError);
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({
          error: 'Commande non trouvée',
          success: false
        }, { status: 404 });
      }
      throw checkError;
    }

    console.log('📋 Commande trouvée:', existingOrder);

    // Vérifier que c'est bien un brouillon
    if (existingOrder.status !== 'draft') {
      console.error('❌ Tentative de suppression d\'une commande non-brouillon:', existingOrder.status);
      return NextResponse.json({
        error: 'Seules les commandes en brouillon peuvent être supprimées',
        success: false
      }, { status: 400 });
    }

    // Supprimer d'abord les items de commande
    console.log('🗑️ Suppression des items de commande...');
    const { data: deletedItems, error: itemsError } = await admin
      .from('order_items')
      .delete()
      .eq('order_id', orderId)
      .select();

    if (itemsError) {
      console.error('❌ Erreur suppression items:', itemsError);
      throw itemsError;
    }

    console.log(`✅ ${deletedItems?.length || 0} items supprimés`);

    // Puis supprimer la commande
    console.log('🗑️ Suppression de la commande...');
    const { data: deletedOrder, error: orderError } = await admin
      .from('orders')
      .delete()
      .eq('id', orderId)
      .select();

    if (orderError) {
      console.error('❌ Erreur suppression commande:', orderError);
      throw orderError;
    }

    if (!deletedOrder || deletedOrder.length === 0) {
      console.error('❌ Aucune commande supprimée - ID introuvable:', orderId);
      return NextResponse.json({
        error: 'Commande non trouvée lors de la suppression',
        success: false
      }, { status: 404 });
    }

    console.log('✅ Commande supprimée avec succès:', deletedOrder[0]);

    return NextResponse.json({
      success: true,
      message: `Commande "${existingOrder.name}" supprimée avec succès`,
      orderId: orderId,
      deletedOrder: deletedOrder[0],
      cleanupLocalStorage: true
    });

  } catch (error) {
    console.error('❌ Erreur API suppression:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Erreur interne',
      success: false,
      details: error instanceof Error ? error.stack : 'Aucun détail disponible'
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
    const updateStatus = status || 'validated';
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