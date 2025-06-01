# Guide du Workflow IMEI - DBC Electronics

## Vue d'ensemble

Ce guide explique le nouveau workflow pour la gestion des IMEI dans les commandes DBC Electronics. Le système permet maintenant de passer d'une commande validée à une commande expédiée en important les IMEI des produits.

## Workflow Complet

### 1. Création et Validation de Commande

1. **Import Excel** → Commande brouillon (`draft`)
2. **Validation** → Commande en attente de paiement (`pending_payment`)
   - Le stock est décrémenté
   - Plus d'édition possible après cette étape

### 2. Import des IMEI

Une fois la commande validée (`pending_payment`), l'administrateur peut importer les IMEI :

#### Format du fichier IMEI (Excel .xlsx)

Le fichier doit contenir **12 colonnes** dans cet ordre :

| Colonne | Nom             | Description                        | Obligatoire |
| ------- | --------------- | ---------------------------------- | ----------- |
| 1       | SKU             | Référence produit                  | ✅          |
| 2       | ID              | Identifiant unique                 | ❌          |
| 3       | Product Name    | Nom du produit                     | ❌          |
| 4       | Item Identifier | IMEI du produit                    | ✅          |
| 5       | Appearance      | État physique (Grade A, B, C)      | ❌          |
| 6       | Functionality   | Fonctionnalité (100%, 95%, etc.)   | ❌          |
| 7       | Boxed           | Emballage (Avec boîte, Sans boîte) | ❌          |
| 8       | Color           | Couleur                            | ❌          |
| 9       | Cloud Lock      | Statut cloud (Unlocked, etc.)      | ❌          |
| 10      | Additional Info | Informations supplémentaires       | ❌          |
| 11      | Quantity        | Quantité (toujours 1)              | ✅          |
| 12      | Price           | Prix fournisseur                   | ✅          |

#### Exemple de fichier IMEI

```csv
SKU,ID,Product Name,Item Identifier,Appearance,Functionality,Boxed,Color,Cloud Lock,Additional Info,Quantity,Price
NOUVEAU_SKU_001,1,Samsung Galaxy S22 256GB,123456789012345,Grade A,100%,Avec boîte,Noir,Unlocked,Excellent état,1,450.00
NOUVEAU_SKU_001,2,Samsung Galaxy S22 256GB,123456789012346,Grade A,100%,Avec boîte,Noir,Unlocked,Excellent état,1,450.00
```

#### Règles de Validation

- **Correspondance SKU** : Tous les SKU du fichier IMEI doivent exister dans la commande
- **Correspondance Quantité** : Le nombre d'IMEI par SKU doit correspondre exactement à la quantité commandée
- **IMEI Uniques** : Chaque IMEI doit être unique dans la base de données
- **Prix DBC** : Les prix DBC sont automatiquement récupérés depuis la commande (pas de recalcul)

### 3. Passage en Livraison

Après l'import des IMEI :

1. **Statut automatique** : La commande passe en `shipping`
2. **Modal de tracking** : Une popup apparaît pour saisir :
   - Numéro de tracking (obligatoire)
   - Frais de livraison (optionnel)
3. **Possibilité d'ignorer** : La modal peut être fermée sans saisir le tracking

### 4. Finalisation

Une fois en statut `shipping`, l'administrateur peut :

- **Marquer comme terminée** : Passage en statut `completed`
- **Modifier le tracking** : Via l'API shipping

## Interface Utilisateur

### Boutons selon le Statut

#### Commande `draft`

- ✅ Valider la commande
- 🗑️ Supprimer
- 📊 Export Excel

#### Commande `pending_payment`

- 📱 Importer IMEI
- ✏️ Éditer par import
- ✏️ Éditer manuellement
- 📄 Facture
- 📊 Export Excel

#### Commande `shipping`

- ✅ Marquer comme terminée
- 🔄 Vue SKU / Vue IMEI
- 📊 Export CSV/Excel (SKU ou IMEI)
- 📄 Facture

#### Commande `completed`

- 🔄 Vue SKU / Vue IMEI
- 📊 Export CSV/Excel (SKU ou IMEI)
- 📄 Facture

### Vues de Données

#### Vue SKU (par défaut)

Affiche les produits groupés par SKU avec :

- Informations produit
- Quantités
- Prix unitaires et totaux

#### Vue IMEI (shipping/completed uniquement)

Affiche chaque IMEI individuellement avec :

- SKU et IMEI
- Détails du produit
- Prix fournisseur et prix DBC

## APIs Créées

### 1. Import IMEI

```
POST /api/orders/[id]/imei
```

- Import du fichier Excel IMEI
- Validation des correspondances
- Passage automatique en statut `shipping`

### 2. Gestion Livraison

```
PUT /api/orders/[id]/shipping
```

- Mise à jour du tracking
- Ajout des frais de livraison
- Passage en statut `completed`

### 3. Export Données

```
GET /api/orders/[id]/export?type=sku|imei&format=csv|xlsx
```

- Export des données SKU ou IMEI
- Formats CSV ou Excel

## Base de Données

### Nouvelle Table : `order_item_imei`

```sql
CREATE TABLE order_item_imei (
  id UUID PRIMARY KEY,
  order_item_id UUID REFERENCES order_items(id),
  sku TEXT NOT NULL,
  imei TEXT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  appearance TEXT NOT NULL,
  functionality TEXT NOT NULL,
  boxed TEXT NOT NULL,
  color TEXT,
  cloud_lock TEXT,
  additional_info TEXT,
  supplier_price DECIMAL(10,2) NOT NULL,
  dbc_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Colonnes Ajoutées : `orders`

```sql
ALTER TABLE orders ADD COLUMN tracking_number TEXT;
ALTER TABLE orders ADD COLUMN shipping_cost DECIMAL(10,2) DEFAULT 0;
```

## Avantages du Système

1. **Traçabilité Complète** : Chaque produit est tracé individuellement via son IMEI
2. **Workflow Sécurisé** : Pas d'édition possible après validation
3. **Flexibilité d'Export** : Données disponibles en vue SKU ou IMEI
4. **Gestion Livraison** : Tracking et frais intégrés
5. **Validation Stricte** : Correspondances SKU/quantités vérifiées

## Fichiers de Test

- `data/examples/test_imei_import.xlsx` : Exemple de fichier IMEI
- Contient des IMEI pour les SKU de test existants

## Utilisation

1. Créer une commande via import Excel
2. Valider la commande
3. Préparer le fichier IMEI avec les bonnes correspondances
4. Importer les IMEI via le bouton "Importer IMEI"
5. Configurer le tracking (optionnel)
6. Suivre la commande jusqu'à completion
7. Exporter les données finales si nécessaire
