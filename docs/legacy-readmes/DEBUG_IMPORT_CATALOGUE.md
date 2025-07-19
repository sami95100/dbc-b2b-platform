# 🚨 Guide de Débogage - Import Catalogue en Production

## Problème Identifié

L'import du catalogue fonctionne en local mais échoue en production avec l'erreur "Erreur lors du traitement du fichier".

## Cause Principale

**Incompatibilité des variables d'environnement** entre développement local et production :

- **Local** : Variables dans `.env.local`
- **Production** : Variables dans l'environnement système (Vercel/Railway)

## ✅ Solution Appliquée

### 1. Script Python Corrigé

Le script `backend/scripts/catalog_processor.py` a été modifié pour être compatible avec les deux environnements :

```python
# Avant (ne fonctionnait qu'en local)
load_dotenv('.env.local')

# Après (compatible local + production)
load_dotenv('.env.local')  # Local
load_dotenv()  # Production
```

### 2. Gestion d'Erreurs Améliorée

- Messages d'erreur plus précis
- Logs détaillés dans l'API
- Identification exacte des variables manquantes

## 🔧 Étapes de Vérification

### Étape 1: Vérifier les Logs

Consultez les logs de votre application en production :

1. **Vercel** : Dashboard → Functions → Logs
2. Recherchez les erreurs lors de l'import du catalogue

### Étape 2: Vérifier les Variables d'Environnement

#### Dans Vercel (Frontend)

1. Aller sur vercel.com → Votre projet
2. Settings → Environment Variables
3. Vérifier que ces variables existent :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

⚠️ **IMPORTANT** : `SUPABASE_SERVICE_ROLE_KEY` doit être dans Vercel car le script Python s'exécute côté frontend (edge function).

### Étape 3: Redéployer

Après avoir ajouté/modifié les variables :

1. Sauvegarder les variables dans Vercel
2. Redéployer automatiquement ou forcer un redéploiement
3. Tester l'import du catalogue

## 🎯 Vérifications Spécifiques

### Variables Requises

| Variable                        | Localisation | Description                  |
| ------------------------------- | ------------ | ---------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Vercel       | URL de votre projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY`     | Vercel       | Clé service role (admin)     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel       | Clé publique anonyme         |

### Où Trouver ces Variables

1. **Supabase Dashboard** : https://app.supabase.com
2. Votre projet → Settings → API
3. Copier les valeurs exactes

## 🚨 Problèmes Fréquents

### 1. Variables Manquantes

```
❌ Variable d'environnement SUPABASE_SERVICE_ROLE_KEY manquante
```

**Solution** : Ajouter la variable dans Vercel → Settings → Environment Variables

### 2. Mauvaises Clés

```
❌ Erreur connexion Supabase: Invalid JWT
```

**Solution** : Vérifier que vous utilisez la bonne `SERVICE_ROLE_KEY` (pas l'anon key)

### 3. URL Incorrecte

```
❌ Erreur connexion Supabase: fetch failed
```

**Solution** : Vérifier l'URL Supabase (format: `https://xxx.supabase.co`)

## 🧪 Test Local

Pour tester le script localement après modifications :

```bash
cd backend/scripts
python3 catalog_processor.py ../../../temp/test_catalog.xlsx
```

## 📞 Support

Si le problème persiste après ces étapes :

1. Vérifiez les logs Vercel : Dashboard → Functions → Logs
2. Testez l'import avec un fichier catalogue simple
3. Vérifiez que toutes les dépendances Python sont installées

## ✅ Checklist de Résolution

- [ ] Variables d'environnement ajoutées dans Vercel
- [ ] Redéploiement effectué
- [ ] Logs de production vérifiés
- [ ] Import de catalogue fonctionnel

Une fois toutes ces étapes validées, l'import du catalogue devrait fonctionner parfaitement en production ! 🎉
