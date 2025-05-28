# Architecture DBC B2B Platform

## Vue d'ensemble

La plateforme est conçue avec une architecture modulaire qui permet l'évolution vers une intégration temps réel avec l'API Foxway.

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Frontend      │────▶│   Backend    │────▶│  Scripts Python │────▶│   Foxway API │
│   (Next.js)     │     │  (FastAPI)   │     │  (Processing)   │     │   (Future)   │
└─────────────────┘     └──────────────┘     └─────────────────┘     └──────────────┘
         │                      │                      │                       │
         └──────────┬───────────┴──────────────────────┴───────────────────────┘
                    │
              ┌─────▼─────┐
              │  Database │
              │ (Postgres)│
              └───────────┘
```

## Composants

### 1. Frontend (Next.js)

- **Pages**:

  - `/login` : Authentification B2B
  - `/catalog` : Catalogue produits avec filtres
  - `/orders` : Gestion des commandes
  - `/cart` : Panier en cours

- **État global** (Zustand):
  - Authentification
  - Panier
  - Cache produits

### 2. Backend (FastAPI)

- **Routes API**:

  - `/api/auth/*` : Authentification JWT
  - `/api/catalog/*` : Gestion catalogues
  - `/api/products/*` : CRUD produits
  - `/api/orders/*` : Gestion commandes
  - `/api/foxway/*` : Intégration Foxway (préparée)

- **Services**:
  - Scripts Python existants
  - Queue de tâches (Celery)
  - Cache (Redis)

### 3. Scripts Python

- `transform_catalog.py` : Transformation avec marges
- `apply_dbc_prices_to_order.py` : Application prix DBC
- `process_imei_order.py` : Traitement IMEI

### 4. Base de données

```sql
-- Tables principales
users
clients
products
orders
order_items
catalog_imports
price_history
```

## Flux de données

### Actuel (Import manuel)

1. Upload catalogue Excel → Transformation → Stockage DB
2. Client passe commande → Export Excel → Validation manuelle
3. Import commande validée → Application prix DBC → Export final

### Futur (API temps réel)

1. Sync automatique catalogue via API Foxway
2. Vérification stock temps réel avant commande
3. Création commande directe via API
4. Webhooks pour mises à jour statut

## Intégration Foxway (Future)

### Endpoints prévus

```python
# backend/integrations/foxway/client.py
- get_catalog()      # Catalogue temps réel
- check_stock()      # Vérification stock
- create_order()     # Création commande
- get_order_status() # Suivi commande
- webhook_handler()  # Réception événements
```

### Webhooks

- `stock.updated` : Mise à jour stock
- `order.status_changed` : Changement statut
- `price.changed` : Changement prix

## Sécurité

### Authentification

- JWT pour l'API
- Sessions sécurisées
- Rôles (client/admin)

### Données

- Chiffrement en transit (HTTPS)
- Sanitization des inputs
- Validation côté serveur

## Scalabilité

### Horizontal

- Frontend : CDN + SSG
- Backend : Load balancer + instances multiples
- DB : Read replicas

### Vertical

- Cache Redis pour produits
- Queue Celery pour tâches lourdes
- Optimisation requêtes DB

## Monitoring

### Métriques

- Performance API
- Taux de conversion
- Erreurs/Exceptions

### Logs

- Accès API
- Transformations catalogue
- Commandes

## Déploiement

### Environnements

- Dev : Local Docker
- Staging : Cloud (similaire prod)
- Prod : Cloud haute disponibilité

### CI/CD

- Tests automatiques
- Build Docker
- Déploiement progressif
