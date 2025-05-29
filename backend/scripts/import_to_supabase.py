#!/usr/bin/env python3
"""
Script pour importer le catalogue DBC dans Supabase
Utilise le script transform_catalog.py existant et upload les données
"""

import pandas as pd
import sys
import os
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv
import json

# Charger les variables d'environnement
load_dotenv()

# Configuration Supabase
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')  # Service role pour écriture

def init_supabase() -> Client:
    """Initialise le client Supabase"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERREUR: Variables d'environnement Supabase manquantes")
        print("Créez un fichier .env.local avec NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)
    
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def import_catalog_to_supabase(catalog_file):
    """
    Importe le catalogue DBC dans Supabase
    
    Args:
        catalog_file: Chemin vers le fichier catalogue DBC transformé
    """
    try:
        # Initialiser Supabase
        supabase = init_supabase()
        
        # Lire le catalogue
        print(f"Lecture du catalogue: {catalog_file}")
        df = pd.read_excel(catalog_file)
        
        # Préparer les données pour Supabase
        products = []
        for _, row in df.iterrows():
            product = {
                'sku': str(row.get('SKU', '')),
                'item_group': str(row.get('Item Group', '')),
                'product_name': str(row.get('Product Name', '')),
                'appearance': str(row.get('Appearance', '')),
                'functionality': str(row.get('Functionality', '')),
                'boxed': str(row.get('Boxed', '')),
                'color': str(row.get('Color', '')) if pd.notna(row.get('Color')) else None,
                'cloud_lock': str(row.get('Cloud Lock', '')) if pd.notna(row.get('Cloud Lock')) else None,
                'additional_info': str(row.get('Additional Info', '')) if pd.notna(row.get('Additional Info')) else None,
                'quantity': int(row.get('Quantity', 0)) if pd.notna(row.get('Quantity')) else 0,
                'price': float(row.get('Price', 0)) if pd.notna(row.get('Price')) else 0,
                'campaign_price': float(row.get('Campaign Price')) if pd.notna(row.get('Campaign Price')) else None,
                'vat_type': str(row.get('VAT Type', '')) if pd.notna(row.get('VAT Type')) else None,
                'price_dbc': float(row.get('Prix DBC', 0)) if pd.notna(row.get('Prix DBC')) else 0,
                'is_active': int(row.get('Quantity', 0)) > 0  # Actif si stock > 0
            }
            products.append(product)
        
        print(f"\nNombre de produits à importer: {len(products)}")
        
        # Stratégie d'import : UPSERT par batch
        batch_size = 100
        total_imported = 0
        
        for i in range(0, len(products), batch_size):
            batch = products[i:i + batch_size]
            
            try:
                # Upsert : insert ou update si SKU existe déjà
                result = supabase.table('products').upsert(
                    batch,
                    on_conflict='sku',  # Si SKU existe, mettre à jour
                    ignore_duplicates=False
                ).execute()
                
                total_imported += len(batch)
                print(f"Importé: {total_imported}/{len(products)} produits...")
                
            except Exception as e:
                print(f"Erreur lors de l'import du batch {i//batch_size + 1}: {str(e)}")
                # Continuer avec le batch suivant
                continue
        
        print(f"\n✅ Import terminé: {total_imported} produits importés/mis à jour")
        
        # Statistiques
        stats = {
            'total_products': len(products),
            'active_products': len([p for p in products if p['is_active']]),
            'out_of_stock': len([p for p in products if not p['is_active']]),
            'with_campaign_price': len([p for p in products if p['campaign_price']]),
            'marginal_vat': len([p for p in products if p['vat_type'] == 'Marginal'])
        }
        
        print("\n=== STATISTIQUES ===")
        for key, value in stats.items():
            print(f"{key}: {value}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Erreur lors de l'import: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Fonction principale"""
    if len(sys.argv) < 2:
        print("Usage: python import_to_supabase.py <catalogue_dbc.xlsx>")
        print("\nExemple: python import_to_supabase.py 'catalogue_dbc_20250528_015036.xlsx'")
        sys.exit(1)
    
    catalog_file = sys.argv[1]
    
    if not os.path.exists(catalog_file):
        print(f"Erreur: Le fichier '{catalog_file}' n'existe pas.")
        sys.exit(1)
    
    # Vérifier que c'est bien un catalogue DBC transformé
    if 'catalogue_dbc' not in catalog_file:
        print("ATTENTION: Ce script est conçu pour les catalogues DBC transformés.")
        print("Utilisez d'abord transform_catalog.py pour générer un catalogue DBC.")
        response = input("Continuer quand même? (o/n): ")
        if response.lower() != 'o':
            sys.exit(0)
    
    success = import_catalog_to_supabase(catalog_file)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main() 