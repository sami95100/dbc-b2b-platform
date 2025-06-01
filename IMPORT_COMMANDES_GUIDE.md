# Guide d'Import de Commandes Excel - Version Améliorée

## 🎯 Objectif

Ce système permet d'importer des commandes depuis un fichier Excel avec une gestion intelligente des produits, des stocks et des prix selon la méthode "voisin".

## 🚀 Nouvelles Fonctionnalités

### 1. **Méthode Voisin pour les Prix**

Quand un SKU n'existe pas dans le catalogue, le système cherche un produit "voisin" avec :

- Même `Product Name`
- Même `Appearance`
- Même `Functionality`
- Idéalement même `VAT Type` (sinon sans VAT Type)

Si trouvé, le prix DBC du voisin est utilisé. Sinon, la marge DBC standard est appliquée.

### 2. **Gestion Intelligente des Stocks**

#### Produits existants avec stock suffisant ✅

- Stock catalogue ≥ quantité commande
- Aucune action requise

#### Produits à mettre à jour 🔄

- Stock catalogue < quantité commande
- Le stock sera mis à jour à la quantité de la commande

#### Nouveaux produits à créer ➕

- SKU inexistant dans le catalogue
- Sera créé avec la quantité demandée

### 3. **Interface de Validation Améliorée**

Affichage en 3 tableaux distincts :

- **Produits OK** (bordure verte)
- **Produits à mettre à jour** (bordure jaune) - Prix éditables
- **Produits à créer** (bordure bleue) - Prix éditables

### 4. **Gestion des Statuts de Commande**

- **Brouillon** (`draft`) : Peut être supprimée
- **Autres statuts** : Peut être annulée (`cancelled`)

## 📋 Format Excel Requis

### Colonnes Obligatoires

```
SKU | Product Name | Count/Quantity
```

### Colonnes Optionnelles (pour méthode voisin)

```
Appearance | Functionality | VAT Type | Offered Price
```

### Exemple de Fichier

```csv
SKU,Product Name,Appearance,Functionality,Count,Offered Price,VAT Type
102600600073,Apple iPhone 11 128GB,Grade A,100%,2,160.95,Non marginal
NOUVEAU_SKU_001,Samsung Galaxy S22 256GB,Grade A,100%,3,450.00,Non marginal
```

## 🔧 API Endpoints

### Import d'une commande

```
POST /api/orders/import
```

### Confirmation d'import

```
POST /api/orders/import/confirm
```

### Gestion des statuts

```
PUT /api/orders/[id]/status
Body: { "action": "delete" | "cancel" }
```

## 💡 Règles de Calcul des Prix

### Priorité de calcul :

1. **🔍 Prix voisin** (priorité) - si produit similaire trouvé
2. **📉 Fallback marge DBC** (secours) - si aucun voisin trouvé :
   - Produits marginaux : `prix_fournisseur × 1.01` (+1%)
   - Produits non marginaux : `prix_fournisseur × 1.11` (+11%)

### Exemple de fallback :

```
Produit inexistant: "Xiaomi Mi 11" - 300€ fournisseur
↓ Recherche voisin... ❌ Aucun trouvé
↓ FALLBACK: 300€ × 1.11 = 333€ (prix DBC final)
```

### Recherche de voisin :

```sql
SELECT price_dbc FROM products
WHERE product_name = ?
  AND appearance = ?
  AND functionality = ?
  AND vat_type = ? (optionnel)
LIMIT 1
```

## 📊 Base de Données

### Tables Utilisées

#### `orders`

```sql
- id (UUID)
- name (TEXT)
- status ('draft' | 'pending_payment' | 'shipping' | 'completed' | 'cancelled')
- status_label (TEXT)
- total_amount (DECIMAL)
- total_items (INTEGER)
```

#### `order_items`

```sql
- order_id (UUID)
- sku (TEXT)
- product_name (TEXT)
- quantity (INTEGER)
- unit_price (DECIMAL)
- total_price (DECIMAL)
```

#### `products`

```sql
- sku (TEXT PRIMARY KEY)
- product_name (TEXT)
- appearance (TEXT)
- functionality (TEXT)
- quantity (INTEGER)
- price_dbc (DECIMAL)
- vat_type (TEXT)
```

## 🧪 Test avec Fichier Exemple

Utilisez `data/examples/test_import_commande.csv` pour tester :

- Produits existants (102600600073, 102600600081)
- Produits à créer (NOUVEAU*SKU*\_, INEXISTANT\_\_)
- Méthode voisin (TEST*VOISIN*\*)

## 🔍 Logs et Debugging

Le système génère des logs détaillés :

```
🔍 Recherche produit voisin pour: Apple iPhone 11 128GB | Grade A | 100% | Non marginal
✅ Produit voisin trouvé avec VAT identique: {sku: "102600600073", price_dbc: 178.25}
💡 Prix calculé depuis produit voisin 102600600073: 178.25€
```

## ⚠️ Points d'Attention

1. **Prix fournisseurs** : Jamais utilisés directement (toujours remisés)
2. **Stocks négatifs** : Automatiquement mis à jour
3. **SKU format** : Conservé tel qu'importé
4. **Validation** : Interface permet modification prix avant confirmation
5. **Statuts** : Suppression possible uniquement en brouillon

## 🎯 Workflow Complet

1. **Sélection fichier Excel** → Analyse et parsing
2. **Vérification catalogue** → Classification en 3 catégories
3. **Recherche voisins** → Pour les SKU inexistants
4. **Interface validation** → 3 tableaux + prix éditables
5. **Confirmation** → Mise à jour catalogue + création commande
6. **Stockage Supabase** → Commande en brouillon

## 📈 Bénéfices

- ✅ **Gestion automatique** des stocks et prix
- ✅ **Méthode voisin** pour prix cohérents
- ✅ **Interface claire** pour validation
- ✅ **Flexibilité** prix éditables
- ✅ **Traçabilité** complète des actions
- ✅ **Statuts appropriés** selon cycle de vie commande
