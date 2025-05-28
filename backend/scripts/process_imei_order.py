#!/usr/bin/env python3
"""
Script pour traiter les commandes détaillées avec IMEI/numéros de série
Applique les prix DBC et exporte en CSV UTF-8 pour import dans le logiciel
"""

import pandas as pd
import sys
from datetime import datetime
import os
import glob
import re
from apply_dbc_prices_to_order import (
    find_matching_catalog, 
    build_product_lookup, 
    find_product_price,
    extract_date_from_filename
)

def validate_imei_order_format(df):
    """
    Valide que le fichier est bien un fichier de commande avec IMEI
    """
    # Colonnes obligatoires pour un fichier IMEI
    required_columns = ['Id', 'Item Identifier']
    missing_columns = [col for col in required_columns if col not in df.columns]
    
    if missing_columns:
        return False, f"Colonnes manquantes pour un fichier IMEI: {missing_columns}. Ce fichier ne contient pas de numéros de série/IMEI."
    
    # Vérifier que c'est bien un fichier détaillé (pas groupé)
    if 'Offered Price' in df.columns or 'Required Count' in df.columns:
        return False, "Ce fichier semble être un fichier groupé. Utilisez apply_dbc_prices_to_order.py à la place."
    
    # Vérifier qu'il y a bien des colonnes essentielles
    essential_columns = ['SKU', 'Product Name', 'Price']
    missing_essential = [col for col in essential_columns if col not in df.columns]
    if missing_essential:
        return False, f"Colonnes essentielles manquantes: {missing_essential}"
    
    return True, "Format valide"

def ask_mode_if_needed(mode):
    """
    Demande le mode à l'utilisateur si non spécifié
    """
    if mode is None:
        print("\n=== SÉLECTION DU MODE ===")
        print("1. Mode DBC (interne) - Inclut toutes les informations sensibles")
        print("2. Mode Client - Sans informations sensibles")
        
        while True:
            choice = input("\nChoisissez le mode (1 ou 2): ").strip()
            if choice == '1':
                return 'dbc'
            elif choice == '2':
                return 'client'
            else:
                print("Choix invalide. Veuillez entrer 1 ou 2.")

