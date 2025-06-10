-- Fonctions SQL pour les statistiques du dashboard admin (version debug)

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