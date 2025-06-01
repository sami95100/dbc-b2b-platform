# Correction : Validation de Commande Sans Doublons

## Problème identifié

Quand l'utilisateur validait une commande en cliquant sur "Valider la commande", le système **créait une nouvelle commande** au lieu de simplement changer le statut de la commande existante de "Brouillon" à "En attente de paiement".

### Comportement problématique :

- Commande 1 : Status "Brouillon" → reste en "Brouillon"
- Commande 2 : **NOUVELLE** commande créée avec status "En attente de paiement"

Résultat : Doublons de commandes dans la liste.

## Cause du problème

Dans `src/lib/supabase.ts`, la fonction `validateOrder` utilisait :

```typescript
// ❌ AVANT : Créait une nouvelle commande
const { data: order } = await supabase
  .from("orders")
  .insert([orderData]) // ← INSERT = nouvelle commande
  .select()
  .single();
```

## Solution implémentée

Modification de la fonction `validateOrder` pour utiliser `UPDATE` au lieu de `INSERT` :

```typescript
// ✅ APRÈS : Met à jour la commande existante
const { data: order } = await supabase
  .from("orders")
  .update({
    status: "pending_payment",
    status_label: "En attente de paiement",
    updated_at: new Date().toISOString(),
  })
  .eq("id", orderId) // ← Met à jour par ID
  .select()
  .single();
```

### Changements apportés :

1. **Suppression** de la création d'une nouvelle commande
2. **Remplacement** par une mise à jour du statut
3. **Suppression** de la re-création des items (ils existent déjà)
4. **Conservation** de la logique de décrémentation du stock

## Comportement corrigé

Maintenant, quand l'utilisateur valide une commande :

1. ✅ **Status change** : "Brouillon" → "En attente de paiement"
2. ✅ **Même commande** : Pas de nouvelle commande créée
3. ✅ **Stock décrémenté** : Les quantités sont bien soustraites
4. ✅ **UUID préservé** : L'ID de la commande reste le même

## Test de la correction

1. Créer une commande manuelle dans `/catalog`
2. Aller dans `/orders` → voir la commande en "Brouillon"
3. Cliquer sur "Voir détails" → "Valider la commande"
4. Retourner dans `/orders` → voir la **même commande** en "En attente de paiement"
5. ✅ **Pas de doublon**

## Résultat

Plus de commandes dupliquées ! La validation change simplement le statut de la commande existante, comme attendu.
