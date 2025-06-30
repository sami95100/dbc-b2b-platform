import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { spawn } from 'child_process';
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

    // Obtenir les statistiques AVANT import pour comparaison
    const { count: oldCount } = await admin
      .from('products')
      .select('*', { count: 'exact', head: true });

    // Sauvegarder le fichier temporairement
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const timestamp = Date.now();
    const tempDir = join(process.cwd(), 'temp');
    const tempPath = join(tempDir, `catalog_${timestamp}.xlsx`);
    
    // Créer le dossier temp s'il n'existe pas
    try {
      await mkdir(tempDir, { recursive: true });
    } catch (err) {
      // Dossier existe déjà ou erreur de permissions
    }
    
    await writeFile(tempPath, buffer);

    // Exécuter le script Python
    const pythonProcess = spawn('python3', [
      join(process.cwd(), 'backend/scripts/catalog_processor.py'),
      tempPath
    ]);

    let output = '';
    let errorOutput = '';

    // Collecter la sortie
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // Attendre la fin du processus
    const exitCode = await new Promise((resolve) => {
      pythonProcess.on('close', resolve);
    });

    // Nettoyer le fichier temporaire
    try {
      await require('fs/promises').unlink(tempPath);
    } catch (err) {
      console.warn('Impossible de supprimer le fichier temporaire:', err);
    }

    if (exitCode !== 0) {
      console.error('=== ERREUR SCRIPT PYTHON - FALLBACK TYPESCRIPT ===');
      console.error('Exit code:', exitCode);
      console.error('STDERR:', errorOutput);
      console.error('STDOUT:', output);
      console.log('Tentative avec le processeur TypeScript...');
      
      try {
        // Fallback: Utiliser le processeur TypeScript
        const processor = new CatalogProcessorTS();
        const resultData = await processor.processAndImport(buffer);
        
        console.log('✅ Succès avec le processeur TypeScript');
        
        // Continuer avec la logique normale
        const { count: newCount } = await admin
          .from('products')
          .select('*', { count: 'exact', head: true });

        let newProducts: Array<{sku: string, product_name: string, price_dbc: number, quantity: number}> = [];
        if (resultData.new_skus && resultData.new_skus.length > 0) {
          const { data: newProductsData } = await admin
            .from('products')
            .select('sku, product_name, price_dbc, quantity')
            .in('sku', resultData.new_skus)
            .limit(50);
          
          newProducts = newProductsData || [];
        }

        const summary = {
          oldProductCount: oldCount || 0,
          newProductCount: newCount || 0,
          importedProducts: resultData.imported_count || 0,
          newSkus: resultData.new_skus_count || 0,
          stats: resultData.stats,
          processedAt: new Date().toISOString(),
          newProducts: newProducts,
          all_new_skus: resultData.all_new_skus || [],
          processingMethod: 'TypeScript (fallback)'
        };

        return NextResponse.json({ 
          success: true, 
          message: `Catalogue mis à jour avec succès (TypeScript): ${resultData.imported_count} produits traités`,
          summary,
          filename: file.name,
          size: file.size
        });
        
      } catch (tsError) {
        console.error('=== ERREUR TYPESCRIPT FALLBACK ===');
        console.error(tsError);
        
        return NextResponse.json({ 
          error: 'Erreur lors du traitement du catalogue (Python et TypeScript échoués)',
          details: {
            python: errorOutput || output,
            typescript: tsError instanceof Error ? tsError.message : String(tsError)
          },
          exitCode
        }, { status: 500 });
      }
    }

    // Parser le résultat JSON de la sortie Python
    const lines = output.trim().split('\n');
    let resultData = null;
    
    for (const line of lines.reverse()) {
      if (line.startsWith('{')) {
        try {
          resultData = JSON.parse(line);
          break;
        } catch (e) {
          continue;
        }
      }
    }

    if (!resultData || !resultData.success) {
      return NextResponse.json({ 
        error: 'Impossible de parser le résultat du traitement',
        details: output
      }, { status: 500 });
    }

    // Obtenir les nouvelles statistiques APRÈS import
    const { count: newCount } = await admin
      .from('products')
      .select('*', { count: 'exact', head: true });

    // Récupérer les nouveaux produits ajoutés (basé sur les SKU du résultat)
    let newProducts: Array<{sku: string, product_name: string, price_dbc: number, quantity: number}> = [];
    if (resultData.new_skus && resultData.new_skus.length > 0) {
      const { data: newProductsData } = await admin
        .from('products')
        .select('sku, product_name, price_dbc, quantity')
        .in('sku', resultData.new_skus)
        .limit(50); // Limiter à 50 pour l'aperçu
      
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
      all_new_skus: resultData.all_new_skus || []  // Liste complète pour le filtre
    };

    return NextResponse.json({ 
      success: true, 
      message: `Catalogue mis à jour avec succès: ${resultData.imported_count} produits traités`,
      summary,
      filename: file.name,
      size: file.size
    });
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour du catalogue:', error);
    return NextResponse.json({ 
      error: 'Erreur lors du traitement du fichier',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 