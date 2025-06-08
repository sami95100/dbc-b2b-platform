import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';

// Fonction helper pour vérifier supabaseAdmin
function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Configuration Supabase admin manquante - vérifiez SUPABASE_SERVICE_ROLE_KEY dans .env.local');
  }
  return supabaseAdmin;
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = getSupabaseAdmin();
    console.log('🚚 Mise à jour livraison pour commande:', params.id);

    const body = await request.json();
    const { tracking_number, shipping_cost, status } = body;

    // Si on passe directement au statut completed, le tracking number n'est pas obligatoire
    if (!tracking_number && status !== 'completed') {
      return NextResponse.json({ error: 'Numéro de tracking requis' }, { status: 400 });
    }

    // Vérifier que la commande existe
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('id, name, status, total_amount')
      .eq('id', params.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    // Vérifier que la commande est dans un statut permettant la mise à jour
    const allowedStatuses = ['pending', 'shipping'];
    if (!allowedStatuses.includes(order.status)) {
      return NextResponse.json({ 
        error: `Impossible de mettre à jour la livraison. Statut actuel: ${order.status}. Statuts autorisés: ${allowedStatuses.join(', ')}` 
      }, { status: 400 });
    }

    // Préparer les données de mise à jour
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Stocker le tracking_number dans customer_ref comme solution temporaire
    if (tracking_number) {
      updateData.customer_ref = `TRACKING:${tracking_number}`;
    }

    // Gérer les transitions de statut
    if (status) {
      if (status === 'shipping' && order.status === 'pending') {
        // Transition pending -> shipping (avec tracking)
        updateData.status = 'shipping';
        updateData.status_label = 'En cours de livraison';
      } else if (status === 'completed') {
        // Transition vers completed (depuis pending ou shipping)
        updateData.status = 'completed';
        updateData.status_label = 'Terminée';
      }
    } else if (tracking_number && order.status === 'pending') {
      // Si on ajoute un tracking à une commande pending, passer en shipping
      updateData.status = 'shipping';
      updateData.status_label = 'En cours de livraison';
    }

    // Mettre à jour la commande
    const { data: updatedOrder, error: updateError } = await admin
      .from('orders')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erreur mise à jour commande:', updateError);
      return NextResponse.json({ 
        error: `Erreur lors de la mise à jour: ${updateError.message}` 
      }, { status: 500 });
    }

    console.log('✅ Livraison mise à jour avec succès');

    const message = status === 'completed' && !tracking_number 
      ? 'Commande marquée comme terminée avec succès'
      : 'Informations de livraison mises à jour avec succès';

    return NextResponse.json({
      success: true,
      message,
      order: updatedOrder,
      tracking_number: tracking_number || null
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour livraison:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
} 