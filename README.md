# DBC B2B Platform

Plateforme B2B pour la gestion des commandes et catalogues DBC, permettant aux clients de passer commande directement sans passer par WhatsApp/email.

## 📁 Structure du projet (organisée)

```
foxway-margin/
├── backend/
│   ├── api/                    # API FastAPI
│   │   └── main.py
│   ├── integrations/           # Intégrations externes
│   │   └── foxway/
│   │       └── client.py
│   ├── scripts/                # Scripts Python existants
│   │   ├── transform_catalog.py
│   │   ├── apply_dbc_prices_to_order.py
│   │   ├── process_imei_order.py
│   │   └── analyze_catalog.py
│   └── requirements.txt
├── frontend-nextjs/            # Interface Next.js
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   ├── package.json
│   └── next.config.js
├── data/                       # Fichiers de données
│   ├── catalogs/              # Catalogues Excel
│   │   ├── Mobile devices-pricelist-Tuesday, May 27, 2025.xlsx
│   │   └── catalogue_dbc_20250528_015036.xlsx
│   ├── orders/                # Commandes traitées
│   │   ├── order-*.xlsx
│   │   └── order-*.csv
│   └── examples/              # Fichiers d'exemple
├── docs/                      # Documentation
│   ├── api-architecture.md    # Architecture des APIs
│   ├── supabase-setup.md     # Guide Supabase
│   ├── architecture.md
│   └── automation.md
└── README.md
```

## 🚀 Technologies

### Frontend

- **Next.js 14** : Framework React avec App Router
- **TypeScript** : Type safety
- **Tailwind CSS** : Styling moderne
- **Zustand** : State management
- **React Query** : Cache et synchronisation
- **React Hook Form + Zod** : Formulaires et validation

### Backend

- **FastAPI** : API REST haute performance
- **Python** : Réutilisation des scripts existants
- **Pydantic** : Validation des données
- **Uvicorn** : Serveur ASGI

### Base de données

- **Supabase** : PostgreSQL hébergé
- **API REST automatique** : Endpoints générés
- **Authentification JWT** : Sécurité intégrée
- **Row Level Security** : Isolation des données

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

## 🛠️ Développement

### Prérequis

- Node.js 18+
- Python 3.9+
- Compte Supabase

### Installation

#### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend-nextjs
npm install
npm run dev
```

### Variables d'environnement

#### Frontend (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### Backend (.env)

```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...
```

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
