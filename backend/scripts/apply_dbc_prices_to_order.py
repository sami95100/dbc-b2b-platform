#!/usr/bin/env python3
"""
Script pour appliquer les prix DBC à une commande fournisseur
Prend en compte que les catalogues changent quotidiennement
Modes: DBC (interne avec toutes les infos) ou Client (sans infos sensibles)
"""

import pandas as pd
import sys
from datetime import datetime, timedelta
import os
import glob
import re

def extract_date_from_filename(filename):
    """
    Extrait la date d'un nom de fichier catalogue_dbc_YYYYMMDD_HHMMSS.xlsx
    """
    match = re.search(r'catalogue_dbc_(\d{8})_\d{6}\.xlsx', filename)
    if match:
        date_str = match.group(1)
        return datetime.strptime(date_str, '%Y%m%d').date()
    return None

def find_matching_catalog(order_date=None, tolerance_days=1):
    """
    Trouve le catalogue DBC correspondant à la date de la commande
    
    Args:
        order_date: Date de la commande (datetime.date)
        tolerance_days: Nombre de jours de tolérance pour chercher un catalogue
    """
    catalog_files = glob.glob("catalogue_dbc_*.xlsx")
    
    if not catalog_files:
        raise FileNotFoundError("Aucun catalogue DBC trouvé")
    
    # Créer une liste avec les dates extraites
    catalogs_with_dates = []
    for catalog in catalog_files:
        date = extract_date_from_filename(catalog)
        if date:
            catalogs_with_dates.append((catalog, date))
    
    # Trier par date
    catalogs_with_dates.sort(key=lambda x: x[1], reverse=True)
    
    if order_date:
        # Chercher le catalogue le plus proche de la date de commande
        for catalog, cat_date in catalogs_with_dates:
            diff_days = abs((cat_date - order_date).days)
            if diff_days <= tolerance_days:
                print(f"Catalogue trouvé pour la date {order_date}: {catalog} (différence: {diff_days} jours)")
                return catalog
        
        print(f"Aucun catalogue trouvé pour la date {order_date} (tolérance: {tolerance_days} jours)")
        print(f"Utilisation du catalogue le plus récent: {catalogs_with_dates[0][0]}")
        return catalogs_with_dates[0][0]
    
    # Si pas de date fournie, retourner le plus récent
    return catalogs_with_dates[0][0] if catalogs_with_dates else catalog_files[0]

def build_product_lookup(df_catalog):
    """
    Construit des dictionnaires de recherche pour les produits
    Recherche par SKU exact et par Product Name + Appearance + Functionality
    """
    # Dictionnaire par SKU exact
    sku_lookup = {}
    
    # Dictionnaire par caractéristiques (Product Name + Appearance + Functionality + VAT Type)
    characteristics_lookup = {}
    
    for _, row in df_catalog.iterrows():
        sku = row['SKU']
        
        # Lookup par SKU
        sku_lookup[sku] = {
            'Prix DBC': row['Prix DBC'],
            'VAT Type': row['VAT Type'],
            'Prix original': row['Prix original']
        }
        
        # Créer une clé basée sur les caractéristiques
        product_name = str(row['Product Name']).strip() if pd.notna(row['Product Name']) else ''
        appearance = str(row['Appearance']).strip() if pd.notna(row['Appearance']) else ''
        functionality = str(row['Functionality']).strip() if pd.notna(row['Functionality']) else ''
        vat_type = str(row['VAT Type']).strip() if pd.notna(row['VAT Type']) else 'Non marginal'
        
        # Clé avec VAT Type pour les produits marginaux
        key_with_vat = f"{product_name}|{appearance}|{functionality}|{vat_type}"
        # Clé sans VAT Type pour recherche générale
        key_without_vat = f"{product_name}|{appearance}|{functionality}"
        
        # Stocker les deux types de clés
        characteristics_lookup[key_with_vat] = {
            'Prix DBC': row['Prix DBC'],
            'VAT Type': vat_type,
            'Prix original': row['Prix original'],
            'SKU': sku
        }
        
        # Pour les produits non marginaux, stocker aussi sans VAT Type
        if vat_type != 'Marginal':
            characteristics_lookup[key_without_vat] = {
                'Prix DBC': row['Prix DBC'],
                'VAT Type': vat_type,
                'Prix original': row['Prix original'],
                'SKU': sku
            }
    
    return sku_lookup, characteristics_lookup

