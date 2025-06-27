# 🚀 Guide de Déploiement Complet - Plateforme B2B DBC

## 🎯 Démarrage Rapide

```bash
# 1. Exécuter le script de préparation
./deploy.sh

# 2. Éditer les variables d'environnement
# Éditer .env.local et backend/.env avec vos vraies valeurs

# 3. Pousser sur GitHub
git add .
git commit -m "Préparation déploiement"
git push origin main
```

## 🏗️ Architecture de Déploiement

```
Vercel (Frontend)     Railway (Backend)     Supabase (DB)
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   Next.js       │──▶│   FastAPI       │──▶│   PostgreSQL    │
│   Static + SSR  │   │   Python        │   │   Auth + Data   │
│   CDN Global    │   │   Auto-scaling  │   │   Managed       │
└─────────────────┘   └─────────────────┘   └─────────────────┘
```

## 📦 Fichiers de Configuration

- ✅ `backend/Dockerfile` - Configuration Docker pour Railway
- ✅ `backend/railway.json` - Configuration Railway
- ✅ `vercel.json` - Configuration Vercel
- ✅ `deploy.sh` - Script de préparation automatique

## 🔧 Variables d'Environnement

### Frontend (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

### Backend (backend/.env)

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
CORS_ORIGINS=https://your-frontend.vercel.app
```

## 🚀 Déploiement Étape par Étape

### Étape 1: Préparation du Repository

**Vérifier la structure du projet**

```bash
/
├── src/                    # Frontend Next.js
├── backend/               # Backend FastAPI
├── package.json          # Dépendances frontend
├── vercel.json           # Configuration Vercel
└── backend/
    ├── Dockerfile        # Configuration Docker
    ├── railway.json      # Configuration Railway
    └── requirements.txt  # Dépendances Python
```

### Étape 2: Déployer le Backend sur Railway

1. **Créer un compte Railway**

   - Aller sur [railway.app](https://railway.app)
   - S'inscrire avec GitHub

2. **Créer un nouveau projet**

   - Cliquer sur "New Project"
   - Sélectionner "Deploy from GitHub repo"
   - Choisir votre repository
   - Sélectionner le dossier `backend`

3. **Configurer les variables d'environnement**

   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   CORS_ORIGINS=https://your-frontend.vercel.app
   PORT=8000
   ```

4. **Récupérer l'URL** : `https://your-backend.railway.app`

### Étape 3: Déployer le Frontend sur Vercel

1. **Créer un compte Vercel**

   - Aller sur [vercel.com](https://vercel.com)
   - S'inscrire avec GitHub

2. **Importer le projet**

   - Cliquer sur "New Project"
   - Sélectionner votre repository
   - Vercel détecte automatiquement Next.js

3. **Configurer les variables d'environnement**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   ```

### Étape 4: Finalisation

1. **Mettre à jour le CORS**

   - Récupérer l'URL Vercel : `https://your-app.vercel.app`
   - Modifier `CORS_ORIGINS` sur Railway
   - Redéployer automatiquement

2. **Vérifications**
   - Frontend : `https://your-app.vercel.app`
   - API : `https://your-backend.railway.app/docs`
   - Test d'intégration

## 💰 Coûts Estimés

| Service      | Plan  | Coût/mois    | Inclut                |
| ------------ | ----- | ------------ | --------------------- |
| **Vercel**   | Hobby | Gratuit      | 100GB bandwidth, SSL  |
| **Railway**  | Hobby | $5           | 512MB RAM, $5 compute |
| **Supabase** | Free  | Gratuit      | 500MB DB, 50MB files  |
| **Total**    |       | **~$5/mois** | Parfait pour démarrer |

## 🚨 Résolution de Problèmes

### CORS Errors

```bash
# Vérifier CORS_ORIGINS sur Railway
CORS_ORIGINS=https://your-app.vercel.app,https://your-domain.com
```

### Build Failures

- **Frontend** : Vérifier les logs Vercel
- **Backend** : Vérifier les logs Railway
- Souvent des variables d'environnement manquantes

### API Non Accessible

- Vérifier `NEXT_PUBLIC_API_URL`
- Tester directement : `https://your-backend.railway.app/docs`

## 🔧 Maintenance

### Déploiements Futurs

- Push sur `main` → Auto-déploiement automatique

### Monitoring

- **Vercel** : Analytics et logs automatiques
- **Railway** : Metrics et logs dans le dashboard
- **Supabase** : Monitoring database dans le dashboard

## 🎉 Félicitations !

Une fois déployé, votre plateforme sera accessible à :

- **Frontend** : `https://your-project.vercel.app`
- **API Docs** : `https://your-backend.railway.app/docs`
- **Admin Panel** : `https://your-project.vercel.app/admin`

Les déploiements futurs se feront automatiquement à chaque push sur `main` ! 🚀
