/**
 * Calcule les frais de livraison selon le nombre de produits
 * - 1 produit: 15€
 * - Décroît progressivement jusqu'à 1€ pour 100+ produits
 */
export function calculateShippingCost(totalItems: number): number {
  if (totalItems <= 0) return 0;
  
  // Version basée exactement sur vos exemples:
  if (totalItems <= 2) return 13; // 1-2 produits: 13€
  if (totalItems <= 8) return 20; // 3-8 produits: 20€
  if (totalItems <= 14) return 25; // 9-14 produits: 25€
  if (totalItems <= 36) return 35; // 15-36 produits: 35€
  if (totalItems <= 45) return 45; // 37-45 produits: 45€
  
  // Pour 46-99 produits: interpolation vers ~100€ pour 100 produits
  if (totalItems <= 99) {
    const ratio = (totalItems - 45) / (100 - 45);
    return Math.round(45 + ratio * (100 - 45));
  }
  
  // Pour 100+ produits: formule basée sur vos exemples
  // 200 produits = 172€ (0.86€/produit)
  // 380 produits = 300€ (0.79€/produit)
  if (totalItems >= 200) {
    if (totalItems <= 380) {
      // Interpolation entre 200 produits (172€) et 380 produits (300€)
      const ratio = (totalItems - 200) / (380 - 200);
      return Math.round(172 + ratio * (300 - 172));
    }
    // Au-delà de 380 produits: environ 0.79€ par produit
    return Math.round(totalItems * 0.79);
  }
  
  // Entre 100 et 199 produits: interpolation entre 100€ (100 produits) et 172€ (200 produits)
  const ratio = (totalItems - 100) / (200 - 100);
  return Math.round(100 + ratio * (172 - 100));
}

/**
 * Formate le coût de livraison pour l'affichage
 */
export function formatShippingCost(cost: number): string {
  return `${cost.toFixed(2)}€`;
}

/**
 * Calcule les frais de livraison avec explication
 */
export function getShippingDetails(totalItems: number): {
  cost: number;
  explanation: string;
} {
  const cost = calculateShippingCost(totalItems);
  
  let explanation = '';
  if (totalItems <= 2) {
    explanation = 'Frais de base pour 1-2 produits';
  } else if (totalItems <= 8) {
    explanation = 'Frais pour 3-8 produits';
  } else if (totalItems <= 14) {
    explanation = 'Frais pour 9-14 produits';
  } else if (totalItems <= 36) {
    explanation = 'Frais pour 15-36 produits';
  } else if (totalItems <= 45) {
    explanation = 'Frais pour 37-45 produits';
  } else if (totalItems < 100) {
    explanation = 'Frais dégressifs pour commandes moyennes';
  } else {
    explanation = `Environ 1€ par produit pour ${totalItems} produits`;
  }
  
  return { cost, explanation };
} 