#!/usr/bin/env python3
"""
Script pour traiter les catalogues depuis l'API Next.js
"""

import pandas as pd
import sys
import os
import json
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Charger les variables d'environnement
load_dotenv()

def init_supabase() -> Client:
    """Initialise le client Supabase"""
    SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise Exception("Variables d'environnement Supabase manquantes")
    
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def apply_dbc_margins(row):
    """Applique les marges DBC selon les règles"""
    price = row.get('Price', 0)
    vat_type = row.get('VAT Type', '')
    
    # Convertir le prix en nombre si c'est une chaîne
    try:
        price = float(price) if price else 0
    except (ValueError, TypeError):
        return 0, 'Prix invalide'
    
    if pd.isna(price) or price == 0:
        return price, 'Prix invalide'
    
    if pd.notna(vat_type) and str(vat_type) == 'Marginal':
        # Produit marginal: multiplier par 1.01
        return round(price * 1.01, 2), '1% (marginal)'
    else:
        # Produit non marginal: multiplier par 1.11
        return round(price * 1.11, 2), '11% (non marginal)'

def process_catalog_file(file_path):
    """
    Traite un fichier catalogue et retourne les statistiques
    """
    try:
        # Lire le fichier Excel
        df = pd.read_excel(file_path)
        
        print(f"Fichier lu: {len(df)} lignes")
        
        # Vérifier les colonnes requises
        required_columns = ['SKU', 'Product Name', 'Price', 'Quantity']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            raise Exception(f"Colonnes manquantes: {missing_columns}")
        
        # Appliquer les marges DBC
        processed_products = []
        stats = {
            'total': len(df),
            'marginal': 0,
            'non_marginal': 0,
            'invalid_price': 0,
            'active_products': 0,
            'out_of_stock': 0
        }
        
        for _, row in df.iterrows():
            price_dbc, margin_info = apply_dbc_margins(row)
            
            # Convertir et valider les données
            try:
                sku = str(row.get('SKU', ''))
                quantity = int(row.get('Quantity', 0)) if pd.notna(row.get('Quantity')) and str(row.get('Quantity')).isdigit() else 0
                price = float(row.get('Price', 0)) if pd.notna(row.get('Price')) and str(row.get('Price')).replace('.', '').isdigit() else 0
                
                # Ignorer les lignes sans SKU ou avec des données invalides
                if not sku or sku == 'nan':
                    continue
                    
            except (ValueError, TypeError) as e:
                print(f"Ligne ignorée - erreur de conversion: {e}")
                continue
            
            product = {
                'sku': sku,
                'item_group': str(row.get('Item Group', '')),
                'product_name': str(row.get('Product Name', '')),
                'appearance': str(row.get('Appearance', '')),
                'functionality': str(row.get('Functionality', '')),
                'boxed': str(row.get('Boxed', '')),
                'color': str(row.get('Color', '')) if pd.notna(row.get('Color')) else None,
                'cloud_lock': str(row.get('Cloud Lock', '')) if pd.notna(row.get('Cloud Lock')) else None,
                'additional_info': str(row.get('Additional Info', '')) if pd.notna(row.get('Additional Info')) else None,
                'quantity': quantity,
                'price': price,
                'campaign_price': float(row.get('Campaign Price')) if pd.notna(row.get('Campaign Price')) and str(row.get('Campaign Price')).replace('.', '').isdigit() else None,
                'vat_type': str(row.get('VAT Type', '')) if pd.notna(row.get('VAT Type')) else None,
                'price_dbc': price_dbc,
                'is_active': quantity > 0
            }
            
            processed_products.append(product)
            
            # Mise à jour des statistiques
            if 'marginal' in margin_info:
                stats['marginal'] += 1
            elif 'non marginal' in margin_info:
                stats['non_marginal'] += 1
            else:
                stats['invalid_price'] += 1
            
            if product['is_active']:
                stats['active_products'] += 1
            else:
                stats['out_of_stock'] += 1
        
        return processed_products, stats
        
    except Exception as e:
        raise Exception(f"Erreur traitement catalogue: {str(e)}")

def import_to_supabase(products):
    """Importe les produits dans Supabase"""
    try:
        supabase = init_supabase()
        
        # D'abord, récupérer les SKU existants
        existing_skus = set()
        try:
            result = supabase.table('products').select('sku').execute()
            existing_skus = {item['sku'] for item in result.data}
        except:
            pass  # Si erreur, on considère qu'il n'y a pas de produits existants
        
        # Identifier les nouveaux SKU
        new_skus = []
        for product in products:
            if product['sku'] not in existing_skus:
                new_skus.append(product['sku'])
        
        # Import par batch
        batch_size = 100
        total_imported = 0
        
        for i in range(0, len(products), batch_size):
            batch = products[i:i + batch_size]
            
            # Upsert : insert ou update si SKU existe déjà
            result = supabase.table('products').upsert(
                batch,
                on_conflict='sku',
                ignore_duplicates=False
            ).execute()
            
            total_imported += len(batch)
            print(f"Importé: {total_imported}/{len(products)} produits...")
        
        return total_imported, new_skus
        
    except Exception as e:
        raise Exception(f"Erreur import Supabase: {str(e)}")

def main():
    """Fonction principale pour usage en ligne de commande"""
    if len(sys.argv) < 2:
        print("Usage: python catalog_processor.py <fichier_catalogue.xlsx>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    try:
        # Traiter le catalogue
        products, stats = process_catalog_file(file_path)
        
        print(f"\n=== TRAITEMENT TERMINÉ ===")
        print(f"Total produits: {stats['total']}")
        print(f"Marginaux (1%): {stats['marginal']}")
        print(f"Non marginaux (11%): {stats['non_marginal']}")
        print(f"Prix invalides: {stats['invalid_price']}")
        print(f"Produits actifs: {stats['active_products']}")
        print(f"En rupture: {stats['out_of_stock']}")
        
        # Importer dans Supabase
        print(f"\n=== IMPORT SUPABASE ===")
        imported_count, new_skus = import_to_supabase(products)
        print(f"✅ {imported_count} produits importés/mis à jour dans Supabase")
        print(f"✅ {len(new_skus)} nouveaux SKU ajoutés")
        
        # Retourner le résultat en JSON pour l'API
        result = {
            'success': True,
            'stats': stats,
            'imported_count': imported_count,
            'new_skus': new_skus[:50]  # Limiter à 50 pour l'aperçu
        }
        print("\n" + json.dumps(result))
        
    except Exception as e:
        result = {
            'success': False,
            'error': str(e)
        }
        print("\n" + json.dumps(result))
        sys.exit(1)

if __name__ == "__main__":
    main() 