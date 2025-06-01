import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Début du nettoyage des données de test...');
    
    const body = await request.json();
    const { action, confirm } = body;

    if (!confirm || confirm !== 'YES_DELETE_TEST_DATA') {
      return NextResponse.json({
        error: 'Confirmation requise. Utilisez { "action": "cleanup", "confirm": "YES_DELETE_TEST_DATA" }'
      }, { status: 400 });
    }

    if (action === 'cleanup') {
      // Supprimer les produits de test (ceux qui commencent par NOUVEAU_, TEST_, INEXISTANT_)
      console.log('🗑️ Suppression des produits de test...');
      
      const testSkuPatterns = ['NOUVEAU_%', 'TEST_%', 'INEXISTANT_%', 'STOCK_ZERO_%'];
      let totalDeleted = 0;
      
      for (const pattern of testSkuPatterns) {
        const { error: deleteError, count } = await supabaseAdmin
          .from('products')
          .delete()
          .like('sku', pattern);

        if (deleteError) {
          console.error(`❌ Erreur suppression pattern ${pattern}:`, deleteError);
        } else {
          console.log(`✅ Supprimé ${count || 0} produits avec pattern ${pattern}`);
          totalDeleted += count || 0;
        }
      }

      // Supprimer les commandes de test (imports automatiques)
      console.log('🗑️ Suppression des commandes de test...');
      
      const { error: ordersDeleteError, count: ordersCount } = await supabaseAdmin
        .from('orders')
        .delete()
        .or('customer_ref.eq.IMPORT-AUTO,name.ilike.Import %');

      if (ordersDeleteError) {
        console.error('❌ Erreur suppression commandes test:', ordersDeleteError);
      } else {
        console.log(`✅ Supprimé ${ordersCount || 0} commandes de test`);
      }

      console.log('✅ Nettoyage terminé');

      return NextResponse.json({
        success: true,
        message: `Nettoyage terminé: ${totalDeleted} produits et ${ordersCount || 0} commandes supprimés`,
        details: {
          productsDeleted: totalDeleted,
          ordersDeleted: ordersCount || 0
        }
      });

    } else {
      return NextResponse.json({
        error: 'Action non reconnue. Utilisez "cleanup"'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Erreur nettoyage:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne'
      },
      { status: 500 }
    );
  }
} 