# Configuration Supabase - DBC B2B Platform

## Qu'est-ce que Supabase ?

Supabase est une alternative open-source à Firebase qui fournit :

- **Base de données PostgreSQL** hébergée
- **API REST automatique** générée à partir du schéma
- **Authentification** complète avec JWT
- **Storage** pour fichiers (catalogues Excel)
- **Real-time** pour mises à jour en temps réel
- **Dashboard** pour administration

## 1. Création du projet Supabase

### Étapes :

1. Aller sur [supabase.com](https://supabase.com)
2. Créer un compte
3. "New Project" → Nom: "dbc-b2b-platform"
4. Choisir région (Europe West pour nous)
5. Mot de passe base de données (à sauvegarder !)

### Variables d'environnement récupérées :

```bash
# .env.local (frontend)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# .env (backend)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 2. Schéma de base de données

### Tables principales :

```sql
-- 1. Table des utilisateurs (clients B2B)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR UNIQUE NOT NULL,
    company_name VARCHAR NOT NULL,
    contact_name VARCHAR NOT NULL,
    phone VARCHAR,
    address TEXT,
    role VARCHAR DEFAULT 'client' CHECK (role IN ('client', 'admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Table des produits
CREATE TABLE products (
    sku VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    category VARCHAR NOT NULL,
    brand VARCHAR,

    -- Prix
    price_foxway DECIMAL(10,2) NOT NULL,  -- Prix fournisseur
    price_dbc DECIMAL(10,2) NOT NULL,     -- Prix DBC avec marge
    vat_type VARCHAR DEFAULT 'normal' CHECK (vat_type IN ('normal', 'marginal')),

    -- Stock et disponibilité
    stock_quantity INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,

    -- Métadonnées
    appearance VARCHAR,
    functionality VARCHAR,
    condition_type VARCHAR,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Table des commandes
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),

    -- Statuts
    status VARCHAR DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),

    -- Montants
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,

    -- Informations livraison
    shipping_address TEXT,
    shipping_method VARCHAR,
    tracking_number VARCHAR,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Table des articles de commande
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_sku VARCHAR REFERENCES products(sku),

    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,

    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Table des catalogues importés
CREATE TABLE catalogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR NOT NULL,
    file_path VARCHAR,
    file_size INTEGER,

    -- Traitement
    status VARCHAR DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'processed', 'error')),
    products_count INTEGER DEFAULT 0,
    error_message TEXT,

    -- Timestamps
    uploaded_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

-- 6. Index pour performance
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_available ON products(is_available);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
```

## 3. Row Level Security (RLS)

### Sécurité par ligne pour protéger les données :

```sql
-- Activer RLS sur toutes les tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Politiques pour les utilisateurs
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Politiques pour les produits (lecture seule pour clients)
CREATE POLICY "Anyone can view available products" ON products
    FOR SELECT USING (is_available = true);

-- Politiques pour les commandes
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own orders" ON orders
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Politiques pour les articles de commande
CREATE POLICY "Users can view own order items" ON order_items
    FOR SELECT USING (
        order_id IN (
            SELECT id FROM orders WHERE user_id = auth.uid()
        )
    );
```

## 4. Utilisation côté Frontend (Next.js)

### Installation :

```bash
npm install @supabase/supabase-js
```

### Configuration client :

```typescript
// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types TypeScript générés automatiquement
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          company_name: string;
          // ... autres champs
        };
        Insert: {
          email: string;
          company_name: string;
          // ... champs requis pour insertion
        };
        Update: {
          email?: string;
          company_name?: string;
          // ... champs optionnels pour mise à jour
        };
      };
      // ... autres tables
    };
  };
};
```

### Exemples d'utilisation :

#### Authentification :

```typescript
// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: "client@entreprise.com",
  password: "motdepasse",
});

// Logout
await supabase.auth.signOut();

// Récupérer utilisateur actuel
const {
  data: { user },
} = await supabase.auth.getUser();
```

#### Récupération de données :

```typescript
// Tous les produits disponibles
const { data: products, error } = await supabase
  .from("products")
  .select("*")
  .eq("is_available", true)
  .order("name");

// Produits avec filtres
const { data: iphones } = await supabase
  .from("products")
  .select("*")
  .eq("category", "iPhone")
  .gte("stock_quantity", 1)
  .range(0, 19); // Pagination : 20 premiers résultats
```

#### Création de commande :

```typescript
// Créer commande
const { data: order, error } = await supabase
  .from("orders")
  .insert({
    order_number: "ORD-2025-001",
    user_id: user.id,
    subtotal: 1500.0,
    total_amount: 1815.0, // avec TVA
    status: "pending",
  })
  .select()
  .single();

