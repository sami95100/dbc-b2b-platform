# 📋 Fonctionnalité d'Import Excel - Commandes Fournisseur

## 🎯 Objectif

Permettre l'import de commandes passées sur le site du fournisseur via un fichier Excel, avec gestion intelligente du catalogue et calcul automatique des prix selon la "méthode voisin".

## 🏗️ Architecture technique

### API Routes

#### `/api/orders/import` (POST)

- **Fonction** : Analyse du fichier Excel et catégorisation des produits
- **Entrée** : FormData avec fichier Excel
- **Sortie** : 3 listes de produits catégorisés + métadonnées

#### `/api/orders/import/confirm` (POST)

- **Fonction** : Création finale de la commande et mise à jour du catalogue
- **Entrée** : Données validées + choix utilisateur
- **Sortie** : Commande créée + résumé des modifications

### Composants React

#### `OrderImportButton.tsx`

- Interface utilisateur principale
- Gestion du dialogue de validation en 3 tableaux
- Édition des prix en temps réel
- Calcul des totaux dynamiques

### Logique métier

#### Méthode voisin (`findNeighborProduct`)

```typescript
// Stratégie de recherche par ordre de priorité :
1. product_name + appearance + functionality + vat_type (exact)
2. product_name + appearance + functionality (sans vat_type)
3. Fallback : calcul marge standard (pas de recherche par nom seul)
```

**⚠️ Important :** La recherche ne fallback plus sur le nom du produit seul pour éviter les prix trop élevés. Si aucun produit voisin n'est trouvé avec appearance + functionality, on passe directement au calcul de marge standard.

#### Catégorisation des produits

1. **Existants OK** : SKU trouvé + stock suffisant
2. **À mettre à jour** : SKU trouvé + stock insuffisant
3. **À créer** : SKU non trouvé + méthode voisin pour prix

## 🔧 Fonctionnalités implémentées

### ✅ Analyse automatique du fichier Excel

- Détection flexible des colonnes (multiples noms possibles)
- Support formats .xlsx et .xls
- Validation des données requises (SKU + quantité)

### ✅ Méthode voisin pour le pricing

- Recherche intelligente par similitude
- Priorité : nom > apparence > fonctionnalité > VAT
- Fallback sur marge DBC standard

### ✅ Interface de validation en 3 tableaux

- **Tableau 1** : Produits existants avec stock suffisant (vert)
- **Tableau 2** : Produits avec stock à mettre à jour (jaune)
- **Tableau 3** : Nouveaux produits à créer (bleu)

### ✅ Édition des prix

- Tous les prix DBC sont éditables
- Mise à jour en temps réel des totaux
- Indication de la source du prix (voisin/calculé)

### ✅ Gestion des stocks

- Mise à jour automatique des stocks insuffisants
- Création de nouveaux produits avec bonnes métadonnées
- Évitement des doublons avec vérification préalable

### ✅ Statut des commandes

- Création en brouillon (peut être supprimée)
- Transition vers "pending_payment" après validation
- Une fois validée, seulement annulation possible

## 📁 Structure des fichiers

```
src/
├── app/api/orders/
│   ├── import/
│   │   ├── route.ts           # Analyse Excel + catégorisation
│   │   └── confirm/
│   │       └── route.ts       # Création commande + catalogue
├── components/
│   └── OrderImportButton.tsx  # Interface utilisateur
└── app/orders/
    └── page.tsx              # Page principale (bouton intégré)

docs/
└── IMPORT_EXCEL_GUIDE.md     # Guide utilisateur complet

data/examples/
└── commande_exemple.csv      # Fichier d'exemple pour tests
```

## 🔍 Colonnes Excel supportées

### Obligatoires

- **SKU** : `sku`, `SKU`, `ean`, `EAN`, `code`, `Product Code`
- **Quantité** : `qty`, `quantity`, `Quantité`, `Required Count`

### Optionnelles

- **Nom** : `product_name`, `Product Name`, `nom`, `name`
- **Prix** : `unit_price`, `prix`, `price`, `Offered Price`
- **VAT** : `vat_type`, `VAT Type`, `Vat Margin`
- **Apparence** : `appearance`, `Appearance`, `grade`, `Grade`
- **Fonctionnalité** : `functionality`, `Functionality`
- **Couleur** : `color`, `Color`, `couleur`
- **Emballage** : `boxed`, `Boxed`, `emballage`
- **Infos** : `additional_info`, `Additional Info`, `note`

## 🎨 Interface utilisateur

### Design responsive avec 3 sections distinctes

1. **Section verte** : Produits OK (stock suffisant)
2. **Section jaune** : Produits à mettre à jour (stock insuffisant)
3. **Section bleue** : Nouveaux produits (à créer)

### Fonctionnalités UX

- Résumé global avec compteurs
- Prix éditables inline avec validation
- Totaux mis à jour en temps réel
- Messages explicatifs pour chaque section
- Indicateurs visuels pour les sources de prix

## 🧪 Tests suggérés

### Cas de test standard

1. **Import produits existants** : Fichier avec SKUs déjà en catalogue
2. **Import produits nouveaux** : SKUs inexistants, test méthode voisin
3. **Import mixte** : Combinaison des deux cas
4. **Stock insuffisant** : Test mise à jour automatique

### Cas de test avancés

1. **Colonnes manquantes** : Fichier sans prix ou apparence
2. **Gros volume** : 100+ produits pour test performance
3. **Caractères spéciaux** : Noms avec accents, caractères UTF-8
4. **Erreurs réseau** : Test robustesse en cas de timeout

### Fichiers d'exemple fournis

- `data/examples/commande_exemple.csv` : Cas standard (10 produits)
- Inclut mix de produits existants/nouveaux
- Différents types VAT (marginal/non marginal)
- Différentes apparences et couleurs

## 🚀 Déploiement

### Prérequis

- Next.js 13+ avec App Router
- Supabase configuré avec tables `products`, `orders`, `order_items`
- Librairie XLSX pour lecture Excel

### Variables d'environnement

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Installation

```bash
npm install xlsx
npm run dev
```

## 🔮 Améliorations futures possibles

### Fonctionnalités avancées

- **Import par lots** : Plusieurs fichiers simultanément
- **Prévisualisation Excel** : Aperçu du fichier avant import
- **Templates Excel** : Génération de modèles vides
- **Historique imports** : Traçabilité des imports précédents

### Optimisations techniques

- **Cache produits** : Éviter rechargement catalogue complet
- **Import asynchrone** : Pour gros volumes (background jobs)
- **Validation schema** : JSON Schema pour validation stricte
- **Logs détaillés** : Audit trail complet

### Intégrations

- **API fournisseur** : Import direct depuis API
- **Notifications** : Email/SMS confirmation import
- **Export résultats** : Rapport PDF post-import
- **Multi-devises** : Support EUR/USD/GBP

## 📊 Métriques de succès

### Performance

- Import 50 produits < 5 secondes
- Taux de succès > 95%
- Précision méthode voisin > 80%

### UX

- Temps de compréhension < 2 minutes
- Taux d'abandon dialog < 10%
- Satisfaction utilisateur > 4/5

---

**Status** : ✅ Implémenté et fonctionnel  
**Version** : 1.0  
**Dernière mise à jour** : Décembre 2024
