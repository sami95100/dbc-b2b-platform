import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';

// Fonction helper pour vérifier supabaseAdmin
function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Configuration Supabase admin manquante - vérifiez SUPABASE_SERVICE_ROLE_KEY dans .env.local');
  }
  return supabaseAdmin;
}

// Support both POST (validation) and PUT (revalidation)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleValidation(request, { params });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleValidation(request, { params }, true);
}

async function handleValidation(
  request: NextRequest,
  { params }: { params: { id: string } },
  isRevalidation: boolean = false
) {
  try {
    const admin = getSupabaseAdmin();
    const orderId = params.id;
    const { orderItems, items } = await request.json();
    
    // Support both 'orderItems' and 'items' for compatibility
    const itemsToValidate = orderItems || items;
    
    if (!itemsToValidate || !Array.isArray(itemsToValidate) || itemsToValidate.length === 0) {
      return NextResponse.json({ 
        error: 'Items de commande manquants ou invalides',
        success: false 
      }, { status: 400 });
    }

    // 1. Vérifier le stock pour tous les produits en une seule requête
    const skus = itemsToValidate.map((item: any) => item.sku);
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
    
    for (const item of itemsToValidate) {
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

    // 3. Mettre à jour le statut de la commande (seulement si c'est une validation initiale)
    let order;
    if (!isRevalidation) {
      const { data: orderData, error: orderError } = await admin
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
      order = orderData;
    } else {
      // Pour les revalidations, on récupère juste les données de la commande
      const { data: orderData, error: orderError } = await admin
        .from('orders')
        .select()
        .eq('id', orderId)
        .single();

      if (orderError) {
        console.error('❌ Erreur récupération commande:', orderError);
        throw orderError;
      }
      order = orderData;
    }

    // 4. Décrémenter le stock pour tous les produits
    const stockUpdates: any[] = [];
    let updateErrors: string[] = [];

    for (const item of itemsToValidate) {
      const currentStock = productMap.get(item.sku) || 0;
      const newQuantity = Math.max(0, currentStock - item.quantity);
      
      const { error: updateError } = await admin
        .from('products')
        .update({ 
          quantity: newQuantity
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