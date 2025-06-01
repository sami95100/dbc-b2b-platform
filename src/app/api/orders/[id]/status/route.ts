import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orderId = params.id;
    const body = await request.json();
    const { action } = body; // 'delete' ou 'cancel'

    console.log(`🔄 Action "${action}" sur commande ${orderId}`);

    // Récupérer la commande actuelle
    const { data: currentOrder, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, name, status, status_label')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      console.error('❌ Erreur récupération commande:', fetchError);
      throw new Error(`Commande non trouvée: ${fetchError.message}`);
    }

    if (!currentOrder) {
      throw new Error('Commande non trouvée');
    }

    console.log(`📋 Commande actuelle: ${currentOrder.name} (${currentOrder.status})`);

    if (action === 'delete') {
      // Suppression seulement si la commande est en brouillon
      if (currentOrder.status !== 'draft') {
        throw new Error('Seules les commandes en brouillon peuvent être supprimées. Utilisez l\'annulation pour les autres statuts.');
      }

      console.log('🗑️ Suppression de la commande en brouillon...');

      // Supprimer les items d'abord (cascade devrait s'en occuper mais par sécurité)
      const { error: itemsDeleteError } = await supabaseAdmin
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      if (itemsDeleteError) {
        console.warn('⚠️ Erreur suppression items:', itemsDeleteError);
      }

      // Supprimer la commande
      const { error: orderDeleteError } = await supabaseAdmin
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (orderDeleteError) {
        console.error('❌ Erreur suppression commande:', orderDeleteError);
        throw new Error(`Erreur lors de la suppression: ${orderDeleteError.message}`);
      }

      console.log('✅ Commande supprimée avec succès');

      return NextResponse.json({
        success: true,
        action: 'deleted',
        message: `Commande "${currentOrder.name}" supprimée avec succès`
      });

    } else if (action === 'cancel') {
      // Annulation pour toutes les commandes (sauf déjà annulées)
      if (currentOrder.status === 'cancelled') {
        throw new Error('Cette commande est déjà annulée');
      }

      console.log('❌ Annulation de la commande...');

      const { error: cancelError } = await supabaseAdmin
        .from('orders')
        .update({
          status: 'cancelled',
          status_label: 'Annulée',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (cancelError) {
        console.error('❌ Erreur annulation commande:', cancelError);
        throw new Error(`Erreur lors de l'annulation: ${cancelError.message}`);
      }

      console.log('✅ Commande annulée avec succès');

      return NextResponse.json({
        success: true,
        action: 'cancelled',
        order: {
          id: orderId,
          status: 'cancelled',
          status_label: 'Annulée'
        },
        message: `Commande "${currentOrder.name}" annulée avec succès`
      });

    } else {
      throw new Error(`Action non reconnue: ${action}`);
    }

  } catch (error) {
    console.error('❌ Erreur gestion statut commande:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne'
      },
      { status: 500 }
    );
  }
} 