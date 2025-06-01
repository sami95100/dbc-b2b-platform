// Test script pour vérifier la création de commandes manuelles
const testCreateManualOrder = async () => {
  try {
    console.log('🧪 Test de création de commande manuelle...');
    
    const testOrder = {
      name: 'Test Commande Manuelle',
      items: {
        '102600600148': 2,
        '102600600117': 1
      },
      totalItems: 3
    };

    const response = await fetch('http://localhost:3000/api/orders/draft', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testOrder)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erreur API: ${errorData.error}`);
    }

    const result = await response.json();
    console.log('✅ Commande créée avec succès:', result);
    
    // Test de mise à jour
    console.log('🔄 Test de mise à jour de commande...');
    
    const updateData = {
      orderId: result.order.id,
      name: 'Test Commande Manuelle (Modifiée)',
      items: {
        '102600600148': 3,
        '102600600028': 2
      },
      totalItems: 5
    };

    const updateResponse = await fetch('http://localhost:3000/api/orders/draft', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      throw new Error(`Erreur mise à jour: ${errorData.error}`);
    }

    const updateResult = await updateResponse.json();
    console.log('✅ Commande mise à jour avec succès:', updateResult);

  } catch (error) {
    console.error('❌ Erreur test:', error);
  }
};

// Exécuter le test si le serveur est démarré
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = require('node-fetch');
  testCreateManualOrder();
} else {
  // Browser environment
  console.log('Script de test - exécutez testCreateManualOrder() dans la console');
  window.testCreateManualOrder = testCreateManualOrder;
} 