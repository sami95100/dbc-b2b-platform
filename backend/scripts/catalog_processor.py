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
# En local : depuis .env.local
# En production : depuis l'environnement système
load_dotenv('.env.local')  # Ignore l'erreur si le fichier n'existe pas
load_dotenv()  # Charger depuis l'environnement système aussi

def init_supabase() -> Client:
    """Initialise le client Supabase"""
    SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not SUPABASE_URL:
        raise Exception("Variable d'environnement NEXT_PUBLIC_SUPABASE_URL manquante")
    
    if not SUPABASE_KEY:
        raise Exception("Variable d'environnement SUPABASE_SERVICE_ROLE_KEY manquante")
    
    try:
        return create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        raise Exception(f"Erreur connexion Supabase: {str(e)}")

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
        # Lire le fichier Excel en forçant la colonne SKU comme texte
        print(f"📁 Lecture du fichier: {file_path}")
        
        # Spécifier les types de colonnes pour préserver les zéros de tête des SKU
        dtype_dict = {'SKU': str}  # Forcer la colonne SKU en texte
        
        df = pd.read_excel(file_path, dtype=dtype_dict)
        
        print(f"📊 Fichier lu: {len(df)} lignes")
        print(f"🔍 Colonnes détectées: {list(df.columns)}")
        
        # Vérifier les colonnes requises
        required_columns = ['SKU', 'Product Name', 'Price', 'Quantity']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            raise Exception(f"Colonnes manquantes: {missing_columns}")
        
        # Vérifier quelques SKU pour le debug
        sample_skus = df['SKU'].head(5).tolist()
        print(f"📋 Échantillon de SKU: {sample_skus}")
        
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
                # SKU déjà en format texte grâce au dtype
                sku = str(row.get('SKU', '')).strip()
                quantity = int(row.get('Quantity', 0)) if pd.notna(row.get('Quantity')) and str(row.get('Quantity')).isdigit() else 0
                price = float(row.get('Price', 0)) if pd.notna(row.get('Price')) and str(row.get('Price')).replace('.', '').isdigit() else 0
                
                # Ignorer les lignes sans SKU ou avec des données invalides
                if not sku or sku == 'nan':
                    continue
                
                # Vérifier que le SKU a bien été préservé (pour debug)
                if len(processed_products) < 3:  # Log seulement pour les premiers
                    print(f"🔍 SKU traité: '{sku}' (longueur: {len(sku)})")
                    
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
            if '1% (marginal)' in margin_info:
                stats['marginal'] += 1
            elif '11% (non marginal)' in margin_info:
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

def save_import_to_database(supabase, new_skus, restocked_skus, missing_skus, total_imported, stats):
    """Sauvegarde les données d'import dans la table catalog_imports"""
    try:
        # Identifier les SKU qui sont passés de 0 à en stock
        # Cette logique est déjà gérée dans import_to_supabase mais on peut l'améliorer
        
        import_data = {
            'import_date': datetime.now().isoformat(),
            'total_imported': total_imported,
            'total_updated': len(new_skus) + len(restocked_skus),
            'new_skus': new_skus,
            'restocked_skus': restocked_skus,
            'missing_skus': missing_skus,
            'import_summary': {
                'stats': stats,
                'new_skus_count': len(new_skus),
                'restocked_skus_count': len(restocked_skus),
                'missing_skus_count': len(missing_skus),
                'total_new_products': len(new_skus) + len(restocked_skus)
            }
        }
        
        # Insérer dans la table catalog_imports
        result = supabase.table('catalog_imports').insert(import_data).execute()
        
        if result.data:
            print(f"✅ Données d'import sauvegardées en base (ID: {result.data[0]['id']})")
            return result.data[0]['id']
        else:
            print("⚠️ Aucune donnée retournée lors de la sauvegarde d'import")
            return None
            
    except Exception as e:
        print(f"⚠️ Erreur sauvegarde import en base: {e}")
        return None

