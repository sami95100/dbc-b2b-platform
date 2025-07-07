import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { freeShipping } = await request.json();
    const orderId = params.id;

    if (!supabaseAdmin) {
      return NextResponse.json({ 
        error: 'Configuration Supabase manquante' 
      }, { status: 500 });
    }

    console.log(`🚚 ${freeShipping ? 'Offrir' : 'Annuler'} livraison gratuite pour commande ${orderId}`);

    // Vérifier que la commande existe
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, name, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ 
        error: 'Commande non trouvée' 
      }, { status: 404 });
    }

    // Mettre à jour le statut de livraison gratuite
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        free_shipping: freeShipping,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ 
        error: `Erreur mise à jour livraison: ${updateError.message}` 
      }, { status: 500 });
    }

    const message = freeShipping ? 
      `Livraison gratuite offerte pour "${order.name}"` : 
      `Livraison gratuite annulée pour "${order.name}"`;

    console.log(`✅ ${message}`);

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: message
    });

  } catch (error) {
    console.error('❌ Erreur gestion livraison gratuite:', error);
    return NextResponse.json({ 
      error: 'Erreur interne du serveur' 
    }, { status: 500 });
  }
} 