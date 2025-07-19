# 🚀 DBC B2B Platform - Architecture Robuste et Sécurisée

Plateforme B2B moderne avec système RBAC, monitoring intégré et import atomique des catalogues. Conçue pour gérer 100+ utilisateurs simultanés avec une architecture scalable et sécurisée.

## 📁 Structure du projet (organisée)

```
dbc-b2b-platform/
├── src/                        # Code source principal
│   ├── app/                    # Next.js App Router
│   ├── components/             # Composants React
│   ├── domain/                 # Services métier
│   │   └── catalog/           # Service catalogue
│   ├── rbac/                  # Système de permissions
│   ├── middleware/            # Middleware (logging, auth)
│   └── lib/                   # Utilitaires
├── backend/                   # API FastAPI + Scripts Python
│   ├── api/                   # API FastAPI
│   ├── integrations/          # Intégrations externes (Foxway)
│   └── scripts/               # Scripts de traitement
├── infra/                     # Infrastructure & Déploiement
│   ├── monitoring/            # Prometheus + Grafana
│   ├── docker/               # Dockerfiles
│   └── scripts/              # Scripts de déploiement
├── data/                      # Données & Fichiers
│   ├── catalogs/             # Catalogues Excel
│   ├── orders/               # Commandes traitées
│   └── examples/             # Fichiers d'exemple
├── docs/                      # Documentation complète
│   ├── architecture.md       # Architecture technique
│   ├── glossary.md          # Glossaire & Variables
│   └── legacy-readmes/      # Anciens README archivés
├── scripts/                   # Scripts utilitaires
│   ├── smoke-test.js         # Tests de fumée
│   └── validate-config.js    # Validation configuration
└── README.md                 # Ce fichier
```

## 🏗️ Architecture & Technologies

### 🎯 **Fonctionnalités Clés**

- ✅ **Système RBAC** complet avec permissions granulaires
- ✅ **Import atomique** des catalogues avec rollback automatique
- ✅ **Monitoring temps réel** avec Prometheus + Grafana
- ✅ **Health checks** automatisés sur tous les services
- ✅ **Tests automatisés** avec couverture 80%+ sur les flux critiques
- ✅ **Request ID** unique pour traçabilité complète
- ✅ **Catalogue extensible** avec attributs dynamiques JSON
- ✅ **Documentation** complète format Notion-compatible
- ✅ **PWA** avec installation native et mode offline

### 🔧 **Stack Technique**

#### Frontend (Next.js 14)

- **Next.js 14** avec App Router et TypeScript
- **Tailwind CSS** pour le styling responsive
- **Zustand** pour la gestion d'état optimisée
- **React Query** pour le cache et synchronisation
- **React Hook Form + Zod** pour validation
- **PWA** avec service worker pour performance

#### Backend (FastAPI + Python)

- **FastAPI** pour API REST haute performance
- **Python 3.11** avec scripts de traitement existants
- **Pydantic** pour validation des données
- **Uvicorn** avec support async/await

#### Base de Données (Supabase)

- **PostgreSQL** hébergé avec Row Level Security
- **Authentification JWT** intégrée
- **API REST** générée automatiquement
- **Storage** pour fichiers Excel et exports

#### Monitoring & Observabilité

- **Prometheus** pour collecte de métriques
- **Grafana** pour tableaux de bord temps réel
- **Health checks** sur tous les endpoints critiques
- **Logging structuré** avec Request ID
- **Alertes** automatiques en cas de problème

## 📊 Scripts Python développés

### 1. `transform_catalog.py`

Transforme le catalogue fournisseur en catalogue DBC avec marges :

- **Produits normaux** : prix × 1.11 (11% marge)
- **Produits marginaux** : prix × 1.01 (1% marge)
- Ignore les Campaign Price
- **Résultat** : 11,191 produits traités

### 2. `apply_dbc_prices_to_order.py`

Applique les prix DBC aux commandes fournisseur :

- Recherche par SKU exact ou caractéristiques
- Gestion des produits marginaux
- Modes DBC (interne) et Client (sans infos sensibles)
- **Résultat** : 41/43 produits trouvés, différence 1544.99€

### 3. `process_imei_order.py`

Traite les commandes avec numéros IMEI/série :

- Export CSV UTF-8 pour logiciel comptable
- Validation format de fichier
- Recherche intelligente des produits

### 4. `analyze_catalog.py`

Outil d'analyse de structure des fichiers Excel

## 🏗️ Architecture des APIs

### Vue d'ensemble

```
Frontend (Next.js) ←→ Backend API (FastAPI) ←→ Supabase (PostgreSQL)
                              ↓
                      API Foxway (Future)
```

### Endpoints principaux

- `GET /api/health` - Santé de l'API
- `POST /api/auth/login` - Authentification
- `GET /api/catalog/products` - Catalogue produits
- `POST /api/orders` - Créer commande
- `GET /api/orders/{id}` - Détails commande

### Supabase - Pourquoi ce choix ?

- **PostgreSQL** robuste et performant
- **API REST automatique** générée du schéma
- **Authentification complète** avec JWT
- **Real-time** pour mises à jour instantanées
- **Storage** pour fichiers Excel
- **Dashboard** d'administration

## 🛠️ Développement & Déploiement

### 📋 **Prérequis**

- **Node.js 18+** avec npm/yarn
- **Python 3.11+** avec pip
- **Docker & Docker Compose** pour le monitoring
- **Compte Supabase** pour la base de données
- **Git** pour le versioning