def process_imei_order(order_file, catalog_file=None, output_file=None, order_date=None, mode=None):
    """
    Traite une commande avec IMEI et applique les prix DBC
    
    Args:
        order_file: Fichier de commande avec IMEI
        catalog_file: Fichier catalogue DBC (si None, utilise le plus récent)
        output_file: Fichier de sortie CSV (optionnel)
        order_date: Date de la commande pour trouver le bon catalogue (optionnel)
        mode: 'dbc' pour usage interne, 'client' pour version client, None pour demander
    """
    try:
        # Lire la commande
        print(f"\nLecture de la commande avec IMEI: {order_file}")
        
        try:
            df_order = pd.read_excel(order_file)
        except Exception as e:
            print(f"\nERREUR: Impossible de lire le fichier Excel.")
            print(f"Détails: {str(e)}")
            return None
        
        # Valider le format du fichier
        is_valid, message = validate_imei_order_format(df_order)
        if not is_valid:
            print(f"\nERREUR: Format de fichier incorrect.")
            print(f"Détails: {message}")
            print("\nCe script est conçu pour traiter les fichiers avec numéros de série/IMEI.")
            print("Structure attendue: SKU, Id, Product Name, Item Identifier, Price, etc.")
            return None
        
        print("✓ Format du fichier validé")
        print(f"✓ Nombre de lignes à traiter: {len(df_order)}")
        
        # Demander le mode si nécessaire
        if mode is None:
            mode = ask_mode_if_needed(mode)
        print(f"Mode sélectionné: {mode.upper()}")
        
        # Essayer d'extraire la date du nom du fichier si pas fournie
        if order_date is None and 'order-' in order_file.lower():
            date_match = re.search(r'(\w+, \w+ \d+, \d{4})', order_file)
            if date_match:
                try:
                    order_date = datetime.strptime(date_match.group(1), '%A, %B %d, %Y').date()
                    print(f"✓ Date extraite du nom de fichier: {order_date}")
                except:
                    print("⚠ Impossible d'extraire la date du nom de fichier")
        
        # Trouver ou utiliser le catalogue DBC
        if catalog_file is None:
            try:
                catalog_file = find_matching_catalog(order_date)
                print(f"✓ Catalogue DBC trouvé: {catalog_file}")
            except FileNotFoundError:
                print("\nERREUR: Aucun catalogue DBC trouvé.")
                print("Assurez-vous d'avoir généré un catalogue avec transform_catalog.py")
                return None
        
        # Lire le catalogue DBC
        try:
            df_catalog = pd.read_excel(catalog_file)
        except Exception as e:
            print(f"\nERREUR: Impossible de lire le catalogue DBC.")
            print(f"Détails: {str(e)}")
            return None
        
        # Construire les dictionnaires de recherche
        sku_lookup, characteristics_lookup = build_product_lookup(df_catalog)
        print(f"✓ Catalogue chargé: {len(sku_lookup)} SKUs")
        
        # Créer une copie de la commande pour modification
        df_result = df_order.copy()
        
        # Ajouter des colonnes pour traçabilité
        df_result['Prix Fournisseur'] = df_result['Price']
        
        if mode == 'dbc':
            df_result['Prix Catalogue'] = 0.0
            df_result['Prix DBC'] = 0.0
            df_result['VAT Type DBC'] = ''
            df_result['Statut'] = ''
            df_result['Méthode recherche'] = ''
        
        # Convertir Price en float
        df_result['Price'] = pd.to_numeric(df_result['Price'], errors='coerce')
        
        # Statistiques
        count_sku_exact = 0
        count_characteristics = 0
        count_not_found = 0
        not_found_details = []
        
        print("\nTraitement des produits...")
        
        # Appliquer les prix DBC
        for index, row in df_result.iterrows():
            sku = row['SKU']
            prix_fournisseur = row['Prix Fournisseur']
            
            # Extraire les caractéristiques
            product_name = row.get('Product Name', '')
            appearance = row.get('Appearance', '')
            functionality = row.get('Functionality', '')
            vat_type_order = row.get('VAT Type', '')
            
            # Rechercher le produit
            product_info, search_method = find_product_price(
                sku, product_name, appearance, functionality, vat_type_order,
                sku_lookup, characteristics_lookup
            )
            
            if product_info:
                prix_dbc = product_info['Prix DBC']
                prix_catalogue = product_info['Prix original']
                vat_type = product_info['VAT Type']
                
                if mode == 'dbc':
                    df_result.at[index, 'Prix Catalogue'] = prix_catalogue
                    df_result.at[index, 'Prix DBC'] = prix_dbc
                    df_result.at[index, 'VAT Type DBC'] = vat_type if pd.notna(vat_type) else 'Non marginal'
                    df_result.at[index, 'Méthode recherche'] = search_method
                    df_result.at[index, 'Statut'] = f'OK - {search_method}'
                
                df_result.at[index, 'Price'] = prix_dbc
                
                if search_method == 'SKU exact':
                    count_sku_exact += 1
                else:
                    count_characteristics += 1
            else:
                # Produit non trouvé
                not_found_details.append({
                    'SKU': sku,
                    'Product': product_name,
                    'Appearance': appearance,
                    'Functionality': functionality,
                    'IMEI': row.get('Item Identifier', 'N/A')
                })
                
                if mode == 'dbc':
                    df_result.at[index, 'Statut'] = 'ATTENTION - Produit non trouvé'
                    df_result.at[index, 'Prix DBC'] = prix_fournisseur
                    df_result.at[index, 'Méthode recherche'] = 'Non trouvé'
                
                df_result.at[index, 'Price'] = float(prix_fournisseur) if pd.notna(prix_fournisseur) else 0
                count_not_found += 1
        
        # Calculer les totaux
        total_fournisseur = df_result['Prix Fournisseur'].sum()
        total_dbc = df_result['Price'].sum()
        
        # Réorganiser les colonnes selon le mode
        if mode == 'dbc':
            # Garder l'ordre original et ajouter les nouvelles colonnes à la fin
            original_cols = list(df_order.columns)
            new_cols = ['Prix Fournisseur', 'Prix Catalogue', 'Prix DBC', 'VAT Type DBC', 
                       'Méthode recherche', 'Statut']
            
            all_cols = original_cols + new_cols
            # Garder seulement les colonnes qui existent
            all_cols = [col for col in all_cols if col in df_result.columns]
            df_result = df_result[all_cols]
        else:
            # Mode client: retirer les colonnes sensibles
            cols_to_remove = ['Prix Fournisseur', 'Prix Catalogue', 'VAT Type DBC', 
                            'Statut', 'Méthode recherche']
            for col in cols_to_remove:
                if col in df_result.columns:
                    df_result = df_result.drop(columns=[col])
        
        # Générer le nom du fichier de sortie
        if output_file is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            base_name = os.path.splitext(os.path.basename(order_file))[0]
            suffix = '_client' if mode == 'client' else '_avec_prix_dbc'
            output_file = f"{base_name}{suffix}_{timestamp}.csv"
        
        # Sauvegarder en CSV UTF-8
        df_result.to_csv(output_file, index=False, encoding='utf-8')
        print(f"\n✓ Fichier CSV sauvegardé: {output_file}")
        print(f"✓ Encodage: UTF-8")
        
        # Afficher le résumé
        print("\n" + "="*60)
        print("RÉSUMÉ DE LA TRANSFORMATION")
        print("="*60)
        print(f"Catalogue DBC utilisé: {catalog_file}")
        print(f"Nombre total de lignes: {len(df_result)}")
        print(f"✓ Produits trouvés par SKU exact: {count_sku_exact}")
        print(f"✓ Produits trouvés par caractéristiques: {count_characteristics}")
        if count_not_found > 0:
            print(f"⚠ Produits non trouvés: {count_not_found}")
        print(f"\nTotal prix fournisseur: {total_fournisseur:.2f}€")
        print(f"Total prix DBC: {total_dbc:.2f}€")
        print(f"Différence: {total_dbc - total_fournisseur:.2f}€")
        print(f"Marge totale: {((total_dbc - total_fournisseur) / total_fournisseur * 100):.1f}%")
        
        # Afficher les produits non trouvés avec plus de détails
        if count_not_found > 0:
            print("\n" + "="*60)
            print("⚠ ATTENTION: PRODUITS NON TROUVÉS DANS LE CATALOGUE")
            print("="*60)
            print("Ces produits gardent leur prix fournisseur par défaut.")
            print("\nDétails:")
            
            for item in not_found_details[:10]:  # Limiter à 10 pour ne pas surcharger
                print(f"\n- SKU: {item['SKU']}")
                print(f"  Produit: {item['Product']}")
                print(f"  État: {item['Appearance']} / {item['Functionality']}")
                print(f"  IMEI: {item['IMEI']}")
            
            if len(not_found_details) > 10:
                print(f"\n... et {len(not_found_details) - 10} autres produits non trouvés")
            
            print("\nRECOMMANDATIONS:")
            print("1. Vérifiez que le catalogue est à jour")
            print("2. Ces produits peuvent être des nouveaux modèles")
            print("3. Contactez le fournisseur pour clarification")
        
        return df_result
        
    except Exception as e:
        print(f"\nERREUR INATTENDUE: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def main():
    """Fonction principale"""
    if len(sys.argv) < 2:
        print("Usage: python process_imei_order.py <fichier_commande_imei.xlsx> [--mode=dbc|client] [catalogue_dbc.xlsx] [fichier_sortie.csv]")
        print("\nExemples:")
        print("  python process_imei_order.py 'order-1446435-Wednesday.xlsx'")
        print("  python process_imei_order.py 'order-1446435-Wednesday.xlsx' --mode=client")
        print("  python process_imei_order.py 'order-1446435-Wednesday.xlsx' --mode=dbc 'catalogue_dbc.xlsx'")
        print("\nModes:")
        print("  --mode=dbc    : Version interne avec toutes les informations")
        print("  --mode=client : Version client sans informations sensibles")
        print("  (sans --mode)  : Le script vous demandera de choisir")
        print("\nCe script traite UNIQUEMENT les fichiers avec numéros de série/IMEI.")
        print("Pour les commandes groupées, utilisez apply_dbc_prices_to_order.py")
        sys.exit(1)
    
    # Parser les arguments
    order_file = sys.argv[1]
    mode = None
    catalog_file = None
    output_file = None
    
    # Chercher le mode dans les arguments
    args_remaining = []
    for arg in sys.argv[2:]:
        if arg.startswith('--mode='):
            mode = arg.split('=')[1].lower()
            if mode not in ['dbc', 'client']:
                print(f"Erreur: Mode invalide '{mode}'. Utilisez 'dbc' ou 'client'.")
                sys.exit(1)
        else:
            args_remaining.append(arg)
    
    # Assigner les arguments restants
    if len(args_remaining) > 0:
        catalog_file = args_remaining[0]
    if len(args_remaining) > 1:
        output_file = args_remaining[1]
    
    if not os.path.exists(order_file):
        print(f"Erreur: Le fichier '{order_file}' n'existe pas.")
        sys.exit(1)
    
    if catalog_file and not os.path.exists(catalog_file):
        print(f"Erreur: Le fichier catalogue '{catalog_file}' n'existe pas.")
        sys.exit(1)
    
    # Traiter la commande
    result = process_imei_order(order_file, catalog_file, output_file, mode=mode)
    
    if result is None:
        print("\n❌ Le traitement a échoué. Veuillez corriger les erreurs ci-dessus.")
        sys.exit(1)
    else:
        print("\n✅ Traitement terminé avec succès!")

if __name__ == "__main__":
    main() 