# 🚀 Guide de Déploiement Étape par Étape

## Prérequis

- [ ] Compte GitHub avec votre code pushé
- [ ] Compte Supabase configuré
- [ ] Domaine personnalisé (optionnel)

## 🎯 Déploiement Recommandé: Vercel + Railway

### Étape 1: Préparation du Repository

1. **Vérifier la structure du projet**

```bash
# Votre structure doit ressembler à ceci:
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

2. **Configurer les variables d'environnement locales**

```bash
# Créer .env.local pour le frontend
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000

# Créer backend/.env pour le backend
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CORS_ORIGINS=http://localhost:3000
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

   - Dans l'onglet "Variables"
   - Ajouter :
     ```
     SUPABASE_URL=https://your-project.supabase.co
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
     CORS_ORIGINS=https://your-frontend.vercel.app
     PORT=8000
     ```

4. **Attendre le déploiement**
   - Railway va automatiquement build et déployer
   - Récupérer l'URL de votre API : `https://your-backend.railway.app`

### Étape 3: Déployer le Frontend sur Vercel

1. **Créer un compte Vercel**

   - Aller sur [vercel.com](https://vercel.com)
   - S'inscrire avec GitHub

2. **Importer le projet**

   - Cliquer sur "New Project"
   - Sélectionner votre repository
   - Vercel détecte automatiquement Next.js

3. **Configurer les variables d'environnement**

   - Dans "Environment Variables"
   - Ajouter :
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
     NEXT_PUBLIC_API_URL=https://your-backend.railway.app
     ```

4. **Déployer**
   - Cliquer sur "Deploy"
   - Attendre le build et le déploiement

### Étape 4: Mise à jour du CORS

1. **Récupérer l'URL Vercel**

   - Exemple : `https://your-app.vercel.app`

2. **Mettre à jour Railway**
   - Aller dans les variables d'environnement Railway
   - Modifier `CORS_ORIGINS` : `https://your-app.vercel.app`
   - Redéployer automatiquement

### Étape 5: Vérification

1. **Tester le frontend**

   - Ouvrir `https://your-app.vercel.app`
   - Vérifier que la page se charge

2. **Tester l'API**

   - Ouvrir `https://your-backend.railway.app/docs`
   - Vérifier que Swagger fonctionne

3. **Tester l'intégration**
   - Tester les fonctionnalités de votre app
   - Vérifier l'authentification
   - Tester les appels API

### Étape 6: Configuration du Domaine (Optionnel)

1. **Domaine personnalisé sur Vercel**

   - Dans Vercel, aller dans "Settings" > "Domains"
   - Ajouter votre domaine : `www.votre-domaine.com`
   - Configurer les DNS selon les instructions

2. **Sous-domaine pour l'API (Optionnel)**
   - Dans Railway, aller dans "Settings" > "Domains"
   - Ajouter : `api.votre-domaine.com`
   - Mettre à jour `NEXT_PUBLIC_API_URL`

## 🔧 Maintenance

### Déploiements Futurs

- **Frontend** : Push sur `main` → Auto-déploiement Vercel
- **Backend** : Push sur `main` → Auto-déploiement Railway

### Monitoring

- **Vercel** : Analytics et logs automatiques
- **Railway** : Metrics et logs dans le dashboard
- **Supabase** : Monitoring database dans le dashboard

### Sauvegarde

- **Code** : Versionné sur GitHub
- **Base de données** : Sauvegarde quotidienne Supabase
- **Configuration** : Variables d'environnement documentées

## 🚨 Résolution de Problèmes

### Erreurs CORS

```bash
# Vérifier les variables d'environnement
CORS_ORIGINS=https://your-frontend.vercel.app,https://your-domain.com
```

### Build Failures

```bash
# Frontend : Vérifier les logs Vercel
# Backend : Vérifier les logs Railway
```

### Performance

```bash
# Utiliser Vercel Analytics
# Surveiller les metrics Railway
```

## 🎉 Félicitations !

Votre plateforme B2B est maintenant en ligne !

**URLs importantes :**

- Frontend : `https://your-app.vercel.app`
- API : `https://your-backend.railway.app`
- Documentation API : `https://your-backend.railway.app/docs`

**Prochaines étapes :**

1. Configurer un domaine personnalisé
2. Mettre en place le monitoring
3. Optimiser les performances
4. Planifier les sauvegardes
