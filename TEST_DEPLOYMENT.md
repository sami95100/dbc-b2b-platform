# 🧪 Guide de Test - Plateforme B2B Déployée

## ✅ Checklist de Test Post-Déploiement

### 1. Tests Backend (API)

#### Test de Base

- [ ] **API Health Check**

  - Aller sur `https://your-backend.railway.app/health`
  - Vérifier que la réponse contient `"status": "healthy"`

- [ ] **Documentation API**
  - Aller sur `https://your-backend.railway.app/docs`
  - Vérifier que Swagger UI s'affiche correctement
  - Tester quelques endpoints via l'interface

#### Test des Endpoints Principaux

```bash
# Remplacer YOUR_API_URL par votre URL Railway
curl -X GET "https://YOUR_API_URL/health"
curl -X GET "https://YOUR_API_URL/"
```

### 2. Tests Frontend

#### Test de Base

- [ ] **Page d'Accueil**

  - Aller sur `https://your-app.vercel.app`
  - Vérifier que la page se charge sans erreur
  - Vérifier que le logo et le header s'affichent

- [ ] **Pages Principales**
  - [ ] `/login` - Page de connexion
  - [ ] `/catalog` - Catalogue produits
  - [ ] `/orders` - Gestion commandes
  - [ ] `/admin` - Panel admin (si connecté)

#### Test des Fonctionnalités

- [ ] **Authentification**

  - Tester la création de compte
  - Tester la connexion
  - Vérifier la redirection après login

- [ ] **Catalogue**

  - Vérifier l'affichage des produits
  - Tester les filtres
  - Tester la recherche

- [ ] **Commandes**
  - Créer une commande test
  - Vérifier l'export Excel
  - Tester la validation

### 3. Tests d'Intégration

#### Communication Frontend ↔ Backend

- [ ] **Appels API**
  - Ouvrir les DevTools (F12)
  - Aller dans l'onglet Network
  - Naviguer sur le site
  - Vérifier que les appels API réussissent (status 200)

#### Base de Données

- [ ] **Connexion Supabase**
  - Aller sur votre dashboard Supabase
  - Vérifier les connexions actives
  - Tester quelques requêtes SQL

### 4. Tests de Performance

#### Vitesse de Chargement

- [ ] **PageSpeed Insights**
  - Aller sur [PageSpeed Insights](https://pagespeed.web.dev/)
  - Tester votre URL Vercel
  - Score recommandé: >80

#### Temps de Réponse API

```bash
# Test de latence
curl -w "@curl-format.txt" -o /dev/null -s "https://your-api.railway.app/health"

# Créer d'abord curl-format.txt:
echo "     time_namelookup:  %{time_namelookup}\n     time_connect:     %{time_connect}\n     time_appconnect:  %{time_appconnect}\n     time_pretransfer: %{time_pretransfer}\n     time_redirect:    %{time_redirect}\n     time_starttransfer: %{time_starttransfer}\n                    ----------\n     time_total:       %{time_total}\n" > curl-format.txt
```

### 5. Tests de Sécurité

#### HTTPS

- [ ] **Certificats SSL**
  - Vérifier que les deux URLs utilisent HTTPS
  - Cliquer sur le cadenas dans la barre d'adresse
  - Vérifier la validité du certificat

#### Headers de Sécurité

```bash
# Test des headers
curl -I "https://your-app.vercel.app"
curl -I "https://your-api.railway.app"
```

### 6. Tests Utilisateur

#### Parcours Client Type

1. **Inscription**

   - [ ] Créer un nouveau compte client
   - [ ] Vérifier l'email de confirmation
   - [ ] Se connecter avec ce compte

2. **Navigation**

   - [ ] Parcourir le catalogue
   - [ ] Ajouter des produits au panier
   - [ ] Créer une commande

3. **Gestion Commandes**
   - [ ] Voir la liste des commandes
   - [ ] Exporter une commande
   - [ ] Modifier une commande draft

#### Parcours Admin

1. **Connexion Admin**

   - [ ] Se connecter avec un compte admin
   - [ ] Accéder au panel admin

2. **Gestion**
   - [ ] Voir toutes les commandes
   - [ ] Valider une commande
   - [ ] Gérer les clients

## 🚨 Résolution des Problèmes

### Backend Inaccessible

```bash
# Vérifier les logs Railway
# Dashboard Railway > Votre Projet > Deployments > Logs
```

### Frontend ne se Charge Pas

```bash
# Vérifier les logs Vercel
# Dashboard Vercel > Votre Projet > Functions > Logs
```

### Erreurs CORS

```bash
# Vérifier les variables d'environnement
# Railway: CORS_ORIGINS doit contenir votre URL Vercel
```

### Base de Données Inaccessible

```bash
# Vérifier Supabase
# Dashboard Supabase > Settings > API
# Vérifier que les clés sont correctes
```

## 📊 Métriques à Surveiller

### Performance

- **Temps de chargement** < 3 secondes
- **Temps de réponse API** < 500ms
- **Disponibilité** > 99%

### Erreurs

- **Taux d'erreur** < 1%
- **Erreurs 5xx** = 0
- **Erreurs CORS** = 0

## 🎯 Après les Tests

### ✅ Si Tout Fonctionne

- Configurer un domaine personnalisé
- Mettre en place le monitoring
- Optimiser les performances
- Planifier les sauvegardes

### ❌ Si des Problèmes

1. Vérifier les logs
2. Corriger les erreurs
3. Redéployer
4. Retester

## 📞 URLs Importantes

Remplacez par vos vraies URLs :

- **Frontend**: `https://your-app.vercel.app`
- **API**: `https://your-backend.railway.app`
- **API Docs**: `https://your-backend.railway.app/docs`
- **Supabase**: `https://your-project.supabase.co`

## 🎉 Validation Finale

Votre plateforme est prête pour la production si :

- [ ] Tous les tests passent
- [ ] Performance acceptable
- [ ] Sécurité configurée
- [ ] Monitoring en place

**Félicitations ! Votre plateforme B2B est en ligne ! 🚀**
