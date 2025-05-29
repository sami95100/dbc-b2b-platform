/**
 * 🔧 SCRIPT DE DIAGNOSTIC
 * Copier/coller dans la console du navigateur pour diagnostiquer les problèmes
 */

// Test 1: Vérifier localStorage
console.log('=== 📁 DIAGNOSTIC LOCALSTORAGE ===');
const draftOrders = JSON.parse(localStorage.getItem('draftOrders') || '{}');
const currentOrder = localStorage.getItem('currentDraftOrder');
console.log('Draft Orders:', Object.keys(draftOrders).length, 'commandes');
console.log('Current Order:', currentOrder);
console.log('Détail commandes:', draftOrders);

// Test 2: Vérifier connexion Supabase
console.log('\n=== 🗄️ DIAGNOSTIC SUPABASE ===');
async function testSupabase() {
  try {
    // Import depuis le module local (adapter selon votre structure)
    const { supabase } = await import('./lib/supabase.js');
    
    // Test de base - compter les produits
    const { data: products, error: productsError, count } = await supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .limit(5);

    if (productsError) {
      console.error('❌ Erreur produits:', productsError);
      return false;
    }

    console.log('✅ Connexion Supabase OK');
    console.log(`📦 Produits: ${products.length} chargés / ${count} total`);
    console.log('Échantillon:', products.map(p => ({ sku: p.sku, nom: p.product_name, stock: p.quantity })));

    // Test tables orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(1);

    if (ordersError) {
      console.warn('⚠️ Table orders:', ordersError.message);
      console.log('💡 Les tables de commandes ne sont peut-être pas créées');
    } else {
      console.log('✅ Table orders accessible');
    }

    // Test table order_items
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .limit(1);

    if (itemsError) {
      console.warn('⚠️ Table order_items:', itemsError.message);
    } else {
      console.log('✅ Table order_items accessible');
    }

    return true;

  } catch (error) {
    console.error('❌ Erreur critique Supabase:', error);
    console.log('💡 Vérifiez les variables d\'environnement NEXT_PUBLIC_SUPABASE_*');
    return false;
  }
}

// Test 3: Simulation validation commande
console.log('\n=== 🧪 TEST SIMULATION ===');
async function simulateValidation() {
  if (Object.keys(draftOrders).length === 0) {
    console.log('⚠️ Aucune commande brouillon pour tester');
    console.log('💡 Créez d\'abord une commande dans l\'interface');
    return;
  }

  const firstOrderId = Object.keys(draftOrders)[0];
  const firstOrder = draftOrders[firstOrderId];
  
  console.log('📋 Test avec commande:', firstOrderId);
  console.log('Produits:', Object.keys(firstOrder.items || {}));
  
  // Vérifier que les SKUs existent en base
  try {
    const { supabase } = await import('./lib/supabase.js');
    const skus = Object.keys(firstOrder.items || {});
    
    if (skus.length > 0) {
      const { data: products, error } = await supabase
        .from('products')
        .select('sku, product_name, quantity')
        .in('sku', skus);

      if (error) {
        console.error('❌ Erreur vérification SKUs:', error);
      } else {
        console.log('✅ SKUs trouvés en base:');
        products.forEach(p => {
          const qtyOrdered = firstOrder.items[p.sku];
          console.log(`  ${p.sku}: stock=${p.quantity}, commandé=${qtyOrdered}`);
          if (qtyOrdered > p.quantity) {
            console.warn(`  ⚠️ Stock insuffisant pour ${p.sku}`);
          }
        });
      }
    }
  } catch (error) {
    console.error('❌ Erreur simulation:', error);
  }
}

// Exécuter tous les tests
async function runDiagnostic() {
  console.log('🚀 DÉMARRAGE DIAGNOSTIC COMPLET');
  console.log('================================');
  
  const supabaseOK = await testSupabase();
  
  if (supabaseOK) {
    await simulateValidation();
  }
  
  console.log('\n=== 📊 RÉSUMÉ ===');
  console.log('1. LocalStorage:', Object.keys(draftOrders).length > 0 ? '✅' : '❌');
  console.log('2. Supabase:', supabaseOK ? '✅' : '❌');
  
  if (supabaseOK && Object.keys(draftOrders).length > 0) {
    console.log('🎉 Système prêt pour validation !');
    console.log('💡 Allez sur la page de détail d\'une commande et cliquez "Valider"');
  } else {
    console.log('🔧 Actions requises :');
    if (!supabaseOK) console.log('  - Vérifier configuration Supabase');
    if (Object.keys(draftOrders).length === 0) console.log('  - Créer une commande brouillon');
  }
}

// Auto-exécution
runDiagnostic();

// Fonctions utiles exportées
window.diagnostic = {
  testSupabase,
  simulateValidation,
  runDiagnostic,
  clearLocalStorage: () => {
    localStorage.removeItem('draftOrders');
    localStorage.removeItem('currentDraftOrder');
    console.log('🧹 LocalStorage nettoyé');
  }
}; 