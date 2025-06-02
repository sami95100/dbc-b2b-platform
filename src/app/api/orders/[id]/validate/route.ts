import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';

// Fonction helper pour vérifier supabaseAdmin
function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Configuration Supabase admin manquante - vérifiez SUPABASE_SERVICE_ROLE_KEY dans .env.local');
  }
  return supabaseAdmin;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = getSupabaseAdmin();
    const orderId = params.id;
    const { orderItems } = await request.json();
    
    console.log('🚀 Validation commande via API:', orderId);
    console.log('📦 Items à valider:', orderItems.length);
    
    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return NextResponse.json({ 
        error: 'Items de commande manquants ou invalides',
        success: false 
      }, { status: 400 });
    }

    // 1. Vérifier le stock pour tous les produits en une seule requête
    const skus = orderItems.map((item: any) => item.sku);
    const { data: products, error: stockError } = await admin
      .from('products')
      .select('sku, quantity')
      .in('sku', skus);

    if (stockError) {
      console.error('❌ Erreur vérification stock:', stockError);
      throw stockError;
    }

    // 2. Valider la disponibilité de tous les produits
    const productMap = new Map(products?.map(p => [p.sku, p.quantity]) || []);
    const unavailableItems: string[] = [];
    
    for (const item of orderItems) {
      const availableStock = productMap.get(item.sku) || 0;
      if (availableStock < item.quantity) {
        unavailableItems.push(`${item.sku} (demandé: ${item.quantity}, disponible: ${availableStock})`);
      }
    }

    if (unavailableItems.length > 0) {
      return NextResponse.json({ 
        error: `Stock insuffisant pour: ${unavailableItems.join(', ')}`,
        success: false,
        unavailableItems
      }, { status: 400 });
    }

    // 3. Mettre à jour le statut de la commande
    const { data: order, error: orderError } = await admin
      .from('orders')
      .update({
        status: 'pending_payment',
        status_label: 'En attente de paiement',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (orderError) {
      console.error('❌ Erreur mise à jour statut commande:', orderError);
      throw orderError;
    }

    // 4. Décrémenter le stock pour tous les produits
    const stockUpdates: any[] = [];
    let updateErrors: string[] = [];

    for (const item of orderItems) {
      const currentStock = productMap.get(item.sku) || 0;
      const newQuantity = Math.max(0, currentStock - item.quantity);
      
      const { error: updateError } = await admin
        .from('products')
        .update({ 
          quantity: newQuantity
          // Ne plus désactiver les produits à 0 - les garder actifs pour recherche
        })
        .eq('sku', item.sku);

      if (updateError) {
        console.error(`❌ Erreur mise à jour stock ${item.sku}:`, updateError);
        updateErrors.push(`Erreur stock ${item.sku}: ${updateError.message}`);
      } else {
        stockUpdates.push({
          sku: item.sku,
          oldQuantity: currentStock,
          newQuantity: newQuantity,
          decrementedBy: item.quantity
        });
      }
    }

    console.log('✅ Validation terminée');
    console.log(`📊 Stock mis à jour pour ${stockUpdates.length} produits`);
    
    if (updateErrors.length > 0) {
      console.warn('⚠️ Erreurs mineures:', updateErrors);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Commande validée avec succès',
      order: order,
      stockUpdates: stockUpdates,
      warnings: updateErrors.length > 0 ? updateErrors : undefined
    });
    
  } catch (error) {
    console.error('❌ Erreur API validation:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erreur interne de validation',
      success: false 
    }, { status: 500 });
  }
} 