import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Configuration Supabase admin manquante' }, { status: 500 });
    }

    // Vérifier d'abord si la table catalog_imports existe
    const { data: tableExists, error: tableError } = await supabaseAdmin
      .from('catalog_imports')
      .select('id')
      .limit(1);

    if (tableError) {
      console.log('Table catalog_imports non trouvée, retour de données vides');
      return NextResponse.json({ data: null });
    }

    // Récupérer le dernier import directement
    const { data: latestImport, error } = await supabaseAdmin
      .from('catalog_imports')
      .select('*')
      .order('import_date', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // Aucune donnée trouvée
        return NextResponse.json({ data: null });
      }
      console.error('Erreur récupération dernier import:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!latestImport) {
      return NextResponse.json({ data: null });
    }

    const newSkus = latestImport.new_skus || [];
    const restockedSkus = latestImport.restocked_skus || [];
    const missingSkus = latestImport.missing_skus || [];
    const totalNewProducts = newSkus.length + restockedSkus.length;

    return NextResponse.json({
      data: {
        importDate: latestImport.import_date,
        totalNewProducts,
        newSkus,
        restockedSkus,
        missingSkus,
        totalMissingProducts: missingSkus.length
      }
    });
    
  } catch (error) {
    console.error('Erreur API import-info:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }, { status: 500 });
  }
} 