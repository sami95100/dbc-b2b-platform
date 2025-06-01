# Solution : Commandes Manuelles dans Supabase

## Problème identifié

Les commandes créées manuellement (en sélectionnant des produits dans le catalogue) n'étaient sauvegardées que dans `localStorage` et n'apparaissaient pas dans Supabase avec le statut "draft". Seules les commandes importées via Excel étaient correctement sauvegardées dans Supabase.

## Solution implémentée

### 1. Nouvelle API Route : `/api/orders/draft`

**Fichier créé :** `src/app/api/orders/draft/route.ts`

Cette API route gère :

- **POST** : Création d'une nouvelle commande draft dans Supabase
- **PUT** : Mise à jour d'une commande draft existante

#### Fonctionnalités :

- Calcul automatique des totaux (montant et quantité)
- Récupération des prix depuis la base de données
- Création des items de commande avec détails produits
- Gestion d'erreurs robuste avec fallback localStorage

### 2. Modifications du catalogue (`src/app/catalog/page.tsx`)

#### Fonction `createNewOrder` (ligne ~748)

- Maintenant **asynchrone**
- Appelle l'API `/api/orders/draft` pour créer la commande dans Supabase
- Utilise l'UUID généré par Supabase comme ID de commande
- Fallback vers localStorage en cas d'erreur

#### Fonction `saveDraftOrdersToLocalStorage` (ligne ~248)

- Maintenant **asynchrone**
- Synchronise automatiquement avec Supabase via `syncOrderWithSupabase`
- Mise à jour en temps réel des commandes manuelles

#### Fonctions de panier asynchrones

- `addToCartWithQuantity` : Synchronise chaque ajout avec Supabase
- `updateQuantity` : Synchronise chaque modification avec Supabase
- `decrementQuantity` : Synchronise chaque suppression avec Supabase

### 3. Synchronisation automatique

La fonction `syncOrderWithSupabase` :

- Appelée automatiquement lors des modifications du panier
- Utilise l'API PUT pour mettre à jour la commande dans Supabase
- Gestion d'erreurs silencieuse (ne bloque pas l'interface)

## Flux de fonctionnement

### Création d'une commande manuelle :

1. Utilisateur sélectionne des produits dans le catalogue
2. Popup de nom de commande apparaît
3. **Nouveau** : Appel API POST `/api/orders/draft`
4. Commande créée dans Supabase avec statut "draft"
5. UUID Supabase utilisé comme ID de commande
6. Sauvegarde locale avec référence Supabase

### Modification du panier :

1. Utilisateur modifie les quantités
2. **Nouveau** : Synchronisation automatique avec Supabase
3. Appel API PUT `/api/orders/draft`
4. Mise à jour en temps réel dans Supabase

## Avantages de la solution

✅ **Cohérence** : Toutes les commandes (import + manuelles) sont dans Supabase  
✅ **Temps réel** : Synchronisation automatique des modifications  
✅ **Robustesse** : Fallback localStorage en cas d'erreur réseau  
✅ **Performance** : Synchronisation asynchrone non-bloquante  
✅ **Compatibilité** : Fonctionne avec le système existant

## Test de la solution

Un script de test a été créé : `test_manual_order.js`

Pour tester manuellement :

1. Aller sur `/catalog`
2. Sélectionner des produits
3. Créer une commande avec un nom
4. Vérifier dans Supabase que la commande apparaît avec statut "draft"
5. Modifier les quantités et vérifier la synchronisation

## Résultat

Maintenant, **toutes les commandes** (importées ET manuelles) apparaissent dans la page `/orders` avec le statut "Brouillon" et sont correctement sauvegardées dans Supabase.
