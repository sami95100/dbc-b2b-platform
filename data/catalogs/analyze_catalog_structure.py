import pandas as pd

# Lire le catalogue
df = pd.read_excel('Mobile devices-pricelist-Tuesday, May 27, 2025.xlsx')

print("=== STRUCTURE DU CATALOGUE ===")
print(f"Colonnes: {list(df.columns)}")
print(f"Nombre total de SKU: {len(df)}")

print("\n=== VALEURS POUR LES FILTRES ===")

# Appearance
print("\nAPPEARANCE:")
appearances = df['Appearance'].dropna().unique()
for app in sorted(appearances):
    count = df[df['Appearance'] == app].shape[0]
    print(f"  {app}: {count} produits")

# Functionality
print("\nFUNCTIONALITY:")
functionalities = df['Functionality'].dropna().unique()
for func in sorted(functionalities):
    count = df[df['Functionality'] == func].shape[0]
    print(f"  {func}: {count} produits")

# Color
print("\nCOLOR:")
colors = df['Color'].dropna().unique()
for color in sorted(colors)[:20]:  # Top 20 colors
    count = df[df['Color'] == color].shape[0]
    print(f"  {color}: {count} produits")
if len(colors) > 20:
    print(f"  ... et {len(colors) - 20} autres couleurs")

# Boxed
print("\nBOXED:")
boxed_values = df['Boxed'].dropna().unique()
for boxed in sorted(boxed_values):
    count = df[df['Boxed'] == boxed].shape[0]
    print(f"  {boxed}: {count} produits")

# Additional Info
print("\nADDITIONAL INFO:")
additional_info = df['Additional Info'].dropna().unique()
for info in sorted(additional_info)[:10]:  # Top 10
    count = df[df['Additional Info'] == info].shape[0]
    print(f"  {info}: {count} produits")
if len(additional_info) > 10:
    print(f"  ... et {len(additional_info) - 10} autres infos")

# Manufacturers dans Product Name
print("\n=== MANUFACTURERS (dans Product Name) ===")
brands = ['Apple', 'Samsung', 'Xiaomi', 'Google', 'Huawei', 'OnePlus', 
          'Motorola', 'Honor', 'Oppo', 'Realme', 'Sony', 'LG', 'TCL', 
          'Nokia', 'Vivo', 'Asus', 'ZTE', 'Nothing', 'Gigaset', 'HTC']

for brand in brands:
    count = df[df['Product Name'].str.contains(brand, case=False, na=False)].shape[0]
    if count > 0:
        print(f"  {brand}: {count} produits")

# Exemples de produits
print("\n=== EXEMPLES DE PRODUITS ===")
print(df[['SKU', 'Product Name', 'Appearance', 'Functionality', 'Color', 'Price']].head(10)) 