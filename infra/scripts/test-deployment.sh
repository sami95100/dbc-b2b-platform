#!/bin/bash

# 🧪 Script de Test Automatique - Déploiement B2B DBC

echo "🧪 Test de la Plateforme B2B Déployée"
echo "====================================="

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables à configurer
FRONTEND_URL=""
BACKEND_URL=""

# Fonction pour tester une URL
test_url() {
    local url=$1
    local description=$2
    
    echo -n "Testing $description... "
    
    if curl -s --head "$url" | head -n 1 | grep -q "200 OK\|301\|302"; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        return 1
    fi
}

# Fonction pour tester une API
test_api() {
    local url=$1
    local expected=$2
    local description=$3
    
    echo -n "Testing $description... "
    
    response=$(curl -s "$url")
    if echo "$response" | grep -q "$expected"; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Demander les URLs si non définies
if [ -z "$FRONTEND_URL" ]; then
    echo -e "${YELLOW}Entrez l'URL de votre frontend Vercel:${NC}"
    read -p "https://" frontend_input
    FRONTEND_URL="https://$frontend_input"
fi

if [ -z "$BACKEND_URL" ]; then
    echo -e "${YELLOW}Entrez l'URL de votre backend Railway:${NC}"
    read -p "https://" backend_input
    BACKEND_URL="https://$backend_input"
fi

echo ""
echo "Frontend: $FRONTEND_URL"
echo "Backend: $BACKEND_URL"
echo ""

# Compteurs
total_tests=0
passed_tests=0

# Tests Backend
echo "🔧 Tests Backend API"
echo "==================="

((total_tests++))
if test_url "$BACKEND_URL" "Backend Root"; then
    ((passed_tests++))
fi

((total_tests++))
if test_api "$BACKEND_URL/health" "healthy" "Health Check"; then
    ((passed_tests++))
fi

((total_tests++))
if test_url "$BACKEND_URL/docs" "API Documentation"; then
    ((passed_tests++))
fi

echo ""

# Tests Frontend
echo "🌐 Tests Frontend"
echo "=================="

((total_tests++))
if test_url "$FRONTEND_URL" "Frontend Home"; then
    ((passed_tests++))
fi

((total_tests++))
if test_url "$FRONTEND_URL/login" "Login Page"; then
    ((passed_tests++))
fi

((total_tests++))
if test_url "$FRONTEND_URL/catalog" "Catalog Page"; then
    ((passed_tests++))
fi

echo ""

# Tests de Performance
echo "⚡ Tests de Performance"
echo "======================"

echo -n "Testing response time... "
response_time=$(curl -o /dev/null -s -w '%{time_total}' "$BACKEND_URL/health")
if (( $(echo "$response_time < 2.0" | bc -l) )); then
    echo -e "${GREEN}✅ OK (${response_time}s)${NC}"
    ((passed_tests++))
else
    echo -e "${YELLOW}⚠️  SLOW (${response_time}s)${NC}"
fi
((total_tests++))

# Tests HTTPS
echo ""
echo "🔒 Tests Sécurité"
echo "=================="

echo -n "Testing HTTPS Frontend... "
if curl -s -I "$FRONTEND_URL" | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✅ OK${NC}"
    ((passed_tests++))
else
    echo -e "${RED}❌ FAIL${NC}"
fi
((total_tests++))

echo -n "Testing HTTPS Backend... "
if curl -s -I "$BACKEND_URL" | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✅ OK${NC}"
    ((passed_tests++))
else
    echo -e "${RED}❌ FAIL${NC}"
fi
((total_tests++))

# Résumé
echo ""
echo "📊 Résumé des Tests"
echo "==================="
echo "Tests passés: $passed_tests/$total_tests"

if [ $passed_tests -eq $total_tests ]; then
    echo -e "${GREEN}🎉 Tous les tests sont passés ! Votre plateforme est prête !${NC}"
    exit 0
elif [ $passed_tests -gt $((total_tests / 2)) ]; then
    echo -e "${YELLOW}⚠️  La plupart des tests passent, quelques ajustements nécessaires${NC}"
    exit 1
else
    echo -e "${RED}❌ Plusieurs tests échouent, vérifiez votre configuration${NC}"
    exit 2
fi 