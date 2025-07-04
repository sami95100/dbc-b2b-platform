-- Fonctions SQL pour les statistiques du dashboard admin (version debug)

-- Table pour l'historique des imports de catalogue
CREATE TABLE IF NOT EXISTS catalog_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_imported INTEGER DEFAULT 0,
  total_updated INTEGER DEFAULT 0,
  new_skus TEXT[] DEFAULT '{}', -- Liste des nouveaux SKU
  restocked_skus TEXT[] DEFAULT '{}', -- Liste des SKU remis en stock
  missing_skus TEXT[] DEFAULT '{}', -- Liste des SKU en rupture (absents du nouveau catalogue)
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

-- 1. Fonction pour calculer la marge totale des commandes completed avec debug
CREATE OR REPLACE FUNCTION get_total_margin_completed_orders()
RETURNS NUMERIC
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(SUM(
    CASE 
      WHEN oimei.dbc_price IS NOT NULL AND oimei.supplier_price IS NOT NULL 
      THEN oimei.dbc_price - oimei.supplier_price 
      ELSE 0 
    END
  ), 0) as total_margin
  FROM order_item_imei oimei
  INNER JOIN order_items oi ON oimei.order_item_id = oi.id
  INNER JOIN orders o ON oi.order_id = o.id
  WHERE o.status = 'completed'
    AND oimei.dbc_price IS NOT NULL 
    AND oimei.supplier_price IS NOT NULL;
$$;

-- 2. Fonction pour obtenir les modèles les plus vendus avec leurs statistiques (version debug)
CREATE OR REPLACE FUNCTION get_top_selling_models_completed_orders(limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
  modelName TEXT,
  totalQuantity BIGINT,
  totalRevenue NUMERIC,
  totalMargin NUMERIC
)
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    oimei.product_name as modelName,
    COUNT(*) as totalQuantity,  -- Chaque ligne = 1 produit vendu
    SUM(COALESCE(oimei.dbc_price, 0)) as totalRevenue,
    SUM(
      CASE 
        WHEN oimei.dbc_price IS NOT NULL AND oimei.supplier_price IS NOT NULL 
        THEN oimei.dbc_price - oimei.supplier_price 
        ELSE 0 
      END
    ) as totalMargin
  FROM order_item_imei oimei
  INNER JOIN order_items oi ON oimei.order_item_id = oi.id
  INNER JOIN orders o ON oi.order_id = o.id
  WHERE o.status = 'completed'
    AND oimei.product_name IS NOT NULL
  GROUP BY oimei.product_name
  ORDER BY COUNT(*) DESC  -- Trier par nombre de produits vendus
  LIMIT limit_count;
$$;

-- 3. Fonction de debug pour analyser les données
CREATE OR REPLACE FUNCTION debug_margin_data()
RETURNS TABLE (
  total_rows BIGINT,
  completed_orders_count BIGINT,
  rows_with_prices BIGINT,
  rows_with_null_dbc BIGINT,
  rows_with_null_supplier BIGINT,
  total_dbc_price NUMERIC,
  total_supplier_price NUMERIC,
  calculated_margin NUMERIC,
  avg_dbc_price NUMERIC,
  avg_supplier_price NUMERIC
)
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    COUNT(*) as total_rows,
    COUNT(DISTINCT o.id) as completed_orders_count,
    COUNT(CASE WHEN oimei.dbc_price IS NOT NULL AND oimei.supplier_price IS NOT NULL THEN 1 END) as rows_with_prices,
    COUNT(CASE WHEN oimei.dbc_price IS NULL THEN 1 END) as rows_with_null_dbc,
    COUNT(CASE WHEN oimei.supplier_price IS NULL THEN 1 END) as rows_with_null_supplier,
    SUM(COALESCE(oimei.dbc_price, 0)) as total_dbc_price,
    SUM(COALESCE(oimei.supplier_price, 0)) as total_supplier_price,
    SUM(COALESCE(oimei.dbc_price - oimei.supplier_price, 0)) as calculated_margin,
    AVG(oimei.dbc_price) as avg_dbc_price,
    AVG(oimei.supplier_price) as avg_supplier_price
  FROM order_item_imei oimei
  INNER JOIN order_items oi ON oimei.order_item_id = oi.id
  INNER JOIN orders o ON oi.order_id = o.id
  WHERE o.status = 'completed';
$$; 

-- 4. Fonction pour calculer la marge d'une commande spécifique par son ID
CREATE OR REPLACE FUNCTION get_order_margin_by_id(order_uuid UUID)
RETURNS NUMERIC
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(SUM(
    CASE 
      WHEN oimei.dbc_price IS NOT NULL AND oimei.supplier_price IS NOT NULL 
      THEN oimei.dbc_price - oimei.supplier_price 
      ELSE 0 
    END
  ), 0) as order_margin
  FROM order_item_imei oimei
  INNER JOIN order_items oi ON oimei.order_item_id = oi.id
  INNER JOIN orders o ON oi.order_id = o.id
  WHERE o.id = order_uuid
    AND oimei.dbc_price IS NOT NULL 
    AND oimei.supplier_price IS NOT NULL;
$$; 