# Instructions pour configurer les tables de commandes dans Supabase

## Étape 1 : Accéder à Supabase

1. Connectez-vous à votre projet Supabase : https://supabase.com/dashboard
2. Allez dans l'onglet **SQL Editor**

## Étape 2 : Créer les tables

Copiez et exécutez les requêtes SQL suivantes une par une :

### 1. Table des commandes (orders)

```sql
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'pending_payment', 'shipping', 'completed', 'cancelled')),
  status_label TEXT NOT NULL,
  customer_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  total_amount DECIMAL(10,2) DEFAULT 0,
  total_items INTEGER DEFAULT 0,
  vat_type TEXT,
  tracking_number TEXT,
  shipping_cost DECIMAL(10,2) DEFAULT 0
);
```

### 2. Table des articles de commande (order_items)

```sql
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Index pour les performances

```sql
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_sku ON order_items(sku);
```

### 3bis. Table des IMEI des articles de commande (order_item_imei)

```sql
CREATE TABLE IF NOT EXISTS order_item_imei (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  imei TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  appearance TEXT NOT NULL,
  functionality TEXT NOT NULL,
  boxed TEXT NOT NULL,
  color TEXT,
  cloud_lock TEXT,
  additional_info TEXT,
  supplier_price DECIMAL(10,2) NOT NULL,
  dbc_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3ter. Index pour la table order_item_imei

```sql
CREATE INDEX IF NOT EXISTS idx_order_item_imei_order_item_id ON order_item_imei(order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_item_imei_sku ON order_item_imei(sku);
CREATE INDEX IF NOT EXISTS idx_order_item_imei_imei ON order_item_imei(imei);
```

### 4. Activation de Row Level Security (RLS)

```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_imei ENABLE ROW LEVEL SECURITY;
```

### 5. Politiques RLS (permettre tout pour l'instant)

```sql
CREATE POLICY "Allow all operations on orders" ON orders FOR ALL USING (true);
CREATE POLICY "Allow all operations on order_items" ON order_items FOR ALL USING (true);
CREATE POLICY "Allow all operations on order_item_imei" ON order_item_imei FOR ALL USING (true);
```

### 6. Fonction pour mettre à jour automatiquement updated_at

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

### 7. Trigger pour updated_at

```sql
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Étape 3 : Vérifier les tables

Vous pouvez vérifier que les tables ont été créées en allant dans l'onglet **Table Editor** de Supabase.

## Étape 4 : Tester la fonctionnalité

Une fois les tables créées :

1. Retournez sur votre application
2. Créez une commande brouillon avec quelques produits
3. Allez sur la page de détails de la commande
4. Cliquez sur **"Valider la commande"** - cela va :
   - Sauvegarder la commande dans Supabase
   - Décrémenter le stock des produits
   - Changer le statut en "En attente"

## Fonctionnalités disponibles après configuration

✅ **Validation de commande** : Sauvegarde dans Supabase + décrément du stock
✅ **Export Excel** : Téléchargement des commandes en format CSV
✅ **Gestion du stock** : Les quantités sont automatiquement mises à jour
✅ **Suivi des commandes** : Historique et statuts dans la base de données

## Problèmes résolus

1. ✅ **Quantités non décrémentes** : Le stock est maintenant mis à jour à la validation
2. ✅ **Produits manquants** : Chargement de tous les produits sans limite
3. ✅ **Export Excel** : Fonctionnalité d'export implementée
4. ✅ **Tables commandes** : Structure de base de données créée
