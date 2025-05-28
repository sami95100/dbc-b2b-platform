#!/usr/bin/env python3
"""
Script pour transformer le catalogue fournisseur en catalogue DBC
avec application des marges selon les règles définies:
- Produits non marginaux: price * 1.11
- Produits marginaux (VAT Type = 'Marginal'): price * 1.01
- Campaign Price ignoré (réductions qui profitent à DBC)
"""

import pandas as pd
import sys
from datetime import datetime
import os

def transform_catalog(input_file, output_file=None):
    """
    Transforme le catalogue fournisseur en catalogue DBC avec marges
    
    Args:
        input_file: Chemin vers le fichier Excel du fournisseur
        output_file: Chemin vers le fichier de sortie (optionnel)
    """
    try:
        # Lire le fichier Excel
        print(f"Lecture du fichier: {input_file}")
        df = pd.read_excel(input_file)
        
        # Afficher les colonnes disponibles
        print("\nColonnes trouvées dans le fichier:")
        for i, col in enumerate(df.columns):
            print(f"{i}: {col}")
        
        # Vérifier la présence des colonnes importantes
        required_columns = ['Price', 'Campaign Price', 'VAT Type']
        missing_columns = []
        
        for col in required_columns:
            if col not in df.columns:
                missing_columns.append(col)
        
        if missing_columns:
            print(f"\nERREUR: Colonnes manquantes: {missing_columns}")
            return
        
        # Créer une copie du dataframe pour les modifications
        df_dbc = df.copy()
        
        # Convertir la colonne Price en numérique (elle semble être de type object)
        df_dbc['Price'] = pd.to_numeric(df_dbc['Price'], errors='coerce')
        
        # Ajouter des colonnes pour le prix DBC et les informations de marge
        df_dbc['Prix DBC'] = 0.0
        df_dbc['Marge appliquée'] = ''
        df_dbc['Prix original'] = df_dbc['Price']
        
        # Statistiques
        count_marginal = 0
        count_non_marginal = 0
        count_invalid = 0
        count_campaign = 0
        
        # Appliquer les règles de marge
        for index, row in df_dbc.iterrows():
            price = row['Price']
            vat_type = row['VAT Type']
            campaign_price = row['Campaign Price']
            
            # Vérifier si le prix est valide
            if pd.isna(price) or price == 0:
                df_dbc.at[index, 'Prix DBC'] = price
                df_dbc.at[index, 'Marge appliquée'] = 'Prix invalide'
                count_invalid += 1
                continue
            
            # Vérifier si c'est un produit marginal
            if pd.notna(vat_type) and vat_type == 'Marginal':
                # Produit marginal: multiplier par 1.01
                df_dbc.at[index, 'Prix DBC'] = round(price * 1.01, 2)
                df_dbc.at[index, 'Marge appliquée'] = '1% (marginal)'
                count_marginal += 1
            else:
                # Produit non marginal: multiplier par 1.11
                df_dbc.at[index, 'Prix DBC'] = round(price * 1.11, 2)
                df_dbc.at[index, 'Marge appliquée'] = '11% (non marginal)'
                count_non_marginal += 1
            
            # Note sur campaign price (ignoré mais signalé)
            if pd.notna(campaign_price) and campaign_price > 0:
                df_dbc.at[index, 'Marge appliquée'] += f' - Campaign Price ignoré: {campaign_price}'
                count_campaign += 1
        
        # Réorganiser les colonnes pour mettre les nouvelles colonnes à la fin
        cols = list(df_dbc.columns)
        # Retirer les colonnes ajoutées
        cols.remove('Prix DBC')
        cols.remove('Marge appliquée')
        cols.remove('Prix original')
        # Les ajouter à la fin
        cols.extend(['Prix original', 'Prix DBC', 'Marge appliquée'])
        df_dbc = df_dbc[cols]
        
        # Générer le nom du fichier de sortie si non spécifié
        if output_file is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = f"catalogue_dbc_{timestamp}.xlsx"
        
        # Sauvegarder le fichier transformé
        df_dbc.to_excel(output_file, index=False)
        print(f"\nFichier transformé sauvegardé: {output_file}")
        
        # Afficher un résumé détaillé
        print("\n=== RÉSUMÉ DE LA TRANSFORMATION ===")
        print(f"Nombre total de produits: {len(df_dbc)}")
        print(f"Produits marginaux (1%): {count_marginal}")
        print(f"Produits non marginaux (11%): {count_non_marginal}")
        print(f"Produits avec prix invalide: {count_invalid}")
        print(f"Produits avec Campaign Price: {count_campaign}")
        
        # Afficher quelques exemples
        print("\n=== EXEMPLES DE TRANSFORMATION ===")
        # Sélectionner quelques lignes avec différents cas
        examples = []
        
        # Exemple de produit marginal
        marginal_example = df_dbc[df_dbc['Marge appliquée'].str.contains('1%', na=False)].head(2)
        if not marginal_example.empty:
            examples.append(marginal_example)
        
        # Exemple de produit non marginal
        non_marginal_example = df_dbc[df_dbc['Marge appliquée'].str.contains('11%', na=False) & 
                                     ~df_dbc['Marge appliquée'].str.contains('Campaign', na=False)].head(2)
        if not non_marginal_example.empty:
            examples.append(non_marginal_example)
        
        # Exemple avec Campaign Price
        campaign_example = df_dbc[df_dbc['Marge appliquée'].str.contains('Campaign', na=False)].head(2)
        if not campaign_example.empty:
            examples.append(campaign_example)
        
        if examples:
            sample_df = pd.concat(examples)
            print(sample_df[['SKU', 'Product Name', 'Prix original', 'Campaign Price', 'Prix DBC', 'Marge appliquée']].to_string())
        
        return df_dbc
        
    except Exception as e:
        print(f"Erreur lors du traitement: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

def main():
    """Fonction principale"""
    if len(sys.argv) < 2:
        print("Usage: python transform_catalog.py <fichier_catalogue.xlsx> [fichier_sortie.xlsx]")
        print("\nExemple: python transform_catalog.py 'Mobile devices-pricelist-Tuesday, May 27, 2025.xlsx'")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    if not os.path.exists(input_file):
        print(f"Erreur: Le fichier '{input_file}' n'existe pas.")
        sys.exit(1)
    
    transform_catalog(input_file, output_file)

if __name__ == "__main__":
    main() 