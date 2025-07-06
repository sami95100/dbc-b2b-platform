import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { sku, orderId, userId } = await request.json();

    if (!sku || !orderId || !userId) {
      return NextResponse.json({ 
        error: 'SKU, orderId et userId requis' 
      }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ 
        error: 'Configuration Supabase manquante' 
      }, { status: 500 });
    }

    console.log(`🗑️ Suppression item ${sku} de la commande ${orderId} pour utilisateur ${userId}`);

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

    // Supprimer l'item de la commande
    const { error: deleteError } = await supabaseAdmin
      .from('order_items')
      .delete()
      .eq('order_id', orderId)
      .eq('sku', sku);

    if (deleteError) {
      return NextResponse.json({ 
        error: `Erreur suppression item: ${deleteError.message}` 
      }, { status: 500 });
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

    console.log(`✅ Item ${sku} supprimé de la commande ${orderId}`);

    return NextResponse.json({
      success: true,
      message: `Produit ${sku} supprimé de la commande`
    });

  } catch (error) {
    console.error('❌ Erreur suppression item:', error);
    return NextResponse.json({ 
      error: 'Erreur interne du serveur' 
    }, { status: 500 });
  }
} 