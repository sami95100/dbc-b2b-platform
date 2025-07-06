import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase admin not configured' }, { status: 500 });
    }
    
    const { searchParams } = new URL(request.url);
    const sku = searchParams.get('sku');
    
    if (sku) {
      // Récupérer un SKU spécifique avec toutes ses données
      const { data: product, error } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('sku', sku)
        .single();
      
      if (error) {
        return NextResponse.json({ error: `SKU ${sku} non trouvé: ${error.message}` }, { status: 404 });
      }
      
      return NextResponse.json({ 
        sku: product.sku,
        product_name: product.product_name,
        appearance: product.appearance,
        functionality: product.functionality,
        additional_info: product.additional_info,
        quantity: product.quantity,
        price_dbc: product.price_dbc,
        is_active: product.is_active,
        created_at: product.created_at,
        full_data: product
      });
    }
    
    // Code original pour récupérer tous les produits
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('sku, product_name, appearance, functionality, quantity, price_dbc, is_active')
      .limit(100);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      total_products: products?.length || 0,
      sample_products: products || []
    });
    
  } catch (error) {
    console.error('Erreur debug catalog:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
} 