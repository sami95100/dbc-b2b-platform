#!/usr/bin/env python3
"""
Script de test pour la mise à jour du catalogue
"""

import subprocess
import sys
import os
from datetime import datetime

def test_catalog_update():
    """Test de mise à jour du catalogue"""
    
    print("🧪 TEST DE MISE À JOUR DU CATALOGUE")
    print("=" * 50)
    
    # Vérifier que le nouveau catalogue existe
    catalog_path = "data/catalogs/Mobile devices-pricelist-Tuesday, May 27, 2025.xlsx"
    
    if not os.path.exists(catalog_path):
        print(f"❌ Catalogue non trouvé: {catalog_path}")
        return False
    
    print(f"✅ Catalogue trouvé: {catalog_path}")
    
    # Tester le script de traitement
    print("\n📊 TEST DU TRAITEMENT...")
    
    try:
        # Exécuter le script de traitement
        result = subprocess.run([
            'python3', 
            'backend/scripts/catalog_processor.py', 
            catalog_path
        ], capture_output=True, text=True, timeout=120)
        
        print("📤 SORTIE DU SCRIPT:")
        print(result.stdout)
        
        if result.stderr:
            print("⚠️ ERREURS:")
            print(result.stderr)
        
        if result.returncode == 0:
            print("✅ Script exécuté avec succès")
            
            # Chercher le JSON de résultat dans la sortie
            lines = result.stdout.strip().split('\n')
            for line in reversed(lines):
                if line.startswith('{'):
                    try:
                        import json
                        result_data = json.loads(line)
                        print("\n📊 RÉSULTATS:")
                        print(f"  - Total produits: {result_data.get('stats', {}).get('total', 'N/A')}")
                        print(f"  - Produits marginaux: {result_data.get('stats', {}).get('marginal', 'N/A')}")
                        print(f"  - Produits non marginaux: {result_data.get('stats', {}).get('non_marginal', 'N/A')}")
                        print(f"  - Produits actifs: {result_data.get('stats', {}).get('active_products', 'N/A')}")
                        print(f"  - Importés dans Supabase: {result_data.get('imported_count', 'N/A')}")
                        break
                    except json.JSONDecodeError:
                        continue
            
            return True
        else:
            print(f"❌ Script échoué avec code: {result.returncode}")
            return False
            
    except subprocess.TimeoutExpired:
        print("❌ Timeout: Le script a pris trop de temps")
        return False
    except Exception as e:
        print(f"❌ Erreur exécution: {e}")
        return False

def check_prerequisites():
    """Vérifier les prérequis"""
    print("🔍 VÉRIFICATION DES PRÉREQUIS")
    print("-" * 30)
    
    # Vérifier Python
    python_version = sys.version_info
    print(f"Python: {python_version.major}.{python_version.minor}.{python_version.micro}")
    
    # Vérifier les modules Python requis
    required_modules = ['pandas', 'openpyxl', 'supabase', 'dotenv']
    missing_modules = []
    
    for module in required_modules:
        try:
            __import__(module)
            print(f"✅ {module} installé")
        except ImportError:
            print(f"❌ {module} manquant")
            missing_modules.append(module)
    
    if missing_modules:
        print(f"\n⚠️ Modules manquants: {', '.join(missing_modules)}")
        print("Installer avec: pip install " + " ".join(missing_modules))
        return False
    
    # Vérifier le fichier .env
    if os.path.exists('.env.local'):
        print("✅ Fichier .env.local trouvé")
    else:
        print("❌ Fichier .env.local manquant")
        return False
    
    return True

def main():
    """Fonction principale"""
    print(f"📅 Test démarré à: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Vérifier les prérequis
    if not check_prerequisites():
        print("\n❌ Prérequis non satisfaits")
        return
    
    print("\n" + "=" * 50)
    
    # Tester la mise à jour du catalogue
    success = test_catalog_update()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 TEST RÉUSSI - Le système de mise à jour fonctionne !")
        print("\n💡 Prochaines étapes:")
        print("1. Démarrer votre serveur Next.js: npm run dev")
        print("2. Aller sur /catalog")
        print("3. Cliquer sur 'Mettre à jour le catalogue'")
        print("4. Uploader un nouveau catalogue Excel")
        print("5. Vérifier que les produits sont mis à jour")
    else:
        print("❌ TEST ÉCHOUÉ - Vérifiez les erreurs ci-dessus")

if __name__ == "__main__":
    main() 