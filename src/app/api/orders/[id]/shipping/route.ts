import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('🚚 Mise à jour livraison pour commande:', params.id);

    const body = await request.json();
    const { tracking_number, shipping_cost, status } = body;

    if (!tracking_number) {
      return NextResponse.json({ error: 'Numéro de tracking requis' }, { status: 400 });
    }

    // Vérifier que la commande existe et est en statut shipping
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, name, status, total_amount')
      .eq('id', params.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    if (order.status !== 'shipping') {
      return NextResponse.json({ 
        error: `Impossible de mettre à jour la livraison. La commande doit être en statut "shipping", statut actuel: ${order.status}` 
      }, { status: 400 });
    }

    // Préparer les données de mise à jour
    const updateData: any = {
      tracking_number,
      updated_at: new Date().toISOString()
    };

    // Ajouter les frais de livraison au montant total si fourni
    if (shipping_cost && shipping_cost > 0) {
      updateData.total_amount = order.total_amount + shipping_cost;
      updateData.shipping_cost = shipping_cost;
    }

    // Si un nouveau statut est fourni, l'utiliser
    if (status === 'completed') {
      updateData.status = 'completed';
    }

    // Mettre à jour la commande
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
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

    return NextResponse.json({
      success: true,
      message: 'Informations de livraison mises à jour avec succès',
      order: updatedOrder,
      tracking_number,
      shipping_cost: shipping_cost || 0
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour livraison:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
} 