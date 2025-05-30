# 🔄 Guide de Mise à Jour du Catalogue

## Nouvelles Fonctionnalités Ajoutées

### 1. 🔄 Bouton "Mettre à jour le catalogue"

- **Localisation** : Dans la page catalogue, à côté du bouton "Export Catalogue"
- **Fonction** : Permet d'uploader un nouveau fichier Excel pour mettre à jour le catalogue
- **Formats supportés** : .xlsx, .xls

### 2. 📊 Résumé Détaillé des Modifications

Après chaque import, vous obtenez un résumé complet :

- **Produits traités** : Nombre total de produits importés
- **Nouveaux SKU** : Nombre de nouveaux produits ajoutés
- **Répartition marges** : Marginaux (1%) vs Non marginaux (11%)
- **Statistiques avant/après** : Comparaison des nombres de produits
- **Produits actifs/en rupture** : État du stock

### 3. 🎨 Améliorations de l'Interface

#### Tableau plus lisible :

- **Colonnes élargies** : Toutes les informations sur une seule ligne
- **Nom du produit** : Colonne plus large avec tooltip complet
- **Pastilles de couleur** : Visualisation des couleurs réelles des produits
- **Informations** : Texte tronqué avec tooltip complet

#### Gestion des quantités améliorée :

- **Quantité par défaut** : 0 au lieu de 1
- **Bouton décrémenter (-1)** : En rouge pour réduire les quantités
- **Bouton incrémenter (+1)** : En vert pour augmenter les quantités
- **Validation** : Impossible de dépasser le stock disponible

### 4. 📤 Export Catalogue Amélioré

- **Nouveau nom** : "Export Catalogue" au lieu de "Export Excel"
- **Choix de format** :
  - 📊 Format Excel (.xlsx)
  - 📄 Format CSV UTF-8
- **Menu déroulant** : Interface plus claire

## Comment Utiliser la Mise à Jour

### Étape 1 : Préparation

1. Assurez-vous d'avoir un fichier Excel avec le nouveau catalogue
2. Le fichier doit contenir les colonnes : SKU, Product Name, Price, Quantity

### Étape 2 : Import

1. Cliquez sur **"Mettre à jour le catalogue"**
2. Sélectionnez votre fichier Excel
3. Cliquez sur **"Mettre à jour"**

### Étape 3 : Validation

1. Attendez le traitement (peut prendre quelques minutes)
2. Consultez le résumé détaillé des modifications
3. Vérifiez les statistiques affichées
4. Fermez la popup avec le bouton **"Fermer"**

### Étape 4 : Vérification

1. Le catalogue se rafraîchit automatiquement
2. Les nouveaux produits apparaissent dans la liste
3. Les prix DBC sont automatiquement calculés

## Règles de Marge Appliquées

- **Produits Marginaux** (VAT Type = 'Marginal') : **+1%**
- **Produits Non Marginaux** (autres) : **+11%**

## Pastilles de Couleur Supportées

Les couleurs suivantes sont automatiquement détectées et affichées :

- Black, White, Red, Blue, Green, Yellow
- Purple, Pink, Orange, Gray/Grey, Silver
- Gold, Rose, Coral, Midnight, Graphite

## Résolution des Problèmes

### Import échoué

- Vérifiez que le fichier est bien un Excel (.xlsx ou .xls)
- Assurez-vous que les colonnes obligatoires sont présentes
- Vérifiez qu'il n'y a pas de données corrompues

### Popup bloquée

- Utilisez le bouton **X** en haut à droite
- Ou le bouton **"Fermer"** après succès

### Produits non visibles

- Vérifiez les filtres appliqués
- Utilisez **"Réinitialiser filtres"**
- Actualisez la page si nécessaire

## Améliorations Futures

- Export fonctionnel en Excel/CSV
- Historique des imports
- Comparaison des prix entre versions
- Notifications en temps réel
- Gestion des erreurs améliorée

---

✅ **Le système est maintenant prêt à être utilisé !**
