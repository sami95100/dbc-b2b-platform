import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../../lib/supabase';

// Fonction helper pour vérifier supabaseAdmin
function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Configuration Supabase admin manquante - vérifiez SUPABASE_SERVICE_ROLE_KEY dans .env.local');
  }
  return supabaseAdmin;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = getSupabaseAdmin();
    console.log('📱 Récupération IMEI pour commande:', params.id);

    // Vérifier que la commande existe
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('id, name, status')
      .eq('id', params.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    // Récupérer les order_items de la commande
    const { data: orderItems, error: itemsError } = await admin
      .from('order_items')
      .select('id, sku, product_name, quantity')
      .eq('order_id', params.id);

    if (itemsError) {
      return NextResponse.json({ error: 'Erreur récupération des articles' }, { status: 500 });
    }

    if (!orderItems || orderItems.length === 0) {
      return NextResponse.json({
        success: true,
        imeiData: [],
        message: 'Aucun article dans cette commande'
      });
    }

    // Récupérer les IMEI pour ces order_items
    const orderItemIds = orderItems.map(item => item.id);
    
    const { data: imeiData, error: imeiError } = await admin
      .from('order_item_imei')
      .select(`
        id,
        order_item_id,
        sku,
        imei,
        product_name,
        appearance,
        functionality,
        boxed,
        color,
        cloud_lock,
        additional_info,
        supplier_price,
        dbc_price
      `)
      .in('order_item_id', orderItemIds)
      .order('sku');

    if (imeiError) {
      console.error('❌ Erreur récupération IMEI:', imeiError);
      return NextResponse.json({ error: 'Erreur récupération IMEI' }, { status: 500 });
    }

    console.log(`✅ ${imeiData?.length || 0} IMEI trouvés pour la commande ${order.name}`);

    return NextResponse.json({
      success: true,
      imeiData: imeiData || [],
      orderInfo: {
        id: order.id,
        name: order.name,
        status: order.status
      },
      summary: {
        totalImei: imeiData?.length || 0,
        totalItems: orderItems.length
      }
    });

  } catch (error) {
    console.error('❌ Erreur API liste IMEI:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
} 