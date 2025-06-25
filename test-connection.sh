#!/bin/bash

echo "🧪 Test de Connexion Vercel ↔ Railway"
echo "===================================="

echo "Entrez l'URL de votre frontend Vercel:"
read -p "https://" FRONTEND_URL
FRONTEND_URL="https://$FRONTEND_URL"

echo "Entrez l'URL de votre backend Railway:"
read -p "https://" BACKEND_URL  
BACKEND_URL="https://$BACKEND_URL"

echo ""
echo "🔗 URLs configurées:"
echo "Frontend: $FRONTEND_URL"
echo "Backend: $BACKEND_URL"
echo ""

echo "🔧 Test Backend..."
if curl -s "$BACKEND_URL/health" | grep -q "healthy"; then
    echo "✅ Backend Railway : OK"
else
    echo "❌ Backend Railway : Problème"
fi

echo "🌐 Test Frontend..."
if curl -s -I "$FRONTEND_URL" | grep -q "200"; then
    echo "✅ Frontend Vercel : OK"
else
    echo "❌ Frontend Vercel : Problème"
fi

echo ""
echo "🎯 Tests manuels à faire:"
echo "1. Ouvrir $FRONTEND_URL"
echo "2. Vérifier que les pages se chargent"
echo "3. Tester l'authentification"
echo "4. Vérifier la console (F12) pour erreurs CORS"

