# 🚨 Guide de Résolution des Problèmes de Déploiement

## Erreurs de Build Communes

### ❌ Erreur: Module not found - Can't resolve 'components/...'

**Symptôme:**

```
Module not found: Can't resolve '../../../components/DBCLogo'
```

**Cause:** Chemins d'import relatifs incorrects ou incohérents

**Solution:** Utiliser les imports absolus configurés dans `tsconfig.json`

```typescript
// ❌ Mauvais - import relatif
import DBCLogo from "../../../components/DBCLogo";

// ✅ Bon - import absolu
import DBCLogo from "@/components/DBCLogo";
```

**Correctif appliqué:**

- Tous les imports de composants utilisent maintenant `@/components/`
- Configuration dans `tsconfig.json`: `"@/*": ["./src/*"]`

---

### ❌ Erreur: Build failed on Vercel

**Diagnostic:**

1. Aller sur Vercel Dashboard
2. Cliquer sur votre projet
3. Onglet "Deployments"
4. Cliquer sur le déploiement échoué
5. Voir les logs détaillés

**Solutions courantes:**

#### Variables d'environnement manquantes

```bash
# Vérifier dans Vercel Dashboard > Settings > Environment Variables
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=
```

#### TypeScript errors

```bash
# Corriger les erreurs de type
npm run build # Tester localement
```

#### Imports invalides

```bash
# Utiliser imports absolus
import Component from '@/components/Component';
import { utils } from '@/lib/utils';
```

---

### ❌ Erreur: Railway Build Failed

**Symptôme:**

```
"uvicorn api.main:app" command not found
```

**Solutions:**

#### Requirements manquants

```python
# backend/requirements.txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
# ... autres dépendances
```

#### Dockerfile incorrect

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Variables d'environnement Railway

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CORS_ORIGINS=https://your-app.vercel.app
PORT=8000
```

---

## Erreurs Runtime

### ❌ CORS Errors

**Symptôme:**

```
Access to fetch at 'https://api...' from origin 'https://app...'
has been blocked by CORS policy
```

**Solution:**

1. Vérifier `CORS_ORIGINS` sur Railway
2. Doit contenir l'URL exacte de Vercel
3. Format: `https://your-app.vercel.app` (sans slash final)

```python
# backend/api/main.py
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    # ...
)
```

---

### ❌ API Non Accessible

**Diagnostic:**

```bash
# Tester l'API directement
curl https://your-backend.railway.app/health

# Vérifier la documentation
https://your-backend.railway.app/docs
```

**Solutions:**

- Vérifier que Railway montre "Active"
- Vérifier les logs Railway
- Tester les variables d'environnement

---

### ❌ Base de Données Non Accessible

**Symptôme:**

```
supabase.auth.AuthApiError: Invalid API key
```

**Solutions:**

1. Vérifier les clés Supabase dans Dashboard
2. Régénérer les clés si nécessaire
3. Mettre à jour les variables d'environnement

```bash
# Variables requises
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs... (différent)
```

---

## Procédure de Debug

### 1. Vérification Locale

```bash
# Frontend
npm run build
npm run start

# Backend (dans le dossier backend)
pip install -r requirements.txt
uvicorn api.main:app --reload
```

### 2. Vérification des Variables

```bash
# Créer .env.local et backend/.env avec les vraies valeurs
# Tester localement avant de déployer
```

### 3. Logs de Production

- **Vercel**: Dashboard > Project > Functions > View Function Logs
- **Railway**: Dashboard > Project > Deployments > View Logs
- **Supabase**: Dashboard > Logs

### 4. Tests de Connectivité

```bash
# Tester les endpoints
curl -I https://your-app.vercel.app
curl -I https://your-backend.railway.app
curl https://your-backend.railway.app/health
```

---

## Checklist de Validation

### Pre-Deploy

- [ ] Build local réussi (`npm run build`)
- [ ] Variables d'environnement configurées
- [ ] Imports absolus utilisés (`@/...`)
- [ ] Tests locaux passent

### Post-Deploy

- [ ] Vercel build réussi
- [ ] Railway deploy réussi
- [ ] API accessible (`/health`, `/docs`)
- [ ] Frontend charge sans erreur
- [ ] Pas d'erreurs CORS dans la console
- [ ] Authentification fonctionne

---

## Contacts Support

- **Next.js**: [Documentation](https://nextjs.org/docs)
- **Vercel**: [Support](https://vercel.com/support)
- **Railway**: [Discord](https://discord.gg/railway)
- **Supabase**: [Discord](https://discord.supabase.com/)

---

## Historique des Corrections

### 2024-XX-XX: Correction Imports Absolus

- **Problème**: Module not found pour DBCLogo
- **Solution**: Migration vers imports absolus `@/components/`
- **Commit**: `Fix: Corriger imports absolus pour résoudre erreur build Vercel`
