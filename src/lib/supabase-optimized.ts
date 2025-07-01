import { createClient } from '@supabase/supabase-js'

// Configuration Supabase optimisée pour les performances
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fake-project.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'

// Client principal optimisé
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Optimisations d'authentification
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Désactiver si pas nécessaire
    flowType: 'pkce',
  },
  global: {
    headers: {
      'cache-control': 'public, max-age=300', // Cache 5 minutes
    },
  },
  db: {
    schema: 'public',
  },
})

// Client admin optimisé pour les API routes
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          'cache-control': 'no-cache',
        },
      },
    })
  : null

// Cache en mémoire pour les requêtes fréquentes
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export function getCachedData<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > cached.ttl) {
    cache.delete(key);
    return null;
  }
  
  return cached.data as T;
}

export function setCachedData<T>(key: string, data: T, ttl = 300000): void { // 5 minutes par défaut
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

// Nettoyage périodique du cache
if (typeof window !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];
    cache.forEach((value, key) => {
      if (now - value.timestamp > value.ttl) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => cache.delete(key));
  }, 60000); // Nettoyer toutes les minutes
}

// Types optimisés (seulement les essentiels)
export interface Product {
  sku: string
  product_name: string
  appearance: string
  functionality: string
  quantity: number
  price_dbc: number
  is_active: boolean
}

export interface Order {
  id: string
  name: string
  status: 'draft' | 'validated' | 'shipping' | 'completed'
  status_label: string
  user_id?: string
  created_at: string
  total_amount: number
  total_items: number
}

export interface User {
  id: string
  email: string
  company_name?: string
  role: 'client' | 'admin'
  is_active: boolean
}

// Services optimisés avec cache
export const productService = {
  async getProducts(useCache = true): Promise<Product[]> {
    const cacheKey = 'products_all';
    
    if (useCache) {
      const cached = getCachedData<Product[]>(cacheKey);
      if (cached) return cached;
    }

    const { data, error } = await supabase
      .from('products')
      .select('sku, product_name, appearance, functionality, quantity, price_dbc, is_active')
      .eq('is_active', true)
      .order('product_name');

    if (error) throw error;
    
    if (useCache && data) {
      setCachedData(cacheKey, data, 300000); // Cache 5 minutes
    }
    
    return data || [];
  },

  async searchProducts(query: string): Promise<Product[]> {
    const cacheKey = `products_search_${query}`;
    const cached = getCachedData<Product[]>(cacheKey);
    if (cached) return cached;

    const { data, error } = await supabase
      .from('products')
      .select('sku, product_name, appearance, functionality, quantity, price_dbc, is_active')
      .eq('is_active', true)
      .or(`sku.ilike.%${query}%,product_name.ilike.%${query}%`)
      .limit(50);

    if (error) throw error;
    
    if (data) {
      setCachedData(cacheKey, data, 180000); // Cache 3 minutes pour les recherches
    }
    
    return data || [];
  },
};

export const orderService = {
  async getOrders(userId?: string, useCache = true): Promise<Order[]> {
    const cacheKey = `orders_${userId || 'all'}`;
    
    if (useCache) {
      const cached = getCachedData<Order[]>(cacheKey);
      if (cached) return cached;
    }

    let query = supabase
      .from('orders')
      .select('id, name, status, status_label, user_id, created_at, total_amount, total_items')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    if (useCache && data) {
      setCachedData(cacheKey, data, 120000); // Cache 2 minutes pour les commandes
    }
    
    return data || [];
  },
};

// Invalidation du cache
export function invalidateCache(pattern?: string) {
  if (pattern) {
    const keysToDelete: string[] = [];
    cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => cache.delete(key));
  } else {
    cache.clear();
  }
}