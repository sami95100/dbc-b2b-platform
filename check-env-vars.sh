#!/bin/bash

echo "🔧 Vérification des Variables d'Environnement"
echo "============================================="
echo ""

echo "📊 Supabase - Project URL :"
echo "1. Aller sur supabase.com"
echo "2. Votre projet → Settings → API"
echo "3. Copier 'Project URL'"
read -p "Collez votre SUPABASE_URL: " SUPABASE_URL

echo ""
echo "🔑 Supabase - Anon Key :"
echo "4. Dans la même page, copier 'anon public'"
read -p "Collez votre ANON_KEY (première partie): " ANON_KEY

echo ""
echo "🚂 Railway - Backend URL :"
echo "5. Aller sur railway.app"
echo "6. Votre projet backend → copier l'URL"
read -p "Collez votre RAILWAY_URL: " RAILWAY_URL

echo ""
echo "✅ Résumé de vos variables pour Vercel :"
echo "========================================"
echo "NEXT_PUBLIC_SUPABASE_URL = $SUPABASE_URL"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY = ${ANON_KEY}..."
echo "NEXT_PUBLIC_API_URL = $RAILWAY_URL"
echo ""

echo "🎯 Maintenant copiez ces 3 lignes dans Vercel !"

