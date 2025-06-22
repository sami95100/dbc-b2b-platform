# 🚀 Déploiement Plateforme B2B DBC

## Démarrage Rapide

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

## 🎯 Architecture de Déploiement

```
Vercel (Frontend)     Railway (Backend)     Supabase (DB)
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   Next.js       │──▶│   FastAPI       │──▶│   PostgreSQL    │
│   Static + SSR  │   │   Python        │   │   Auth + Data   │
│   CDN Global    │   │   Auto-scaling  │   │   Managed       │
└─────────────────┘   └─────────────────┘   └─────────────────┘
```

## 📦 Fichiers de Configuration Créés

- ✅ `backend/Dockerfile` - Configuration Docker pour Railway
- ✅ `backend/railway.json` - Configuration Railway
- ✅ `vercel.json` - Configuration Vercel
- ✅ `deploy.sh` - Script de préparation automatique
- ✅ `DEPLOYMENT_STEPS.md` - Guide détaillé étape par étape
- ✅ `docs/deployment-guide.md` - Guide complet avec toutes les options

## 🔧 Variables d'Environnement Requises

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

## 🚀 Déploiement en 3 Étapes

### 1. Backend sur Railway

1. Se connecter à [Railway](https://railway.app) avec GitHub
2. Nouveau projet → Deploy from GitHub → Sélectionner repo
3. Configurer le répertoire `backend`
4. Ajouter les variables d'environnement
5. Déployer automatiquement

### 2. Frontend sur Vercel

1. Se connecter à [Vercel](https://vercel.com) avec GitHub
2. Import project → Sélectionner repo
3. Next.js détecté automatiquement
4. Ajouter les variables d'environnement
5. Deploy

### 3. Configuration CORS

1. Récupérer l'URL Vercel
2. Mettre à jour `CORS_ORIGINS` sur Railway
3. Tester l'intégration

## 💰 Coûts Estimés

| Service      | Plan  | Coût/mois    | Inclut                |
| ------------ | ----- | ------------ | --------------------- |
| **Vercel**   | Hobby | Gratuit      | 100GB bandwidth, SSL  |
| **Railway**  | Hobby | $5           | 512MB RAM, $5 compute |
| **Supabase** | Free  | Gratuit      | 500MB DB, 50MB files  |
| **Total**    |       | **~$5/mois** | Parfait pour démarrer |

## 🎯 Recommandations

### Pour Production

- Upgrade vers plans payants selon usage
- Configurer monitoring et alertes
- Mettre en place sauvegardes
- Ajouter domaine personnalisé

### Performance

- Optimiser images (next/image)
- Configurer cache Vercel
- Surveiller métriques Railway
- Optimiser requêtes DB

## 🚨 Résolution Problèmes Fréquents

### CORS Errors

```bash
# Vérifier CORS_ORIGINS sur Railway
CORS_ORIGINS=https://your-app.vercel.app,https://your-domain.com
```

### Build Failures

```bash
# Frontend: Vérifier les logs Vercel
# Backend: Vérifier les logs Railway
# Souvent des variables d'environnement manquantes
```

### API Non Accessible

```bash
# Vérifier que l'URL API est correcte dans NEXT_PUBLIC_API_URL
# Tester directement: https://your-backend.railway.app/docs
```

## 📞 Support

- **Vercel**: [Documentation](https://vercel.com/docs)
- **Railway**: [Discord](https://discord.gg/railway)
- **Supabase**: [Discord](https://discord.supabase.com/)

## 🎉 Après Déploiement

Une fois déployé, votre plateforme sera accessible à:

- **Frontend**: `https://your-project.vercel.app`
- **API Docs**: `https://your-backend.railway.app/docs`
- **Admin Panel**: `https://your-project.vercel.app/admin`

Les déploiements futurs se feront automatiquement à chaque push sur `main` ! 🚀
