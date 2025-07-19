# 📖 Glossaire DBC B2B Platform

## Entités Métier

### 👤 **User (Utilisateur)**

Représente un utilisateur de la plateforme avec des droits d'accès spécifiques.

**Propriétés:**

- `id`: Identifiant unique UUID
- `email`: Adresse email (unique)
- `role`: Rôle (`admin` | `client`)
- `company_name`: Nom de l'entreprise
- `contact_name`: Nom du contact principal
- `phone`: Numéro de téléphone
- `address`: Adresse complète
- `is_active`: Statut actif/inactif
- `created_at`: Date de création
- `updated_at`: Date de dernière modification

**Rôles:**

- **Admin**: Accès complet à toutes les fonctionnalités
- **Client**: Accès limité aux fonctionnalités client

### 📦 **Product (Produit)**

Article du catalogue avec ses caractéristiques et prix.

**Propriétés fixes:**

- `sku`: Code produit unique (Stock Keeping Unit)
- `product_name`: Nom du produit
- `price`: Prix fournisseur original
- `price_dbc`: Prix DBC avec marge appliquée
- `supplier_price`: Prix d'achat fournisseur (admin seulement)
- `quantity`: Stock disponible
- `is_active`: Produit actif/inactif

**Attributs communs:**

- `appearance`: État physique (`New`, `Refurbished`, etc.)
- `functionality`: État fonctionnel (`Working`, `Defective`, etc.)
- `boxed`: Présence de l'emballage (`Yes`, `No`)
- `color`: Couleur du produit
- `cloud_lock`: Statut de verrouillage cloud
- `additional_info`: Informations supplémentaires
- `vat_type`: Type de TVA (`Marginal`, `Standard`)
- `campaign_price`: Prix promotionnel
- `item_group`: Catégorie de produit

**Attributs dynamiques:**

- `dynamic_attributes`: Champ JSON pour attributs spécifiques par catégorie

### 🛒 **Order (Commande)**

Commande passée par un client avec ses articles.

**Propriétés:**

- `id`: Identifiant unique UUID
- `name`: Nom de la commande
- `status`: Statut (`draft`, `validated`, `shipping`, `completed`)
- `status_label`: Libellé du statut en français
- `customer_ref`: Référence client
- `user_id`: ID de l'utilisateur propriétaire
- `total_amount`: Montant total TTC
- `total_items`: Nombre total d'articles
- `vat_type`: Type de TVA appliqué
- `created_at`: Date de création
- `updated_at`: Date de dernière modification

**Statuts de commande:**

- **draft**: Brouillon (en cours de création)
- **validated**: Validée (prête pour traitement)
- **shipping**: En cours d'expédition
- **completed**: Terminée et livrée

### 📋 **OrderItem (Article de commande)**

Article individuel dans une commande.

**Propriétés:**

- `id`: Identifiant unique UUID
- `order_id`: ID de la commande parent
- `sku`: Code produit
- `product_name`: Nom du produit
- `quantity`: Quantité commandée
- `unit_price`: Prix unitaire
- `total_price`: Prix total (quantity × unit_price)
- `created_at`: Date d'ajout

### 🔢 **OrderItemImei (IMEI/Numéro de série)**

Numéro IMEI ou de série associé à un article de commande.

**Propriétés:**

- `id`: Identifiant unique UUID
- `order_item_id`: ID de l'article parent
- `sku`: Code produit
- `imei`: Numéro IMEI ou de série
- `product_name`: Nom du produit
- `appearance`: État physique
- `functionality`: État fonctionnel
- `boxed`: Présence emballage
- `color`: Couleur
- `cloud_lock`: Statut verrouillage
- `additional_info`: Informations supplémentaires
- `supplier_price`: Prix fournisseur
- `dbc_price`: Prix DBC
- `created_at`: Date d'ajout

## Système RBAC

### 🎭 **Role (Rôle)**

Définit le niveau d'accès d'un utilisateur.

**Valeurs:**

- `admin`: Administrateur système
- `client`: Client standard

### 🔐 **Permission**

Action spécifique qu'un utilisateur peut effectuer.

**Format:** `resource:action[:scope]`

**Permissions Catalogue:**

- `catalog:read`: Lecture du catalogue
- `catalog:write`: Modification du catalogue
- `catalog:import`: Import de catalogues

**Permissions Commandes:**

- `order:read:own`: Lecture de ses propres commandes
- `order:read:all`: Lecture de toutes les commandes
- `order:create`: Création de commandes
- `order:update:own`: Modification de ses commandes
- `order:update:all`: Modification de toutes les commandes
- `order:delete:own`: Suppression de ses commandes
- `order:delete:all`: Suppression de toutes les commandes
- `order:export`: Export des commandes

