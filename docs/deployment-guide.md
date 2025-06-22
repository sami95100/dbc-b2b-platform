# Guide de Déploiement - Plateforme B2B DBC

## 🎯 Architecture à Déployer

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend    │────▶│   Base de       │
│   (Next.js)     │     │  (FastAPI)   │     │   Données       │
│   Port: 3000    │     │  Port: 8000  │     │  (Supabase)     │
└─────────────────┘     └──────────────┘     └─────────────────┘
```

## 🚀 Option 1: Déploiement Rapide (Recommandé)

### Frontend sur Vercel + Backend sur Railway

#### 1. Déploiement Frontend (Next.js)

**Prérequis :**

- Compte [Vercel](https://vercel.com)
- Repository GitHub connecté

**Étapes :**

1. Connectez votre repo à Vercel
2. Configurez les variables d'environnement :

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

**Build Command :** `npm run build`
**Output Directory :** `.next`

#### 2. Déploiement Backend (FastAPI)

**Prérequis :**

- Compte [Railway](https://railway.app)

**Fichiers nécessaires :**

**`backend/Dockerfile`:**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "$PORT"]
```

**`backend/railway.json`:**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "uvicorn api.main:app --host 0.0.0.0 --port $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Variables d'environnement Railway :**

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PYTHON_VERSION=3.11
PORT=8000
```

**Coût estimé :** ~20-30€/mois

---

## 🏢 Option 2: Déploiement Professionnel sur AWS

### Architecture Complète

#### 1. Frontend sur AWS Amplify

- Build automatique depuis GitHub
- CDN global
- SSL automatique

#### 2. Backend sur AWS ECS (Fargate)

- Containers Docker
- Auto-scaling
- Load balancer

#### 3. Base de données

- Garder Supabase (recommandé)
- Ou migrer vers RDS PostgreSQL

**Coût estimé :** ~100-200€/mois

---

## 🐳 Option 3: Déploiement Containerisé (Docker)

### Configuration Docker Compose

**`docker-compose.prod.yml`:**

```yaml
version: "3.8"

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    volumes:
      - ./backend/data:/app/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - frontend
      - backend
```

**Plateformes compatibles :**

- DigitalOcean App Platform
- Google Cloud Run
- Azure Container Instances

---

## ⚡ Option 4: Solution Serverless (Économique)

### Frontend sur Netlify + Backend sur Supabase Edge Functions

#### 1. Migration du Backend vers Supabase Edge Functions

**Avantages :**

- Pas de serveur à gérer
- Coût très faible
- Intégration native avec Supabase

**Modifications nécessaires :**

- Convertir les routes FastAPI en Edge Functions
- Adapter les scripts Python

#### 2. Déploiement

```bash
# Installation Supabase CLI
npm install -g supabase

# Déploiement des fonctions
supabase functions deploy
```

**Coût estimé :** ~5-15€/mois

---

## 🔧 Configuration Commune

### 1. Variables d'Environnement

**Frontend (.env.production):**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

**Backend (.env):**

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CORS_ORIGINS=["https://your-frontend-url.com"]
```

### 2. Configuration CORS

**Mise à jour `backend/api/main.py`:**

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-domain.com",
        "https://your-domain.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 3. Domaine Personnalisé

**Options :**

- Acheter un domaine (ex: votre-plateforme.com)
- Configurer DNS vers vos services
- SSL automatique avec Let's Encrypt

---

## 📊 Comparatif des Options

| Option           | Coût/mois | Complexité | Scalabilité | Temps setup |
| ---------------- | --------- | ---------- | ----------- | ----------- |
| Vercel + Railway | 20-30€    | ⭐⭐       | ⭐⭐⭐      | 2-4h        |
| AWS              | 100-200€  | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐  | 1-2 jours   |
| Docker           | 50-100€   | ⭐⭐⭐     | ⭐⭐⭐⭐    | 4-8h        |
| Serverless       | 5-15€     | ⭐⭐⭐     | ⭐⭐⭐⭐    | 1-2 jours   |

---

## 🚨 Checklist Pré-Déploiement

### Sécurité

- [ ] Variables d'environnement sécurisées
- [ ] CORS configuré correctement
- [ ] HTTPS forcé partout
- [ ] Clés API rotées

### Performance

- [ ] Images optimisées
- [ ] Bundles minifiés
- [ ] Cache configuré
- [ ] CDN activé

### Monitoring

- [ ] Logs configurés
- [ ] Alertes d'erreur
- [ ] Monitoring uptime
- [ ] Métriques performance

### Backup

- [ ] Base de données sauvegardée
- [ ] Code versionné
- [ ] Configuration documentée

---

## 🎯 Recommandation

**Pour commencer rapidement :** Option 1 (Vercel + Railway)

- Setup simple et rapide
- Coût raisonnable
- Excellente performance
- Support technique inclus

**Voulez-vous que je vous aide à mettre en place l'Option 1 ?**