// Ajouter articles
const { error: itemsError } = await supabase.from("order_items").insert([
  {
    order_id: order.id,
    product_sku: "IPH15-128-BLK",
    quantity: 2,
    unit_price: 750.0,
    total_price: 1500.0,
  },
]);
```

## 5. Utilisation côté Backend (Python)

### Installation :

```bash
pip install supabase
```

### Configuration :

```python
# backend/lib/supabase.py
from supabase import create_client, Client
import os

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY")  # Service key pour admin
supabase: Client = create_client(url, key)
```

### Exemples d'utilisation :

#### Import de catalogue :

```python
async def import_catalog(file_path: str):
    # Lire fichier Excel avec nos scripts existants
    products = transform_catalog(file_path)

    # Insérer en base
    result = supabase.table('products').upsert(products).execute()

    # Mettre à jour statut catalogue
    supabase.table('catalogs').update({
        'status': 'processed',
        'products_count': len(products),
        'processed_at': 'now()'
    }).eq('filename', os.path.basename(file_path)).execute()
```

#### Traitement de commande :

```python
async def process_order(order_id: str):
    # Récupérer commande avec articles
    order = supabase.table('orders').select('''
        *,
        order_items (
            *,
            products (*)
        )
    ''').eq('id', order_id).single().execute()

    # Appliquer prix DBC avec nos scripts
    updated_order = apply_dbc_prices_to_order(order.data)

    # Mettre à jour en base
    supabase.table('orders').update({
        'status': 'confirmed',
        'total_amount': updated_order['total']
    }).eq('id', order_id).execute()
```

## 6. Real-time (optionnel)

### Écouter changements en temps réel :

```typescript
// Écouter nouveaux produits
const channel = supabase
  .channel("product-changes")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "products",
    },
    (payload) => {
      console.log("Nouveau produit:", payload.new);
      // Mettre à jour l'interface
    }
  )
  .subscribe();

// Écouter changements de stock
supabase
  .channel("stock-updates")
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "products",
      filter: "stock_quantity=lt.5", // Stock faible
    },
    (payload) => {
      showStockAlert(payload.new);
    }
  )
  .subscribe();
```

## 7. Storage pour fichiers

### Upload de catalogues Excel :

```typescript
// Upload fichier
const { data, error } = await supabase.storage
  .from("catalogs")
  .upload(`catalog-${Date.now()}.xlsx`, file);

// Récupérer URL publique
const { data: publicURL } = supabase.storage
  .from("catalogs")
  .getPublicUrl(data.path);
```

## 8. Avantages pour notre projet

### Développement rapide :

- **API automatique** : Pas besoin de coder les CRUD
- **Types TypeScript** : Génération automatique
- **Authentification** : Système complet prêt

### Sécurité :

- **RLS** : Isolation des données par client
- **JWT** : Tokens sécurisés
- **HTTPS** : Chiffrement automatique

### Scalabilité :

- **PostgreSQL** : Base robuste et performante
- **CDN** : Distribution mondiale
- **Backup** : Sauvegardes automatiques

### Monitoring :

- **Dashboard** : Métriques en temps réel
- **Logs** : Historique des requêtes
- **Alertes** : Notifications automatiques

Supabase nous permet de nous concentrer sur la logique métier plutôt que sur l'infrastructure !

## 9. Mise à jour pour le suivi des imports

### Table pour l'historique des imports de catalogue

Exécutez ce SQL dans l'éditeur SQL de Supabase :

```sql
-- Table pour l'historique des imports de catalogue
CREATE TABLE IF NOT EXISTS catalog_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_imported INTEGER DEFAULT 0,
  total_updated INTEGER DEFAULT 0,
  new_skus TEXT[] DEFAULT '{}', -- Liste des nouveaux SKU
  restocked_skus TEXT[] DEFAULT '{}', -- Liste des SKU remis en stock
  import_summary JSONB, -- Résumé complet de l'import
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_catalog_imports_date ON catalog_imports(import_date DESC);

-- Fonction pour récupérer le dernier import
CREATE OR REPLACE FUNCTION get_latest_import_info()
RETURNS TABLE (
  import_date TIMESTAMP WITH TIME ZONE,
  total_new_products INTEGER,
  new_skus TEXT[],
  restocked_skus TEXT[]
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    ci.import_date,
    (array_length(ci.new_skus, 1) + array_length(ci.restocked_skus, 1)) as total_new_products,
    ci.new_skus,
    ci.restocked_skus
  FROM catalog_imports ci
  ORDER BY ci.import_date DESC
  LIMIT 1;
$$;

-- Activer RLS sur la table catalog_imports
ALTER TABLE catalog_imports ENABLE ROW LEVEL SECURITY;

-- Politique : Seuls les admins peuvent voir les imports
CREATE POLICY "Admins can view import history" ON catalog_imports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
```

### Fonctionnalité

Cette mise à jour permet :

- **Persistance des données** : Les informations d'import sont sauvegardées en base
- **Partage entre utilisateurs** : Tous voient les mêmes données d'import
- **Historique complet** : Suivi de tous les imports avec dates
- **Nouveaux produits intelligents** :
  - SKU vraiment nouveaux (n'existaient pas)
  - SKU restockés (passés de 0 à en stock)
- **Sécurité** : Seuls les admins peuvent voir l'historique

Le bouton "Nouveaux" affiche maintenant :

- Nombre total de nouveaux produits depuis le dernier import
- Date et heure du dernier import
- Informations persistantes même après déconnexion

Supabase nous permet de nous concentrer sur la logique métier plutôt que sur l'infrastructure !