def find_product_price(sku, product_name, appearance, functionality, vat_type_order, 
                      sku_lookup, characteristics_lookup):
    """
    Trouve le prix d'un produit en utilisant différentes méthodes de recherche
    """
    # 1. Recherche par SKU exact
    if sku in sku_lookup:
        return sku_lookup[sku], 'SKU exact'
    
    # 2. Recherche par caractéristiques
    product_name = str(product_name).strip() if pd.notna(product_name) else ''
    appearance = str(appearance).strip() if pd.notna(appearance) else ''
    functionality = str(functionality).strip() if pd.notna(functionality) else ''
    
    # Si le produit de la commande est marginal, chercher avec VAT Type
    if pd.notna(vat_type_order) and vat_type_order == 'Marginal':
        key_with_vat = f"{product_name}|{appearance}|{functionality}|Marginal"
        if key_with_vat in characteristics_lookup:
            return characteristics_lookup[key_with_vat], 'Caractéristiques avec VAT marginal'
    
    # Recherche sans VAT Type
    key_without_vat = f"{product_name}|{appearance}|{functionality}"
    if key_without_vat in characteristics_lookup:
        return characteristics_lookup[key_without_vat], 'Caractéristiques'
    
    return None, 'Non trouvé'

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
    return mode

def apply_dbc_prices(order_file, catalog_file=None, output_file=None, order_date=None, mode=None):
    """
    Applique les prix DBC à une commande fournisseur
    
    Args:
        order_file: Fichier de commande du fournisseur
        catalog_file: Fichier catalogue DBC (si None, utilise le plus récent ou celui de la date)
        output_file: Fichier de sortie (optionnel)
        order_date: Date de la commande pour trouver le bon catalogue (optionnel)
        mode: 'dbc' pour usage interne, 'client' pour version client sans infos sensibles
    """
    try:
        # Lire la commande
        print(f"\nLecture de la commande: {order_file}")
        
        try:
            df_order = pd.read_excel(order_file)
        except Exception as e:
            print(f"\nERREUR: Impossible de lire le fichier Excel.")
            print(f"Détails: {str(e)}")
            return None
        
        # Vérifier si c'est un fichier avec IMEI
        if 'Item Identifier' in df_order.columns and 'Id' in df_order.columns:
            print("\nERREUR: Ce fichier contient des numéros de série/IMEI.")
            print("Utilisez process_imei_order.py pour traiter ce type de fichier.")
            return None
        
        # Demander le mode si nécessaire
        mode = ask_mode_if_needed(mode)
        print(f"Mode sélectionné: {mode.upper()}")
        
        # Essayer d'extraire la date du nom du fichier de commande si pas fournie
        if order_date is None and 'order-' in order_file.lower():
            # Chercher une date dans le nom du fichier (format: Tuesday, May 27, 2025)
            date_match = re.search(r'(\w+, \w+ \d+, \d{4})', order_file)
            if date_match:
                try:
                    order_date = datetime.strptime(date_match.group(1), '%A, %B %d, %Y').date()
                    print(f"Date extraite du nom de fichier: {order_date}")
                except:
                    pass
        
        # Trouver ou utiliser le catalogue DBC
        if catalog_file is None:
            catalog_file = find_matching_catalog(order_date)
            print(f"Utilisation du catalogue DBC: {catalog_file}")
        
        # Lire le catalogue DBC
        df_catalog = pd.read_excel(catalog_file)
        
        # Construire les dictionnaires de recherche
        sku_lookup, characteristics_lookup = build_product_lookup(df_catalog)
        
        # Créer une copie de la commande pour modification
        df_result = df_order.copy()
        
        # Ajouter des colonnes pour traçabilité
        df_result['Prix Fournisseur'] = df_result['Price']
        
        if mode == 'dbc':
            # Mode DBC: toutes les infos
            df_result['Prix Catalogue'] = 0.0
            df_result['Prix DBC'] = 0.0
            df_result['VAT Type'] = ''
            df_result['Statut'] = ''
            df_result['Discount Fournisseur'] = ''
            df_result['Méthode recherche'] = ''
        
        # Convertir Price en float pour éviter les warnings
        df_result['Price'] = df_result['Price'].astype(float)
        
        # Statistiques
        count_sku_exact = 0
        count_characteristics = 0
        count_not_found = 0
        total_discount = 0.0
        
        # Appliquer les prix DBC
        for index, row in df_result.iterrows():
            sku = row['SKU']
            prix_fournisseur = row['Prix Fournisseur']
            
            # Extraire les caractéristiques de la commande
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
                    df_result.at[index, 'VAT Type'] = vat_type if pd.notna(vat_type) else 'Non marginal'
                    df_result.at[index, 'Méthode recherche'] = search_method
                    
                    # Calculer le discount du fournisseur
                    if pd.notna(prix_catalogue) and prix_catalogue > 0:
                        discount = round(((prix_catalogue - prix_fournisseur) / prix_catalogue) * 100, 2)
                        df_result.at[index, 'Discount Fournisseur'] = f"{discount}%"
                        total_discount += (prix_catalogue - prix_fournisseur)
                    
                    df_result.at[index, 'Statut'] = f'OK - {search_method}'
                
                df_result.at[index, 'Price'] = prix_dbc  # Remplacer le prix par le prix DBC
                
                if search_method == 'SKU exact':
                    count_sku_exact += 1
                else:
                    count_characteristics += 1
            else:
                # Produit non trouvé
                if mode == 'dbc':
                    df_result.at[index, 'Statut'] = 'ATTENTION - Produit non trouvé'
                    df_result.at[index, 'Prix DBC'] = prix_fournisseur
                    df_result.at[index, 'Méthode recherche'] = 'Non trouvé'
                
                df_result.at[index, 'Price'] = float(prix_fournisseur)
                count_not_found += 1
        
        # Calculer les totaux
        total_fournisseur = df_result['Prix Fournisseur'].sum()
        total_dbc = df_result['Price'].sum()
        
        # Réorganiser les colonnes selon le mode
        if mode == 'dbc':
            # Mode DBC: garder toutes les colonnes
            cols = list(df_result.columns)
            # Retirer les colonnes ajoutées
            for col in ['Prix Fournisseur', 'Prix Catalogue', 'Prix DBC', 'VAT Type', 
                       'Statut', 'Discount Fournisseur', 'Méthode recherche']:
                if col in cols:
                    cols.remove(col)
            # Les ajouter à la fin dans l'ordre souhaité
            cols.extend(['Prix Fournisseur', 'Prix Catalogue', 'Prix DBC', 'VAT Type', 
                        'Discount Fournisseur', 'Méthode recherche', 'Statut'])
            df_result = df_result[cols]
        else:
            # Mode client: retirer les colonnes sensibles
            cols_to_remove = ['Prix Fournisseur', 'Prix Catalogue', 'VAT Type', 
                            'Discount Fournisseur', 'Statut', 'Méthode recherche']
            for col in cols_to_remove:
                if col in df_result.columns:
                    df_result = df_result.drop(columns=[col])
        
        # Générer le nom du fichier de sortie
        if output_file is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            base_name = os.path.splitext(os.path.basename(order_file))[0]
            suffix = '_client' if mode == 'client' else '_avec_prix_dbc'
            output_file = f"{base_name}{suffix}_{timestamp}.xlsx"
        
        # Sauvegarder le résultat
        df_result.to_excel(output_file, index=False)
        print(f"\nFichier sauvegardé: {output_file}")
        
        # Afficher le résumé
        print("\n=== RÉSUMÉ DE LA TRANSFORMATION ===")
        print(f"Catalogue DBC utilisé: {catalog_file}")
        print(f"Nombre total de lignes: {len(df_result)}")
        print(f"Produits trouvés par SKU exact: {count_sku_exact}")
        print(f"Produits trouvés par caractéristiques: {count_characteristics}")
        print(f"Produits non trouvés: {count_not_found}")
        print(f"\nTotal prix fournisseur: {total_fournisseur:.2f}€")
        print(f"Total prix DBC: {total_dbc:.2f}€")
        print(f"Différence: {total_dbc - total_fournisseur:.2f}€")
        
        if mode == 'dbc':
            print(f"Discount total du fournisseur: {total_discount:.2f}€")
            
            # Afficher les produits non trouvés s'il y en a
            if count_not_found > 0:
                print("\n=== PRODUITS NON TROUVÉS ===")
                missing_products = df_result[df_result['Statut'].str.contains('non trouvé', na=False)]
                print(missing_products[['SKU', 'Product Name', 'Appearance', 'Functionality', 
                                      'Quantity', 'Prix Fournisseur']].to_string())
            
            # Afficher quelques exemples
            print("\n=== EXEMPLES DE TRANSFORMATION ===")
            examples = df_result.head(5)
            print(examples[['SKU', 'Product Name', 'Prix Fournisseur', 'Prix DBC', 
                          'Méthode recherche']].to_string())
        
        return df_result
        
    except Exception as e:
        print(f"Erreur: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

def main():
    """Fonction principale"""
    if len(sys.argv) < 2:
        print("Usage: python apply_dbc_prices_to_order.py <fichier_commande.xlsx> [--mode=dbc|client] [catalogue_dbc.xlsx] [fichier_sortie.xlsx]")
        print("\nExemples:")
        print("  python apply_dbc_prices_to_order.py 'order-1446435.xlsx'")
        print("  python apply_dbc_prices_to_order.py 'order-1446435.xlsx' --mode=client")
        print("  python apply_dbc_prices_to_order.py 'order-1446435.xlsx' --mode=dbc 'catalogue_dbc_20250528.xlsx'")
        print("\nModes:")
        print("  --mode=dbc    : Version interne avec toutes les informations")
        print("  --mode=client : Version client sans informations sensibles")
        print("  (sans --mode)  : Le script vous demandera de choisir")
        print("\nLe script détecte automatiquement la date de la commande et cherche le catalogue correspondant.")
        print("Il recherche les produits par SKU exact ou par Product Name + Appearance + Functionality.")
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
    result = apply_dbc_prices(order_file, catalog_file, output_file, mode=mode)
    
    if result is None:
        print("\n❌ Le traitement a échoué. Veuillez corriger les erreurs ci-dessus.")
        sys.exit(1)
    else:
        print("\n✅ Traitement terminé avec succès!")

if __name__ == "__main__":
    main() 