def import_to_supabase(products):
    """Importe les produits dans Supabase selon les règles métier DBC"""
    try:
        supabase = init_supabase()
        
        # Récupérer les produits existants avec leurs stocks actuels
        existing_products = {}
        try:
            # Récupérer TOUS les produits (pas de limite)
            page_size = 1000
            offset = 0
            
            while True:
                result = supabase.table('products').select('sku, quantity').range(offset, offset + page_size - 1).execute()
                
                if not result.data:
                    break
                    
                for item in result.data:
                    existing_products[item['sku']] = item['quantity']
                
                if len(result.data) < page_size:
                    break
                    
                offset += page_size
            
            print(f"📊 Produits existants en base: {len(existing_products)}")
            
            # DEBUG: Afficher quelques SKU existants pour vérifier le format
            if existing_products:
                sample_existing = list(existing_products.keys())[:5]
                print(f"🔍 Échantillon SKU existants: {sample_existing}")
            else:
                print("⚠️ ATTENTION: Aucun produit existant trouvé en base ! Tous seront considérés comme nouveaux.")
                
        except Exception as e:
            print(f"⚠️ Impossible de récupérer les stocks existants: {e}")
            print("⚠️ TOUS les produits seront considérés comme nouveaux !")
            # Continuer sans préservation de stock si erreur
        
        # DEBUG: Afficher quelques SKU du catalogue pour comparaison
        if products:
            sample_catalog = [p['sku'] for p in products[:5]]
            print(f"🔍 Échantillon SKU catalogue: {sample_catalog}")
        
        # Identifier les nouveaux SKU et gérer les stocks selon les règles métier
        new_skus = []
        restocked_skus = []  # SKU qui passent de 0 à en stock
        out_of_stock_skus = []  # SKU qui passent à 0 (retirés du catalogue)
        updated_products = []
        exact_matches = 0  # Compteur pour diagnostiquer les correspondances
        
        for product in products:
            sku = product['sku']
            new_quantity = product['quantity']
            
            if sku in existing_products:
                exact_matches += 1
                # Produit existant : mettre à jour avec le nouveau stock du catalogue
                old_quantity = existing_products[sku]
                
                if new_quantity == 0 and old_quantity > 0:
                    # Produit retiré du catalogue fournisseur
                    out_of_stock_skus.append(sku)
                    product['is_active'] = False
                    print(f"📦 {sku}: retiré du catalogue ({old_quantity} → 0)")
                elif new_quantity > 0:
                    # Produit avec stock
                    product['is_active'] = True
                    if old_quantity == 0:
                        # SKU qui passe de 0 à en stock = restocké
                        restocked_skus.append(sku)
                        print(f"🔄 {sku}: restocké ({old_quantity} → {new_quantity})")
                    elif old_quantity != new_quantity:
                        if len(new_skus) < 3:  # Log seulement les premiers pour éviter le spam
                            print(f"🔄 {sku}: stock mis à jour ({old_quantity} → {new_quantity})")
                    # Si même quantité, pas de log (import identique)
                # Note: On utilise TOUJOURS les nouvelles quantités du catalogue
            else:
                # Nouveau produit : SKU qui n'existait pas avant
                if new_quantity > 0:
                    new_skus.append(sku)
                    product['is_active'] = True
                    if len(new_skus) <= 10:  # Log seulement les 10 premiers
                        print(f"✨ {sku}: nouveau produit avec stock {new_quantity}")
                else:
                    # Nouveau produit mais en rupture dans le catalogue
                    product['is_active'] = False
            
            updated_products.append(product)
        
        # DIAGNOSTIC IMPORTANT
        print(f"\n🔍 DIAGNOSTIC D'IMPORT:")
        print(f"  - Produits dans catalogue: {len(products)}")
        print(f"  - Produits existants en base: {len(existing_products)}")
        print(f"  - Correspondances exactes trouvées: {exact_matches}")
        print(f"  - Nouveaux SKU détectés: {len(new_skus)}")
        
        # Calculer le pourcentage de nouveaux SKU
        new_sku_percentage = (len(new_skus) / len(products)) * 100 if len(products) > 0 else 0
        
        if len(new_skus) > len(products) * 0.9:  # Plus de 90% considérés comme nouveaux
            print(f"\n❌ ERREUR CRITIQUE: {len(new_skus)} nouveaux SKU sur {len(products)} total ({new_sku_percentage:.1f}%)")
            print(f"❌ Cela indique un problème majeur :")
            
            if len(existing_products) == 0:
                print(f"❌ La base de données products est VIDE !")
                print(f"❌ Tous les produits sont considérés comme nouveaux")
            else:
                print(f"❌ Problème de correspondance des SKU")
                
                # Analyser les différences de format
                existing_sample = list(existing_products.keys())[0]
                catalog_sample = products[0]['sku']
                print(f"❌ Exemple SKU base: '{existing_sample}' (type: {type(existing_sample)}, longueur: {len(str(existing_sample))})")
                print(f"❌ Exemple SKU catalogue: '{catalog_sample}' (type: {type(catalog_sample)}, longueur: {len(str(catalog_sample))})")
                
                # Vérifier si les SKU du catalogue sont présents en base avec des variantes
                catalog_sample_variants = [
                    str(catalog_sample).strip(),
                    str(catalog_sample).strip().upper(),
                    str(catalog_sample).strip().lower(),
                    str(catalog_sample).replace(' ', ''),
                    str(catalog_sample).replace('-', ''),
                ]
                
                found_variants = []
                for variant in catalog_sample_variants:
                    if variant in existing_products:
                        found_variants.append(variant)
                
                if found_variants:
                    print(f"❌ Variantes trouvées en base: {found_variants}")
                    print(f"❌ Problème de normalisation des SKU détecté !")
                else:
                    print(f"❌ Aucune variante du SKU catalogue trouvée en base")
            
            print(f"\n❌ IMPORT ANNULÉ - INTERVENTION MANUELLE REQUISE")
            print(f"❌ Veuillez vérifier :")
            print(f"❌ 1. Que la base de données products contient bien des données")
            print(f"❌ 2. Que le format des SKU est cohérent")
            print(f"❌ 3. Que le fichier catalogue est correct")
            
            # Annuler l'import et retourner une erreur
            raise Exception(f"Import annulé : {new_sku_percentage:.1f}% de nouveaux SKU détectés (seuil: 90%). Problème de correspondance des données.")
        
        elif len(new_skus) > len(products) * 0.5:  # Plus de 50% considérés comme nouveaux
            print(f"\n⚠️ AVERTISSEMENT: {len(new_skus)} nouveaux SKU sur {len(products)} total ({new_sku_percentage:.1f}%)")
            print(f"⚠️ Pourcentage élevé de nouveaux produits. Vérifiez que c'est normal.")
            
            # Afficher quelques exemples pour diagnostic
            if existing_products and products:
                print(f"⚠️ Exemples de comparaison :")
                sample_existing = list(existing_products.keys())[:3]
                sample_catalog = [p['sku'] for p in products[:3]]
                print(f"⚠️ SKU en base: {sample_existing}")
                print(f"⚠️ SKU catalogue: {sample_catalog}")
        else:
            print(f"✅ Pourcentage de nouveaux SKU normal: {new_sku_percentage:.1f}%")
        
        # Marquer comme en rupture les SKU qui étaient en base mais absents du nouveau catalogue
        catalog_skus = set(product['sku'] for product in products)
        missing_skus = []
        
        for existing_sku, old_quantity in existing_products.items():
            if existing_sku not in catalog_skus and old_quantity > 0:
                # Ce SKU n'est plus dans le nouveau catalogue mais était actif
                missing_skus.append(existing_sku)
                
                # Mettre à jour uniquement quantity et is_active
                try:
                    supabase.table('products').update({
                        'quantity': 0,
                        'is_active': False
                    }).eq('sku', existing_sku).execute()
                    
                    if len(missing_skus) <= 5:  # Log seulement les premiers
                        print(f"🚫 {existing_sku}: marqué en rupture (absent du nouveau catalogue)")
                    out_of_stock_skus.append(existing_sku)
                except Exception as e:
                    print(f"⚠️ Erreur mise à jour rupture {existing_sku}: {e}")
        
        print(f"\n📊 Résumé de l'import:")
        print(f"  - Nouveaux SKU: {len(new_skus)}")
        print(f"  - SKU restockés: {len(restocked_skus)}")
        print(f"  - SKU mis en rupture: {len(out_of_stock_skus)}")
        print(f"  - SKU manquants du catalogue: {len(missing_skus)}")
        print(f"  - Total à traiter: {len(updated_products)}")
        
        # Import par batch avec UPSERT
        batch_size = 100
        total_imported = 0
        
        for i in range(0, len(updated_products), batch_size):
            batch = updated_products[i:i + batch_size]
            
            # Upsert : insert ou update si SKU existe déjà
            result = supabase.table('products').upsert(
                batch,
                on_conflict='sku',
                ignore_duplicates=False
            ).execute()
            
            total_imported += len(batch)
            print(f"📤 Importé: {total_imported}/{len(updated_products)} produits...")
        
        # Calculer les vraies statistiques finales
        total_out_of_stock = len(out_of_stock_skus)  # Inclut les SKU du catalogue + les SKU manquants
        
        # Sauvegarder les données d'import en base de données
        import_id = save_import_to_database(supabase, new_skus, restocked_skus, missing_skus, total_imported, {
            'total': len(updated_products),
            'new_skus': len(new_skus),
            'restocked_skus': len(restocked_skus),
            'out_of_stock': total_out_of_stock,
            'missing_skus': len(missing_skus),
            'existing_in_db': len(existing_products),
            'exact_matches': exact_matches
        })
        
        return total_imported, new_skus, restocked_skus, total_out_of_stock
        
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
        imported_count, new_skus, restocked_skus, actual_out_of_stock = import_to_supabase(products)
        print(f"✅ {imported_count} produits importés/mis à jour dans Supabase")
        print(f"✅ {len(new_skus)} nouveaux SKU ajoutés")
        print(f"✅ {actual_out_of_stock} produits passés en rupture")
        
        # Mettre à jour les stats avec les vraies valeurs calculées après import
        stats['out_of_stock'] = actual_out_of_stock
        
        # Retourner le résultat en JSON pour l'API
        result = {
            'success': True,
            'stats': stats,
            'imported_count': imported_count,
            'new_skus_count': len(new_skus),  # Nombre total réel
            'new_skus': new_skus[:50],  # Liste limitée pour l'aperçu seulement
            'all_new_skus': new_skus,  # Liste complète pour le filtre
            'restocked_skus': restocked_skus
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