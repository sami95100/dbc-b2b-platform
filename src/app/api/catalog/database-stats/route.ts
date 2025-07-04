import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Configuration Supabase admin manquante' }, { status: 500 });
    }

    console.log('🔍 Analyse de la base de données...');

    // 1. Compter le total de produits
    const { count: totalProducts, error: countError } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return NextResponse.json({ error: `Erreur comptage: ${countError.message}` }, { status: 500 });
    }

    // 2. Statistiques détaillées
    const { data: products, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('sku, product_name, quantity, price_dbc, is_active, created_at')
      .limit(1000);

    if (fetchError) {
      return NextResponse.json({ error: `Erreur récupération: ${fetchError.message}` }, { status: 500 });
    }

    // 3. Analyser les données
    const activeProducts = products?.filter(p => p.is_active && p.quantity > 0).length || 0;
    const zeroStockProducts = products?.filter(p => p.quantity === 0).length || 0;
    const inactiveProducts = products?.filter(p => !p.is_active).length || 0;

    // 4. Échantillon de SKU pour analyse
    const sampleSkus = products?.slice(0, 20).map(p => ({
      sku: p.sku,
      name: p.product_name,
      quantity: p.quantity,
      price: p.price_dbc,
      active: p.is_active,
      created: p.created_at
    })) || [];

    // 5. Analyse des dates de création si disponibles
    const datesAnalysis: any = {};
    if (products && products.length > 0) {
      const withDates = products.filter(p => p.created_at);
      if (withDates.length > 0) {
        const sortedByDate = withDates.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        datesAnalysis.oldestProduct = {
          date: sortedByDate[0].created_at,
          sku: sortedByDate[0].sku
        };
        datesAnalysis.newestProduct = {
          date: sortedByDate[sortedByDate.length - 1].created_at,
          sku: sortedByDate[sortedByDate.length - 1].sku
        };
      }
    }

    // 6. Vérifier la table catalog_imports
    const { data: imports, error: importsError } = await supabaseAdmin
      .from('catalog_imports')
      .select('import_date, total_imported, new_skus, missing_skus')
      .order('import_date', { ascending: false })
      .limit(5);

    const result = {
      database: {
        totalProducts: totalProducts || 0,
        activeProducts,
        zeroStockProducts,
        inactiveProducts,
        sampleSkus,
        datesAnalysis
      },
      imports: {
        available: !importsError,
        recentImports: imports || [],
        error: importsError?.message
      },
      analysis: {
        seemsPartial: (totalProducts || 0) < 5000,
        possibleCauses: (totalProducts || 0) < 5000 ? [
          'Base de données partiellement vidée',
          'Import initial incomplet',
          'Problème de configuration',
          'Base de test avec données limitées'
        ] : ['Base semble complète']
      }
    };

    console.log('📊 Résultat analyse base:', result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Erreur analyse base:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de l\'analyse',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 