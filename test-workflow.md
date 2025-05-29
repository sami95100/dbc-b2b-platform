# 🧪 Guide de test du workflow complet

## **Test 1 : Chargement du catalogue**

### Attendu ✅

- Page catalogue charge sans erreur
- Console affiche : `🔍 Produits chargés depuis Supabase: [X] sur [Y] total`
- Tous les produits iPhone sont visibles (pas seulement jusqu'à iPhone 12)
- Pagination fonctionne

### Si échec ❌

**Console erreurs :**

```javascript
// Vérifier dans Console → Network si les requêtes Supabase réussissent
// Rechercher "products" dans les requêtes
```

**Debug :**

1. Vérifier variable d'environnement Supabase
2. Tester manuellement dans Supabase Table Editor
3. Vérifier que `is_active = true` sur les produits

---

## **Test 2 : Création d'une commande brouillon**

### Actions

1. Sélectionner 2-3 produits différents
2. Mettre des quantités (ex: 1, 2, 1)
3. Créer nouvelle commande "Test Workflow"

### Attendu ✅

- Popup création commande apparaît
- Commande créée avec nom personnalisé
- Header affiche le panier avec quantités et montant
- Produits sélectionnés sont surlignés en vert

### Logs console attendus

```
🔄 INITIALISATION
🛒 ADD TO CART WITH QUANTITY
💾 Sauvegarde immédiate dans localStorage
```

### Si échec ❌

- Vérifier localStorage dans DevTools → Application → Local Storage
- Chercher `draftOrders` et `currentDraftOrder`

---

## **Test 3 : Navigation vers détails commande**

### Actions

1. Aller sur "Mes commandes" (icône panier)
2. Cliquer sur "Voir détails" de la commande test

### Attendu ✅

- Page détail s'ouvre
- Tous les produits ajoutés sont listés
- Quantités correspondent
- Boutons "Valider commande" et "Export Excel" visibles
- Status = "Brouillon"

### Si échec ❌

- Vérifier console pour erreurs de chargement produits
- Vérifier que les SKUs dans localStorage correspondent aux SKUs en base

---

## **Test 4 : Export Excel (test simple)**

### Actions

1. Sur page détail commande
2. Cliquer "Export Excel"

### Attendu ✅

- Fichier CSV téléchargé automatiquement
- Nom : `commande_[ID]_[date].csv`
- Contenu : tous les produits avec détails

### Logs console attendus

```
📊 Export Excel terminé
```

### Si échec ❌

- Vérifier permissions navigateur pour téléchargements
- Console → erreurs JavaScript

---

## **Test 5 : VALIDATION COMMANDE (critique)**

### Actions

1. Sur page détail commande (status = Brouillon)
2. Cliquer "Valider la commande"
3. Confirmer

### Attendu ✅

- Message : "✅ Commande validée avec succès ! Le stock a été mis à jour."
- Status change : "Brouillon" → "En attente"
- Bouton "Valider" disparaît

### Logs console attendus

```
🔄 Validation de la commande: [ID]
✅ Stock mis à jour pour [SKU]: [ancien] → [nouveau]
✅ Commande validée avec succès
```

### Si échec ❌ - DEBUGGING SUPABASE

**1. Vérifier tables créées :**

```sql
-- Dans Supabase SQL Editor
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('orders', 'order_items');
```

**2. Vérifier stock avant/après :**

```sql
-- AVANT validation
SELECT sku, quantity FROM products WHERE sku IN ('102600600148', '102600600117');

-- APRÈS validation - vérifier décrément
SELECT sku, quantity FROM products WHERE sku IN ('102600600148', '102600600117');
```

**3. Vérifier commande sauvée :**

```sql
SELECT * FROM orders ORDER BY created_at DESC LIMIT 1;
SELECT * FROM order_items WHERE order_id = '[ID_COMMANDE]';
```

---

## **Test 6 : Vérification stock mis à jour**

### Actions

1. Retourner sur catalogue
2. Rechercher les produits commandés
3. Vérifier quantités

### Attendu ✅

- Stock produits = stock initial - quantité commandée
- Si stock = 0 → produit devient inactif (disparaît du catalogue)

---

## **🐛 DEBUGGING - Identifier la source du problème**

### **Erreur côté CODE (frontend)**

- Console JavaScript : erreurs rouges
- Network tab : requêtes 200 OK mais logique incorrecte
- LocalStorage : données manquantes/incorrectes

### **Erreur côté SUPABASE (backend)**

- Console JavaScript : erreurs 400/500
- Network tab : requêtes Failed ou 40x/50x
- Supabase Dashboard → Logs

### **Erreur côté DONNÉES**

- Tables vides/incomplètes
- Foreign keys incorrectes
- Permissions RLS

---

## **🔧 Commandes de debug utiles**

### **Vérifier état localStorage :**

```javascript
// Dans console navigateur
console.log(
  "Draft Orders:",
  JSON.parse(localStorage.getItem("draftOrders") || "{}")
);
console.log("Current Order:", localStorage.getItem("currentDraftOrder"));
```

### **Test connexion Supabase :**

```javascript
// Dans console navigateur
import { supabase } from "./src/lib/supabase.ts";
const { data, error } = await supabase
  .from("products")
  .select("count")
  .limit(1);
console.log("Supabase connection:", { data, error });
```

### **Vérifier produits en base :**

```sql
-- Dans Supabase SQL Editor
SELECT COUNT(*) as total_products FROM products;
SELECT COUNT(*) as active_products FROM products WHERE is_active = true;
SELECT sku, product_name, quantity FROM products WHERE quantity > 0 LIMIT 10;
```

---

## **✅ Test complet réussi si :**

1. ✅ Catalogue charge tous les produits
2. ✅ Commande brouillon créée et sauvée
3. ✅ Navigation commandes fonctionne
4. ✅ Export Excel télécharge fichier
5. ✅ Validation commande :
   - Sauve en base Supabase
   - Décrémente stock automatiquement
   - Change statut
6. ✅ Stock mis à jour visible dans catalogue
