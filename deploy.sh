#!/bin/bash

# 🚀 Script de Déploiement Automatique - Plateforme B2B DBC

echo "🎯 Déploiement de la plateforme B2B DBC"
echo "======================================="

# Vérifier si on est dans le bon répertoire
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    echo "❌ Erreur: Veuillez exécuter ce script depuis la racine du projet"
    exit 1
fi

# Vérifier les variables d'environnement
echo "🔧 Vérification des variables d'environnement..."

if [ ! -f ".env.local" ]; then
    echo "⚠️  Fichier .env.local manquant"
    echo "Création du fichier d'exemple..."
    cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
EOF
    echo "✅ Veuillez éditer .env.local avec vos vraies valeurs"
fi

if [ ! -f "backend/.env" ]; then
    echo "⚠️  Fichier backend/.env manquant"
    echo "Création du fichier d'exemple..."
    cat > backend/.env << EOF
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
CORS_ORIGINS=https://your-frontend.vercel.app
EOF
    echo "✅ Veuillez éditer backend/.env avec vos vraies valeurs"
fi

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm install

# Build du frontend pour vérifier
echo "🔨 Build du frontend..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Frontend build avec succès"
else
    echo "❌ Erreur lors du build du frontend"
    exit 1
fi

# Vérifier le backend
echo "🐍 Vérification du backend..."
cd backend

if [ ! -f "requirements.txt" ]; then
    echo "❌ requirements.txt manquant dans backend/"
    exit 1
fi

echo "✅ Backend prêt pour le déploiement"
cd ..

# Récapitulatif
echo ""
echo "🎉 Préparation terminée !"
echo "========================"
echo ""
echo "📋 Prochaines étapes:"
echo "1. Vérifiez vos variables d'environnement dans .env.local et backend/.env"
echo "2. Commitez et pushez votre code sur GitHub"
echo "3. Déployez le backend sur Railway (https://railway.app)"
echo "4. Déployez le frontend sur Vercel (https://vercel.com)"
echo ""
echo "📖 Guide détaillé: DEPLOYMENT_STEPS.md"
echo "📋 Options de déploiement: docs/deployment-guide.md"
echo ""
echo "🔗 URLs importantes après déploiement:"
echo "   Frontend: https://your-app.vercel.app"
echo "   API: https://your-backend.railway.app"
echo "   Docs API: https://your-backend.railway.app/docs" 