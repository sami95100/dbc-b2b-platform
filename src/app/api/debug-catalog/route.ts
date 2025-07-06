import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';

export async function GET() {
  try {
    const admin = supabaseAdmin;
    
    if (!admin) {
      return NextResponse.json({ error: 'Supabase admin not configured' }, { status: 500 });
    }

    // Statistiques générales
    const { count: totalProducts } = await admin
      .from('products')
      .select('*', { count: 'exact', head: true });

    const { count: zeroQuantityProducts } = await admin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('quantity', 0);

    const { count: activeProducts } = await admin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .gt('quantity', 0);

    // Récupérer quelques exemples de produits à quantité 0
    const { data: zeroQuantityExamples } = await admin
      .from('products')
      .select('sku, product_name, quantity, is_active')
      .eq('quantity', 0)
      .limit(20);

    // Récupérer quelques exemples de produits actifs
    const { data: activeExamples } = await admin
      .from('products')
      .select('sku, product_name, quantity, is_active')
      .gt('quantity', 0)
      .limit(10);

    // Récupérer le dernier import
    const { data: lastImport } = await admin
      .from('catalog_imports')
      .select('*')
      .order('import_date', { ascending: false })
      .limit(1);

    return NextResponse.json({
      success: true,
      stats: {
        totalProducts: totalProducts || 0,
        zeroQuantityProducts: zeroQuantityProducts || 0,
        activeProducts: activeProducts || 0,
        percentageZeroQuantity: (totalProducts && totalProducts > 0) ? (((zeroQuantityProducts || 0) / totalProducts) * 100).toFixed(1) : 0
      },
      examples: {
        zeroQuantityExamples: zeroQuantityExamples || [],
        activeExamples: activeExamples || []
      },
      lastImport: lastImport?.[0] || null
    });
    
  } catch (error) {
    console.error('Error in debug catalog:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 