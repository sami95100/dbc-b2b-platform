import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';

// Fonction helper pour vérifier supabaseAdmin
function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Configuration Supabase admin manquante - vérifiez SUPABASE_SERVICE_ROLE_KEY dans .env.local');
  }
  return supabaseAdmin;
}

export async function GET(request: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    
    console.log('📦 Récupération des commandes avec admin...');
    
    // Récupérer toutes les commandes avec leurs items
    const { data: orders, error } = await admin
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
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur récupération commandes:', error);
      throw error;
    }

    console.log(`✅ ${orders?.length || 0} commandes récupérées`);

    return NextResponse.json({ 
      success: true, 
      orders: orders || [],
      count: orders?.length || 0
    });
    
  } catch (error) {
    console.error('❌ Erreur API orders:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erreur interne',
      success: false 
    }, { status: 500 });
  }
} 