import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { CatalogProcessorTS } from '../../../../lib/catalog-processor-ts';

// Fonction helper pour vérifier supabaseAdmin
function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Configuration Supabase admin manquante - vérifiez SUPABASE_SERVICE_ROLE_KEY dans .env.local');
  }
  return supabaseAdmin;
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== IMPORT CATALOGUE TYPESCRIPT ===');
    
    const admin = getSupabaseAdmin();
    
    const formData = await request.formData();
    const file = formData.get('catalog') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    // Vérifier que c'est un fichier Excel
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json({ error: 'Le fichier doit être un fichier Excel (.xlsx ou .xls)' }, { status: 400 });
    }

    console.log('Fichier reçu:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Obtenir les statistiques AVANT import pour comparaison
    const { count: oldCount } = await admin
      .from('products')
      .select('*', { count: 'exact', head: true });

    console.log('Produits existants:', oldCount);

    // Convertir le fichier en buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log('Démarrage du traitement TypeScript...');

    // Utiliser le processeur TypeScript
    const processor = new CatalogProcessorTS();
    const resultData = await processor.processAndImport(buffer);

    console.log('Traitement terminé:', resultData);

    // Obtenir les nouvelles statistiques APRÈS import
    const { count: newCount } = await admin
      .from('products')
      .select('*', { count: 'exact', head: true });

    console.log('Nouveaux produits en base:', newCount);

    // Récupérer les nouveaux produits ajoutés
    let newProducts: Array<{sku: string, product_name: string, price_dbc: number, quantity: number}> = [];
    if (resultData.new_skus && resultData.new_skus.length > 0) {
      const { data: newProductsData } = await admin
        .from('products')
        .select('sku, product_name, price_dbc, quantity')
        .in('sku', resultData.new_skus)
        .limit(50);
      
      newProducts = newProductsData || [];
    }

    // Créer un résumé détaillé
    const summary = {
      oldProductCount: oldCount || 0,
      newProductCount: newCount || 0,
      importedProducts: resultData.imported_count || 0,
      newSkus: resultData.new_skus_count || 0,
      stats: resultData.stats,
      processedAt: new Date().toISOString(),
      newProducts: newProducts,
      all_new_skus: resultData.all_new_skus || [],
      processingMethod: 'TypeScript (natif)'
    };

    console.log('Résumé final:', summary);

    return NextResponse.json({ 
      success: true, 
      message: `Catalogue mis à jour avec succès (TypeScript): ${resultData.imported_count} produits traités`,
      summary,
      filename: file.name,
      size: file.size
    });
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour du catalogue (TypeScript):', error);
    return NextResponse.json({ 
      error: 'Erreur lors du traitement du fichier (TypeScript)',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 