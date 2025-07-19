import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Compteurs de métriques en mémoire (simplifié pour démo)
// En production, utiliser un registry Prometheus approprié
let metrics = {
  http_requests_total: new Map<string, number>(),
  http_request_duration_seconds: new Map<string, number[]>(),
  orders_created_total: 0,
  catalog_import_total: 0,
  catalog_import_failures_total: 0,
  database_connection_errors_total: 0,
  health_status: 1, // 1 = healthy, 0 = unhealthy
  active_users: 0,
  cart_abandonment_rate: 0
};

export async function GET(request: NextRequest) {
  try {
    // Collecter les métriques en temps réel
    const businessMetrics = await collectBusinessMetrics();
    const systemMetrics = await collectSystemMetrics();
    
    // Format Prometheus
    const prometheusMetrics = formatPrometheusMetrics({
      ...businessMetrics,
      ...systemMetrics
    });

    return new NextResponse(prometheusMetrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'
      }
    });

  } catch (error) {
    console.error('Error collecting metrics:', error);
    
    // Retourner des métriques minimales en cas d'erreur
    const errorMetrics = `
# HELP dbc_metrics_collection_errors_total Total number of metrics collection errors
# TYPE dbc_metrics_collection_errors_total counter
dbc_metrics_collection_errors_total 1

# HELP dbc_health_status Current health status (1=healthy, 0=unhealthy)
# TYPE dbc_health_status gauge
dbc_health_status 0
`;

    return new NextResponse(errorMetrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'
      }
    });
  }
}

async function collectBusinessMetrics() {
  try {
    // Métriques des commandes (dernières 24h)
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (ordersError) throw ordersError;

    // Métriques du catalogue
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, is_active, quantity')
      .limit(1000);

    if (productsError) throw productsError;

    // Calculer les métriques
    const ordersCreated24h = orders?.length || 0;
    const activeProducts = products?.filter(p => p.is_active).length || 0;
    const outOfStockProducts = products?.filter(p => p.quantity === 0).length || 0;
    
    // Statuts des commandes
    const ordersByStatus = {
      draft: orders?.filter(o => o.status === 'draft').length || 0,
      validated: orders?.filter(o => o.status === 'validated').length || 0,
      shipping: orders?.filter(o => o.status === 'shipping').length || 0,
      completed: orders?.filter(o => o.status === 'completed').length || 0
    };

    return {
      orders_created_24h: ordersCreated24h,
      orders_by_status: ordersByStatus,
      active_products: activeProducts,
      out_of_stock_products: outOfStockProducts,
      total_products: products?.length || 0
    };

  } catch (error) {
    console.error('Error collecting business metrics:', error);
    return {
      orders_created_24h: 0,
      orders_by_status: { draft: 0, validated: 0, shipping: 0, completed: 0 },
      active_products: 0,
      out_of_stock_products: 0,
      total_products: 0
    };
  }
}

async function collectSystemMetrics() {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  return {
    memory_usage: {
      heap_used: memUsage.heapUsed,
      heap_total: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss
    },
    uptime_seconds: uptime,
    nodejs_version: process.version,
    cpu_usage: process.cpuUsage()
  };
}

function formatPrometheusMetrics(data: any): string {
  const timestamp = Date.now();
  
  return `
# HELP dbc_orders_created_24h_total Total orders created in last 24 hours
# TYPE dbc_orders_created_24h_total gauge
dbc_orders_created_24h_total ${data.orders_created_24h} ${timestamp}

# HELP dbc_orders_by_status Orders grouped by status
# TYPE dbc_orders_by_status gauge
dbc_orders_by_status{status="draft"} ${data.orders_by_status.draft} ${timestamp}
dbc_orders_by_status{status="validated"} ${data.orders_by_status.validated} ${timestamp}
dbc_orders_by_status{status="shipping"} ${data.orders_by_status.shipping} ${timestamp}
dbc_orders_by_status{status="completed"} ${data.orders_by_status.completed} ${timestamp}

# HELP dbc_products_total Total number of products
# TYPE dbc_products_total gauge
dbc_products_total ${data.total_products} ${timestamp}

# HELP dbc_products_active Active products in catalog
# TYPE dbc_products_active gauge
dbc_products_active ${data.active_products} ${timestamp}

# HELP dbc_products_out_of_stock Products out of stock
# TYPE dbc_products_out_of_stock gauge
dbc_products_out_of_stock ${data.out_of_stock_products} ${timestamp}

# HELP dbc_memory_usage_bytes Memory usage in bytes
# TYPE dbc_memory_usage_bytes gauge
dbc_memory_usage_bytes{type="heap_used"} ${data.memory_usage.heap_used} ${timestamp}
dbc_memory_usage_bytes{type="heap_total"} ${data.memory_usage.heap_total} ${timestamp}
dbc_memory_usage_bytes{type="external"} ${data.memory_usage.external} ${timestamp}
dbc_memory_usage_bytes{type="rss"} ${data.memory_usage.rss} ${timestamp}

# HELP dbc_uptime_seconds Application uptime in seconds
# TYPE dbc_uptime_seconds gauge
dbc_uptime_seconds ${data.uptime_seconds} ${timestamp}

# HELP dbc_health_status Current health status (1=healthy, 0=unhealthy)
# TYPE dbc_health_status gauge
dbc_health_status 1 ${timestamp}

# HELP dbc_nodejs_info Node.js version info
# TYPE dbc_nodejs_info gauge
dbc_nodejs_info{version="${data.nodejs_version}"} 1 ${timestamp}
`.trim();
}

// Fonction utilitaire pour incrémenter les compteurs (à utiliser dans d'autres routes)
export function incrementCounter(metric: string, labels: Record<string, string> = {}) {
  const key = `${metric}${JSON.stringify(labels)}`;
  const current = metrics.http_requests_total.get(key) || 0;
  metrics.http_requests_total.set(key, current + 1);
}

// Fonction utilitaire pour enregistrer la durée des requêtes
export function recordDuration(metric: string, duration: number, labels: Record<string, string> = {}) {
  const key = `${metric}${JSON.stringify(labels)}`;
  const durations = metrics.http_request_duration_seconds.get(key) || [];
  durations.push(duration);
  
  // Garder seulement les 1000 dernières mesures pour éviter la fuite mémoire
  if (durations.length > 1000) {
    durations.shift();
  }
  
  metrics.http_request_duration_seconds.set(key, durations);
} 