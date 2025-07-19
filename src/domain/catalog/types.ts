// Types pour le domaine Catalogue avec schéma flexible

export interface BaseProduct {
  // Champs fixes obligatoires
  sku: string;
  product_name: string;
  price: number;
  price_dbc: number;
  supplier_price?: number; // Prix d'achat (admin seulement)
  is_active: boolean;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface ProductAttributes {
  // Attributs communs mais optionnels
  appearance?: string;
  functionality?: string;
  boxed?: string;
  color?: string;
  cloud_lock?: string | null;
  additional_info?: string | null;
  vat_type?: string | null;
  campaign_price?: number | null;
  item_group?: string;
  
  // Attributs dynamiques pour extensibilité
  dynamic_attributes?: Record<string, any>;
}

export interface Product extends BaseProduct, ProductAttributes {}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  // Configuration des attributs dynamiques pour cette catégorie
  attribute_schema?: ProductAttributeSchema;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductAttributeSchema {
  [attributeName: string]: {
    type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
    required?: boolean;
    options?: string[]; // Pour select/multiselect
    validation?: {
      min?: number;
      max?: number;
      pattern?: string;
    };
    display_name?: string;
    description?: string;
  };
}

export interface CatalogImportResult {
  success: boolean;
  importedProducts: number;
  updatedProducts: number;
  newProducts: number;
  errors: string[];
  warnings: string[];
  stats: {
    total_processed: number;
    marginal: number;
    non_marginal: number;
    active_products: number;
    out_of_stock: number;
  };
  processedAt: string;
  requestId: string;
}

export interface CatalogFilter {
  search?: string;
  category?: string;
  manufacturer?: string;
  appearance?: string;
  functionality?: string;
  boxed?: string;
  color?: string;
  priceMin?: number;
  priceMax?: number;
  isActive?: boolean;
  inStock?: boolean;
  // Filtres dynamiques
  dynamicFilters?: Record<string, any>;
}

export interface CatalogSortOptions {
  field: 'product_name' | 'price' | 'price_dbc' | 'quantity' | 'created_at' | 'updated_at';
  direction: 'asc' | 'desc';
}

export interface PaginatedCatalogResponse {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
} 