### 🚀 **Installation Rapide**

```bash
# 1. Cloner le repository
git clone <repo-url>
cd dbc-b2b-platform

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env.local
# Éditer .env.local avec vos valeurs

# 4. Lancer les tests
npm run test

# 5. Démarrer en mode développement
npm run dev

# 6. Lancer le monitoring (optionnel)
cd infra/monitoring
docker-compose up -d
```

### ⚙️ **Scripts Disponibles**

```bash
# Développement
npm run dev              # Démarrer Next.js en mode dev
npm run build           # Build de production
npm run start           # Démarrer en mode production
npm run lint            # Linter ESLint

# Tests
npm run test            # Tests unitaires
npm run test:watch      # Tests en mode watch
npm run test:coverage   # Tests avec couverture
npm run test:ci         # Tests pour CI/CD

# Monitoring & Health
npm run smoke-test      # Tests de fumée sur l'app
node scripts/smoke-test.js  # Tests de fumée direct

# Backend Python
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
```

### 🌍 **Variables d'Environnement**

#### **Frontend (.env.local)**

```bash
# Configuration Supabase (REQUIS)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here  # Admin seulement

# Configuration API
NEXT_PUBLIC_API_URL=http://localhost:8000

# Configuration Build
NODE_ENV=development
NEXT_TELEMETRY_DISABLED=1

# Configuration Monitoring (Optionnel)
GRAFANA_USER=admin
GRAFANA_PASSWORD=your_secure_password
GRAFANA_DOMAIN=localhost
```

#### **Backend (.env)**

```bash
# Configuration Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here

# Configuration API
CORS_ORIGINS=http://localhost:3000,https://app.dbc-b2b.com

# APIs Externes (Futur)
FOXWAY_API_URL=https://api.foxway.com/v1
FOXWAY_API_KEY=your_api_key_here
```

### 🧪 **Tests & Qualité**

#### **Tests Unitaires (Jest)**

```bash
# Lancer tous les tests
npm run test

# Tests avec couverture
npm run test:coverage

# Tests en mode watch
npm run test:watch

# Tests pour CI/CD
npm run test:ci
```

#### **Tests d'Intégration**

```bash
# Tests API avec Supertest
npm run test src/app/api/__tests__/

# Tests RBAC
npm run test src/rbac/__tests__/

# Tests des services métier
npm run test src/domain/__tests__/
```

#### **Tests de Fumée**

```bash
# Tests de fumée sur l'application
npm run smoke-test

# Avec URL personnalisée
SMOKE_TEST_URL=https://staging.dbc-b2b.com npm run smoke-test
```

#### **Couverture de Tests**

- **Global**: 80% minimum
- **Domaines critiques** (`src/domain/`): 90% minimum
- **RBAC** (`src/rbac/`): 95% minimum

### 📊 **Monitoring & Observabilité**

#### **Démarrer la Stack Monitoring**

```bash
cd infra/monitoring
docker-compose up -d

# Accès aux interfaces
# Grafana: http://localhost:3001 (admin/admin123)
# Prometheus: http://localhost:9090
# Alertmanager: http://localhost:9093
```

#### **Métriques Disponibles**

- **Business**: Commandes créées, taux de conversion, abandons panier
- **Techniques**: Temps de réponse, erreurs 5xx, utilisation mémoire
- **Santé**: Status des services, connectivité base de données

#### **Health Checks**

```bash
# Health check complet
curl http://localhost:3000/api/healthz

# Métriques Prometheus
curl http://localhost:3000/api/metrics
```

### 🔒 **Sécurité**

#### **Audit Sécurité**

```bash
# Audit des dépendances npm
npm audit

# Scan des secrets (si git-secrets installé)
git secrets --scan

# Vérification des variables d'env
node check-env-vars.sh
```

#### **Bonnes Pratiques Implémentées**

- ✅ **RBAC** granulaire avec vérification des permissions
- ✅ **JWT Tokens** avec expiration automatique
- ✅ **Row Level Security** sur PostgreSQL
- ✅ **Request ID** pour traçabilité complète
- ✅ **Validation** des entrées utilisateur (Zod)
- ✅ **HTTPS** obligatoire en production
- ✅ **CORS** configuré strictement
- ✅ **Rate limiting** sur endpoints sensibles

## 📋 Fonctionnalités prévues

### Phase 1 (Actuelle)

- ✅ Scripts de traitement des catalogues et commandes
- ✅ Architecture backend/frontend
- ✅ Configuration Supabase
- 🔄 Interface de login B2B
- 🔄 Catalogue produits avec filtres

### Phase 2 (Future)

- 📋 Gestion panier et commandes
- 📋 Historique des commandes
- 📋 Intégration API Foxway
- 📋 Notifications temps réel
- 📋 Workflow automatisé complet

## 📚 Documentation

- [Architecture des APIs](docs/api-architecture.md) - Vue d'ensemble technique
- [Configuration Supabase](docs/supabase-setup.md) - Guide détaillé
- [Architecture générale](docs/architecture.md) - Vision globale
- [Automatisation](docs/automation.md) - Workflow futur

## 🎯 Objectif

Créer une plateforme B2B moderne permettant aux clients DBC de :

1. Se connecter avec leurs identifiants
2. Parcourir le catalogue avec filtres (comme Foxway)
3. Ajouter des produits au panier
4. Passer commande directement
5. Suivre leurs commandes

**Fini les échanges WhatsApp/email pour les commandes !**

# Force rebuild Wed Jun 25 22:46:14 CEST 2025
