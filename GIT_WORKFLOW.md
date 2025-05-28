# 📋 Guide Git pour DBC B2B Platform

## 🚀 Workflow quotidien

### Avant de commencer à coder

```bash
git pull origin main
```

### Après chaque session de travail

```bash
git add .
git commit -m "Description des changements"
git push origin main
```

## 📝 Messages de commit

### Format recommandé

```bash
git commit -m "feat: ajout système notifications"
git commit -m "fix: correction bug quantités"
git commit -m "style: amélioration design login"
git commit -m "docs: mise à jour documentation"
```

### Préfixes

- `feat:` nouvelle fonctionnalité
- `fix:` correction de bug
- `style:` changements visuels
- `refactor:` restructuration code
- `docs:` documentation

## 🏷️ Versions importantes

### Marquer une version stable

```bash
git tag v1.1.0
git push origin v1.1.0
```

### Exemples de versions

- `v1.1.0` : Nouvelles fonctionnalités mineures
- `v1.2.0` : Intégration backend
- `v2.0.0` : Version production

## 🌿 Branches pour gros projets

### Créer une branche

```bash
git checkout -b feature/nom-fonctionnalite
# ... développer ...
git add .
git commit -m "feat: description"
git push origin feature/nom-fonctionnalite
```

### Fusionner la branche

```bash
git checkout main
git merge feature/nom-fonctionnalite
git push origin main
git branch -d feature/nom-fonctionnalite
```

## 🛡️ Commandes de sécurité

### Voir l'historique

```bash
git log --oneline -10
```

### Revenir à une version précédente

```bash
git checkout v1.0.0
```

### Revenir à la dernière version

```bash
git checkout main
```

## 📅 Planning suggéré

### Commits (quotidien)

- Fin de session de travail
- Après chaque fonctionnalité
- Avant de fermer l'ordinateur

### Tags (hebdomadaire)

- Quand une fonctionnalité importante est terminée
- Avant de commencer un gros développement

### Branches (projets importants)

- Intégration backend
- Système de paiement
- Authentification utilisateurs

## 🎯 État actuel

- **Version stable** : v1.0.0 (plateforme B2B fonctionnelle)
- **Prochaine version** : v1.1.0 (intégration backend)
- **Repository** : https://github.com/sami95100/dbc-b2b-platform
