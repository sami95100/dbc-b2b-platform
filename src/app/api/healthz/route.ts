import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { withRequestContext } from '@/middleware/request-context';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  requestId: string;
  services: {
    database: ServiceHealth;
    auth: ServiceHealth;
    storage: ServiceHealth;
    api: ServiceHealth;
  };
  metrics: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    responseTime: number;
  };
  version: string;
  environment: string;
}

interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
  details?: any;
}

export async function GET(request: NextRequest) {
  return withRequestContext(request, async (context) => {
    const startTime = Date.now();
    
    try {
      // Tester tous les services en parallèle
      const [databaseHealth, authHealth, storageHealth, apiHealth] = await Promise.allSettled([
        checkDatabaseHealth(),
        checkAuthHealth(),
        checkStorageHealth(),
        checkApiHealth()
      ]);

      const services = {
        database: getServiceResult(databaseHealth),
        auth: getServiceResult(authHealth),
        storage: getServiceResult(storageHealth),
        api: getServiceResult(apiHealth)
      };

      // Déterminer le statut global
      const overallStatus = determineOverallStatus(services);
      
      // Calculer les métriques
      const metrics = await calculateMetrics(startTime);

      const healthStatus: HealthStatus = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
        services,
        metrics,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'unknown'
      };

      // Retourner le code de statut approprié
      const statusCode = overallStatus === 'healthy' ? 200 : 
                        overallStatus === 'degraded' ? 200 : 503;

      return NextResponse.json(healthStatus, { status: statusCode });

    } catch (error) {
      // En cas d'erreur critique
      const criticalHealth: HealthStatus = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
        services: {
          database: { status: 'unhealthy', error: 'Health check failed' },
          auth: { status: 'unhealthy', error: 'Health check failed' },
          storage: { status: 'unhealthy', error: 'Health check failed' },
          api: { status: 'unhealthy', error: 'Health check failed' }
        },
        metrics: {
          uptime: 0,
          memory: { used: 0, total: 0, percentage: 0 },
          responseTime: Date.now() - startTime
        },
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'unknown'
      };

      return NextResponse.json(criticalHealth, { status: 503 });
    }
  });
}

async function checkDatabaseHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    // Test de connexion simple
    const { data, error } = await supabase
      .from('products')
      .select('count')
      .limit(1);

    if (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }

    // Test de performance (doit répondre en moins de 1s)
    const responseTime = Date.now() - startTime;
    const status = responseTime < 1000 ? 'healthy' : 'degraded';

    return {
      status,
      responseTime,
      details: {
        connection: 'ok',
        performanceThreshold: '1000ms'
      }
    };

  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: (error as Error).message
    };
  }
}

async function checkAuthHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    // Vérifier que l'auth Supabase répond
    const { data, error } = await supabase.auth.getSession();
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      return {
        status: 'degraded',
        responseTime,
        error: error.message
      };
    }

    return {
      status: 'healthy',
      responseTime,
      details: {
        provider: 'supabase',
        session: data.session ? 'active' : 'none'
      }
    };

  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: (error as Error).message
    };
  }
}

async function checkStorageHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    // Test basique du storage Supabase
    const { data, error } = await supabase.storage.listBuckets();
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      return {
        status: 'degraded',
        responseTime,
        error: error.message
      };
    }

    return {
      status: 'healthy',
      responseTime,
      details: {
        buckets: data?.length || 0
      }
    };

  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: (error as Error).message
    };
  }
}

async function checkApiHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    // Vérifier les variables d'environnement critiques
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: `Missing environment variables: ${missingVars.join(', ')}`
      };
    }

    return {
      status: 'healthy',
      responseTime: Date.now() - startTime,
      details: {
        environment: process.env.NODE_ENV,
        nextjsVersion: '14.1.0'
      }
    };

  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: (error as Error).message
    };
  }
}

function getServiceResult(result: PromiseSettledResult<ServiceHealth>): ServiceHealth {
  if (result.status === 'fulfilled') {
    return result.value;
  } else {
    return {
      status: 'unhealthy',
      error: result.reason?.message || 'Service check failed'
    };
  }
}

function determineOverallStatus(services: Record<string, ServiceHealth>): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(services).map(service => service.status);
  
  if (statuses.includes('unhealthy')) {
    return 'unhealthy';
  }
  
  if (statuses.includes('degraded')) {
    return 'degraded';
  }
  
  return 'healthy';
}

async function calculateMetrics(startTime: number) {
  const used = process.memoryUsage();
  
  return {
    uptime: process.uptime(),
    memory: {
      used: Math.round(used.heapUsed / 1024 / 1024), // MB
      total: Math.round(used.heapTotal / 1024 / 1024), // MB
      percentage: Math.round((used.heapUsed / used.heapTotal) * 100)
    },
    responseTime: Date.now() - startTime
  };
} 