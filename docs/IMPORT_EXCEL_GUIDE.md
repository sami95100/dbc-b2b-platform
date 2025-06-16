# Guide d'import Excel des commandes fournisseur

## Vue d'ensemble

Cette fonctionnalité permet d'importer une commande passée sur le site du fournisseur via un fichier Excel. Le système crée automatiquement une commande en brouillon et gère intelligemment l'ajout de nouveaux produits au catalogue.

## 🎯 Fonctionnalités principales

### 1. **Vérification automatique du catalogue**

- Vérifie si les SKU de la commande existent dans le catalogue
- Compare les quantités disponibles avec celles demandées
- Propose des actions correctives automatiques

### 2. **Méthode "voisin" pour les prix**

Le système utilise une méthode intelligente pour déterminer les prix des nouveaux produits :

- **Priorité 1** : Cherche un produit avec le même nom, apparence, fonctionnalité et VAT
- **Priorité 2** : Cherche un produit avec le même nom, apparence et fonctionnalité (sans VAT)
- **Fallback** : Applique la marge DBC standard (+11% non marginal, +1% marginal)

**⚠️ Modification récente :** La recherche ne fallback plus sur le nom du produit seul pour éviter les prix trop élevés.

### 3. **Interface de validation en 3 tableaux**

1. **Produits OK** : Existent avec stock suffisant
2. **Produits à mettre à jour** : Existent mais stock insuffisant
3. **Produits à créer** : N'existent pas dans le catalogue

## 📋 Format du fichier Excel

### Colonnes obligatoires

- **SKU** : Code produit unique (colonnes reconnues : `sku`, `SKU`, `ean`, `EAN`, `code`, `Product Code`)
- **Quantité** : Nombre d'unités commandées (colonnes reconnues : `qty`, `quantity`, `Quantité`, `Required Count`)

### Colonnes optionnelles mais recommandées

- **Nom du produit** : `product_name`, `Product Name`, `nom`, `name`
- **Prix unitaire** : `unit_price`, `prix`, `price`, `Offered Price`
- **Type VAT** : `vat_type`, `VAT Type`, `Vat Margin`
- **Apparence** : `appearance`, `Appearance`, `grade`, `Grade`
- **Fonctionnalité** : `functionality`, `Functionality`
- **Couleur** : `color`, `Color`, `couleur`
- **Emballage** : `boxed`, `Boxed`, `emballage`
- **Infos additionnelles** : `additional_info`, `Additional Info`, `note`

### Exemple de structure Excel

| SKU            | Product Name          | Quantity | Offered Price | VAT Type     | Appearance | Functionality | Color      | Boxed   |
| -------------- | --------------------- | -------- | ------------- | ------------ | ---------- | ------------- | ---------- | ------- |
| 00102600600484 | Apple iPhone 11 128GB | 2        | 149.85        | Non marginal | Grade A    | 100%          | Space Gray | Unboxed |
| 00102600600264 | Apple iPhone 11 128GB | 1        | 149.48        | Non marginal | Grade A    | 100%          | Black      | Unboxed |
| 00102600600251 | Apple iPhone 11 128GB | 1        | 149.85        | Non marginal | Grade A+   | 100%          | White      | Boxed   |

## 🔄 Processus d'import

### 1. **Sélection du fichier**

- Cliquez sur "Importer commande Excel"
- Sélectionnez un fichier .xlsx ou .xls
- Le système analyse automatiquement les colonnes

### 2. **Validation des produits**

Le système catégorise automatiquement chaque produit :

#### **Produits existants avec stock suffisant** 🟢

- Le SKU existe dans le catalogue
- Le stock actuel ≥ quantité demandée
- **Action** : Aucune, prêt pour la commande

#### **Produits à mettre à jour** 🟡

- Le SKU existe dans le catalogue
- Le stock actuel < quantité demandée
- **Action** : Le stock sera mis à jour à la quantité demandée

#### **Nouveaux produits à créer** 🔵

- Le SKU n'existe pas dans le catalogue
- **Action** : Sera créé avec la méthode voisin pour le prix

### 3. **Édition des prix**

- Tous les prix DBC sont éditables dans les tableaux
- Les prix calculés sont des suggestions basées sur :
  - Prix du produit voisin trouvé
  - Calcul de marge DBC standard
- Modifiez les prix si nécessaire avant confirmation

### 4. **Confirmation et création**

- Revue finale avec totaux
- Création de la commande en brouillon
- Mise à jour/création automatique des produits dans le catalogue

## 💰 Calcul des prix DBC

### Méthode voisin (prioritaire)

Le système recherche un produit similaire selon ces critères :

1. **Nom du produit** (obligatoire)
2. **Apparence** (Grade A, A+, B, etc.)
3. **Fonctionnalité** (100%, 90%, etc.)
4. **Type VAT** (marginal/non marginal)

Si trouvé → **vérification automatique de la marge** :

- Si marge négative (prix voisin < prix fournisseur) → applique automatiquement +11% sur le prix fournisseur
- Sinon → utilise le prix DBC du produit voisin

### Marge standard (fallback)

Si aucun voisin trouvé :

- **Produits marginaux** : Prix fournisseur × 1.01 (+1%)
- **Produits non marginaux** : Prix fournisseur × 1.11 (+11%)

## ⚠️ Points importants

### Gestion des stocks

- Les produits existants avec stock insuffisant auront leur stock **remplacé** par la quantité de la commande
- Cette approche garantit que la commande peut être validée

### Statut des commandes

- **Brouillon** : Peut être supprimée, modifiée, validée
- **Validée** : Ne peut plus être supprimée, seulement annulée

### Types de VAT

- **Marginal** : Biens d'occasion avec TVA sur la marge (1% de marge DBC)
- **Non marginal** : Produits neufs ou reconditionnés (11% de marge DBC)

## 🛠️ Dépannage

### Erreurs courantes

**"Colonnes SKU et quantité requises non trouvées"**

- Vérifiez que votre fichier contient bien des colonnes nommées SKU et Quantité
- Utilisez les noms de colonnes reconnues (voir liste ci-dessus)

**"Aucun produit valide trouvé"**

- Vérifiez que les cellules SKU et quantité ne sont pas vides
- Les quantités doivent être > 0

**"Erreur lors de la confirmation"**

- Vérifiez votre connexion internet
- Réessayez l'import avec un fichier plus petit pour tester

### Conseils d'optimisation

**Pour de meilleurs résultats de pricing :**

- Incluez les colonnes `Product Name`, `Appearance`, `Functionality`
- Utilisez des noms de produits cohérents avec le catalogue existant
- Spécifiez le type VAT quand possible

**Pour des imports rapides :**

- Limitez à 50-100 produits par fichier
- Utilisez des noms de colonnes standards reconnus automatiquement

## 📊 Exemple complet

Voici un exemple de workflow typique :

1. **Fichier Excel reçu du fournisseur** avec 10 produits
2. **Analyse automatique** :
   - 6 produits existants (stock OK)
   - 2 produits existants (stock à mettre à jour)
   - 2 nouveaux produits (à créer)
3. **Application de la méthode voisin** :
   - 1 produit trouve un voisin → prix récupéré
   - 1 produit sans voisin → marge standard appliquée
4. **Validation des prix** par l'utilisateur
5. **Création de la commande** en brouillon avec 10 articles
6. **Mise à jour du catalogue** : 2 stocks mis à jour, 2 produits créés

La commande est maintenant prête à être validée et traitée !
