import { NextRequest, NextResponse } from 'next/server';
import { calculateShippingCost, getShippingDetails } from '../../../../lib/shipping';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const items = searchParams.get('items');

    if (items) {
      // Test pour un nombre spécifique
      const totalItems = parseInt(items);
      if (isNaN(totalItems) || totalItems < 0) {
        return NextResponse.json({ error: 'Nombre d\'items invalide' }, { status: 400 });
      }

      const details = getShippingDetails(totalItems);
      return NextResponse.json({
        totalItems,
        shippingCost: details.cost,
        explanation: details.explanation,
        formattedCost: `${details.cost.toFixed(2)}€`
      });
    }

    // Tests complets selon les exemples de l'utilisateur
    const testCases = [
      { items: 1, expected: 13 },
      { items: 2, expected: 13 },
      { items: 8, expected: 20 },
      { items: 14, expected: 25 },
      { items: 36, expected: 35 },
      { items: 45, expected: 45 },
      { items: 200, expected: 172 },
      { items: 380, expected: 300 }
    ];

    const results = testCases.map(test => {
      const calculated = calculateShippingCost(test.items);
      const details = getShippingDetails(test.items);
      
      return {
        items: test.items,
        expected: test.expected,
        calculated,
        match: calculated === test.expected,
        explanation: details.explanation
      };
    });

    // Tests supplémentaires pour les intervalles
    const additionalTests = [
      { items: 50, description: 'Commande moyenne (46-99 produits)' },
      { items: 100, description: 'Seuil des 100 produits' },
      { items: 150, description: 'Commande intermédiaire (100-199 produits)' },
      { items: 500, description: 'Très grande commande (380+ produits)' }
    ].map(test => {
      const details = getShippingDetails(test.items);
      return {
        items: test.items,
        cost: details.cost,
        explanation: details.explanation,
        description: test.description
      };
    });

    return NextResponse.json({
      message: 'Test du calcul automatique des frais de livraison',
      userExamples: results,
      additionalTests,
      summary: {
        allTestsPassed: results.every(r => r.match),
        totalTestsRun: results.length,
        passedTests: results.filter(r => r.match).length
      }
    });

  } catch (error) {
    console.error('❌ Erreur test shipping:', error);
    return NextResponse.json({ 
      error: 'Erreur interne du serveur' 
    }, { status: 500 });
  }
} 