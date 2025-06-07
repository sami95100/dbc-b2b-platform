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
    
    console.log('📱 Récupération des IMEI pour commande:', params.id);

    // 1. Vérifier que la commande existe
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('id, name, status')
      .eq('id', params.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    // 2. Récupérer les IDs des order_items pour cette commande
    const { data: orderItems, error: orderItemsError } = await admin
      .from('order_items')
      .select('id')
      .eq('order_id', params.id);

    if (orderItemsError) {
      console.error('❌ Erreur récupération order_items:', orderItemsError);
      return NextResponse.json({ error: 'Erreur récupération des articles' }, { status: 500 });
    }

    if (!orderItems || orderItems.length === 0) {
      console.log('⚠️ Aucun order_item trouvé pour cette commande');
      return NextResponse.json({ imeiData: [] });
    }

    const orderItemIds = orderItems.map(item => item.id);

    // 3. Récupérer les IMEI correspondants
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
        dbc_price,
        created_at
      `)
      .in('order_item_id', orderItemIds)
      .order('sku');

    if (imeiError) {
      console.error('❌ Erreur récupération IMEI:', imeiError);
      return NextResponse.json({ error: 'Erreur récupération des IMEI' }, { status: 500 });
    }

    console.log(`✅ ${imeiData?.length || 0} IMEI trouvés`);

    return NextResponse.json({ 
      imeiData: imeiData || [],
      orderStatus: order.status 
    });

  } catch (error) {
    console.error('❌ Erreur récupération IMEI:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
} 