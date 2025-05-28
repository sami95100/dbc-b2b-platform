#!/usr/bin/env python3
"""
Script pour analyser la structure du fichier catalogue
"""

import pandas as pd
import sys

def analyze_file(filename):
    """Analyse la structure du fichier Excel"""
    try:
        # Lire le fichier
        df = pd.read_excel(filename)
        
        print(f"=== ANALYSE DU FICHIER: {filename} ===\n")
        
        # Informations générales
        print(f"Nombre de lignes: {len(df)}")
        print(f"Nombre de colonnes: {len(df.columns)}")
        
        # Liste des colonnes
        print("\n=== COLONNES ===")
        for i, col in enumerate(df.columns):
            print(f"{i}: {col}")
        
        # Aperçu des premières lignes
        print("\n=== APERÇU DES 5 PREMIÈRES LIGNES ===")
        print(df.head().to_string())
        
        # Vérifier la colonne Campaign Price
        if 'Campaign Price' in df.columns:
            print("\n=== ANALYSE DE 'Campaign Price' ===")
            campaign_prices = df['Campaign Price'].dropna()
            print(f"Nombre de produits avec Campaign Price: {len(campaign_prices)}")
            if len(campaign_prices) > 0:
                print(f"Exemples de Campaign Price:")
                print(campaign_prices.head(10).to_string())
        
        # Analyser les types de données
        print("\n=== TYPES DE DONNÉES ===")
        print(df.dtypes)
        
        # Rechercher des colonnes qui pourraient indiquer le statut marginal
        print("\n=== RECHERCHE DE COLONNES POTENTIELLES POUR 'MARGINAL' ===")
        for col in df.columns:
            if any(keyword in col.lower() for keyword in ['margin', 'type', 'category', 'group']):
                print(f"\nColonne '{col}':")
                print(f"Valeurs uniques: {df[col].unique()[:10]}")  # Limiter à 10 valeurs
        
    except Exception as e:
        print(f"Erreur: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python analyze_catalog.py <fichier.xlsx>")
        sys.exit(1)
    
    analyze_file(sys.argv[1]) 