**Permissions Utilisateurs:**

- `user:read:all`: Lecture de tous les utilisateurs
- `user:create`: Création d'utilisateurs
- `user:update`: Modification d'utilisateurs
- `user:delete`: Suppression d'utilisateurs

**Permissions Système:**

- `metrics:read`: Lecture des métriques
- `system:health`: Accès aux health checks
- `system:logs`: Accès aux logs système

### 🎯 **Resource (Ressource)**

Type d'entité protégée par le système RBAC.

**Valeurs:**

- `catalog`: Catalogue produits
- `order`: Commandes
- `user`: Utilisateurs
- `metrics`: Métriques système
- `system`: Système

## Concepts Techniques

### 🆔 **Request ID**

Identifiant unique généré pour chaque requête HTTP pour la traçabilité.

**Format:** UUID v4
**Usage:** Logs, debugging, support client
**Header:** `x-request-id`

### 📊 **Metrics (Métriques)**

Données quantitatives collectées pour le monitoring.

**Types:**

- **Counter**: Valeur qui ne fait qu'augmenter
- **Gauge**: Valeur qui peut monter/descendre
- **Histogram**: Distribution de valeurs
- **Summary**: Échantillon de valeurs avec quantiles

### 🏥 **Health Check**

Vérification automatique de l'état des services.

**Statuts:**

- `healthy`: Service opérationnel
- `degraded`: Service lent mais fonctionnel
- `unhealthy`: Service défaillant

### 📈 **Business Metrics**

Métriques spécifiques au métier DBC.

**Exemples:**

- Nombre de commandes créées
- Taux de conversion catalogue → commande
- Temps de traitement des imports
- Taux d'abandon de panier

## Variables d'Environnement

### 🔧 **Configuration Supabase**

#### `NEXT_PUBLIC_SUPABASE_URL`

**Description:** URL publique du projet Supabase
**Format:** `https://xxxxx.supabase.co`
**Requis:** ✅ Oui
**Côté:** Client + Serveur
**Exemple:** `https://abcdefgh.supabase.co`

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Description:** Clé publique anonyme Supabase
**Format:** JWT token
**Requis:** ✅ Oui
**Côté:** Client + Serveur
**Sécurité:** Publique (pas de secret)

#### `SUPABASE_SERVICE_ROLE_KEY`

**Description:** Clé de service admin Supabase
**Format:** JWT token
**Requis:** ✅ Oui
**Côté:** Serveur seulement
**Sécurité:** 🔒 Secret (accès admin complet)

### 🌐 **Configuration API**

#### `NEXT_PUBLIC_API_URL`

**Description:** URL de l'API backend
**Format:** URL complète
**Requis:** ✅ Oui
**Côté:** Client + Serveur
**Exemple:** `https://api.dbc-b2b.com`

#### `CORS_ORIGINS`

**Description:** Origines autorisées pour CORS
**Format:** Liste séparée par virgules
**Requis:** ⚠️ Production seulement
**Côté:** Serveur
**Exemple:** `https://app.dbc-b2b.com,https://admin.dbc-b2b.com`

### 📊 **Configuration Monitoring**

#### `GRAFANA_USER`

**Description:** Nom d'utilisateur admin Grafana
**Format:** String
**Requis:** ⚠️ Si monitoring activé
**Côté:** Infrastructure
**Défaut:** `admin`

#### `GRAFANA_PASSWORD`

**Description:** Mot de passe admin Grafana
**Format:** String
**Requis:** ⚠️ Si monitoring activé
**Côté:** Infrastructure
**Sécurité:** 🔒 Secret

#### `GRAFANA_DOMAIN`

**Description:** Domaine pour accès Grafana
**Format:** FQDN
**Requis:** ❌ Optionnel
**Côté:** Infrastructure
**Exemple:** `monitoring.dbc-b2b.com`

### 🔌 **APIs Externes (Futur)**

#### `FOXWAY_API_URL`

**Description:** URL de l'API Foxway
**Format:** URL complète
**Requis:** ❌ Futur
**Côté:** Serveur
**Exemple:** `https://api.foxway.com/v1`

#### `FOXWAY_API_KEY`

**Description:** Clé d'authentification API Foxway
**Format:** String
**Requis:** ❌ Futur
**Côté:** Serveur
**Sécurité:** 🔒 Secret

### 🏗️ **Configuration Build**

#### `NODE_ENV`

**Description:** Environnement Node.js
**Format:** `development` | `production` | `test`
**Requis:** ✅ Oui
**Côté:** Partout
**Défaut:** `development`

#### `NEXT_TELEMETRY_DISABLED`

**Description:** Désactive la télémétrie Next.js
**Format:** `1` | `0`
**Requis:** ❌ Optionnel
**Côté:** Build
**Recommandé:** `1` (pour la confidentialité)

## Processus Métier

### 📥 **Import Catalogue**

Processus d'importation d'un fichier Excel catalogue.

**Étapes:**

1. **Upload**: Téléchargement du fichier Excel
2. **Validation**: Vérification de la structure
3. **Transformation**: Application des marges DBC
4. **Backup**: Sauvegarde de l'état actuel
5. **Import**: Insertion atomique en base
6. **Validation**: Vérification post-import
7. **Cleanup**: Nettoyage ou rollback

**Types de marge:**

- **Normale**: +11% sur le prix fournisseur
- **Marginale**: +1% sur le prix fournisseur

### 🛍️ **Cycle de Commande**

Processus complet d'une commande client.

**États:**

1. **Draft**: Commande en cours de création
2. **Validated**: Commande validée par le client
3. **Shipping**: Commande en cours d'expédition
4. **Completed**: Commande livrée et terminée

### 🔍 **Audit Trail**

Traçabilité des actions utilisateur.

**Éléments tracés:**

- Connexions/déconnexions
- Imports de catalogue
- Créations/modifications de commandes
- Changements de statut
- Erreurs système

## Formats de Données

### 📊 **Format Excel Catalogue**

Structure attendue pour les fichiers d'import catalogue.

**Colonnes obligatoires:**

- `SKU`: Code produit unique
- `Product Name`: Nom du produit
- `Price`: Prix fournisseur
- `Quantity`: Stock disponible
- `Appearance`: État physique
- `Functionality`: État fonctionnel
- `Boxed`: Présence emballage

**Colonnes optionnelles:**

- `Color`: Couleur
- `Cloud Lock`: Statut verrouillage
- `Additional Info`: Informations supplémentaires
- `Campaign Price`: Prix promotionnel

### 📋 **Format Export Commande**

Structure des fichiers d'export de commande.

**Formats supportés:**

- **Excel (.xlsx)**: Pour traitement manuel
- **CSV (.csv)**: Pour import comptable
- **JSON (.json)**: Pour intégrations API

### 📈 **Format Métriques Prometheus**

Format des métriques exposées pour Prometheus.

**Exemple:**

```
# HELP dbc_orders_created_total Total orders created
# TYPE dbc_orders_created_total counter
dbc_orders_created_total{status="completed"} 42
```

## Codes d'Erreur

### 🚨 **Codes HTTP Standards**

- `200`: Succès
- `201`: Ressource créée
- `400`: Requête invalide
- `401`: Non authentifié
- `403`: Non autorisé
- `404`: Ressource non trouvée
- `409`: Conflit (ressource existante)
- `422`: Données invalides
- `500`: Erreur serveur interne
- `503`: Service indisponible

### ⚠️ **Codes Métier Spécifiques**

- `CATALOG_IMPORT_FAILED`: Échec d'import catalogue
- `ORDER_VALIDATION_FAILED`: Échec validation commande
- `INSUFFICIENT_STOCK`: Stock insuffisant
- `DUPLICATE_SKU`: SKU déjà existant
- `INVALID_MARGIN_TYPE`: Type de marge invalide
- `RBAC_PERMISSION_DENIED`: Permission refusée

## Acronymes et Abréviations

- **API**: Application Programming Interface
- **B2B**: Business to Business
- **CORS**: Cross-Origin Resource Sharing
- **CSV**: Comma-Separated Values
- **DBC**: Nom de l'entreprise client
- **FQDN**: Fully Qualified Domain Name
- **HTTP**: HyperText Transfer Protocol
- **HTTPS**: HTTP Secure
- **IMEI**: International Mobile Equipment Identity
- **JSON**: JavaScript Object Notation
- **JWT**: JSON Web Token
- **LOC**: Lines of Code
- **RBAC**: Role-Based Access Control
- **REST**: Representational State Transfer
- **RLS**: Row Level Security
- **SKU**: Stock Keeping Unit
- **SQL**: Structured Query Language
- **SSG**: Static Site Generation
- **TTC**: Toutes Taxes Comprises
- **TVA**: Taxe sur la Valeur Ajoutée
- **UUID**: Universally Unique Identifier
- **XLS/XLSX**: Microsoft Excel formats

---

_Ce glossaire est maintenu à jour avec l'évolution de la plateforme. Pour toute question ou ajout, contactez l'équipe de développement._
