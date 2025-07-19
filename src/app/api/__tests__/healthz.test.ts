/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '../healthz/route';

// Mock Supabase pour les tests
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn().mockResolvedValue({ 
          data: [{ count: 1 }], 
          error: null 
        })
      }))
    })),
    auth: {
      getSession: jest.fn().mockResolvedValue({ 
        data: { session: null }, 
        error: null 
      })
    },
    storage: {
      listBuckets: jest.fn().mockResolvedValue({ 
        data: [], 
        error: null 
      })
    }
  }
}));

// Mock du middleware de contexte
jest.mock('@/middleware/request-context', () => ({
  withRequestContext: jest.fn((request, handler) => {
    const mockContext = {
      requestId: 'test-request-id',
      user: null,
      permissions: [],
      timestamp: new Date(),
      ip: '127.0.0.1',
      userAgent: 'test-agent'
    };
    return handler(mockContext);
  })
}));

describe('/api/healthz', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    // Créer une requête mock
    mockRequest = new NextRequest('http://localhost:3000/api/healthz');
    
    // Reset des mocks
    jest.clearAllMocks();
  });

  describe('GET /api/healthz', () => {
    it('should return healthy status when all services are working', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        status: 'healthy',
        requestId: 'test-request-id',
        services: {
          database: { status: 'healthy' },
          auth: { status: 'healthy' },
          storage: { status: 'healthy' },
          api: { status: 'healthy' }
        }
      });

      // Vérifier la structure des métriques
      expect(data.metrics).toHaveProperty('uptime');
      expect(data.metrics).toHaveProperty('memory');
      expect(data.metrics).toHaveProperty('responseTime');
      expect(data.metrics.memory).toHaveProperty('used');
      expect(data.metrics.memory).toHaveProperty('total');
      expect(data.metrics.memory).toHaveProperty('percentage');

      // Vérifier les métadonnées
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('environment');
      expect(data).toHaveProperty('timestamp');
    });

    it('should return degraded status when some services are slow', async () => {
      // Mock une réponse lente de la base de données
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from.mockImplementation(() => ({
        select: () => ({
          limit: () => new Promise(resolve => {
            setTimeout(() => {
              resolve({ data: [{ count: 1 }], error: null });
            }, 1500); // Plus de 1000ms = degraded
          })
        })
      }));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200); // Toujours 200 pour degraded
      expect(data.status).toBe('degraded');
      expect(data.services.database.status).toBe('degraded');
    });

    it('should return unhealthy status when database fails', async () => {
      // Mock une erreur de base de données
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from.mockImplementation(() => ({
        select: () => ({
          limit: () => Promise.resolve({ 
            data: null, 
            error: { message: 'Connection failed' } 
          })
        })
      }));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(503); // Service Unavailable pour unhealthy
      expect(data.status).toBe('unhealthy');
      expect(data.services.database.status).toBe('unhealthy');
      expect(data.services.database.error).toBe('Connection failed');
    });

    it('should handle auth service errors gracefully', async () => {
      // Mock une erreur d'auth
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Auth service unavailable' }
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.services.auth.status).toBe('degraded');
      expect(data.services.auth.error).toBe('Auth service unavailable');
    });

    it('should handle storage service errors gracefully', async () => {
      // Mock une erreur de storage
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.storage.listBuckets.mockResolvedValue({
        data: null,
        error: { message: 'Storage unavailable' }
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.services.storage.status).toBe('degraded');
      expect(data.services.storage.error).toBe('Storage unavailable');
    });

    it('should check environment variables', async () => {
      // Sauvegarder les variables originales
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      // Supprimer une variable critique
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.status).toBe('unhealthy');
      expect(data.services.api.status).toBe('unhealthy');
      expect(data.services.api.error).toContain('Missing environment variables');

      // Restaurer les variables
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
    });

    it('should include response time metrics', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.metrics.responseTime).toBeGreaterThan(0);
      expect(typeof data.metrics.responseTime).toBe('number');
    });

    it('should include memory usage metrics', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.metrics.memory.used).toBeGreaterThan(0);
      expect(data.metrics.memory.total).toBeGreaterThan(0);
      expect(data.metrics.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(data.metrics.memory.percentage).toBeLessThanOrEqual(100);
    });

    it('should include uptime metrics', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.metrics.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof data.metrics.uptime).toBe('number');
    });

    it('should handle critical errors and return 503', async () => {
      // Mock une exception critique
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Critical system failure');
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.requestId).toBe('test-request-id');
    });
  });

  describe('Service Health Checks', () => {
    it('should measure database response time', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.services.database).toHaveProperty('responseTime');
      expect(typeof data.services.database.responseTime).toBe('number');
      expect(data.services.database.responseTime).toBeGreaterThan(0);
    });

    it('should include service details', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.services.database.details).toEqual({
        connection: 'ok',
        performanceThreshold: '1000ms'
      });

      expect(data.services.auth.details).toHaveProperty('provider');
      expect(data.services.auth.details.provider).toBe('supabase');

      expect(data.services.api.details).toHaveProperty('environment');
      expect(data.services.api.details).toHaveProperty('nextjsVersion');
    });
  });

  describe('Error Handling', () => {
    it('should handle Promise.allSettled rejections', async () => {
      // Mock pour que tous les services échouent
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database error');
      });
      mockSupabase.auth.getSession.mockRejectedValue(new Error('Auth error'));
      mockSupabase.storage.listBuckets.mockRejectedValue(new Error('Storage error'));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      
      // Tous les services doivent être marqués comme unhealthy
      expect(data.services.database.status).toBe('unhealthy');
      expect(data.services.auth.status).toBe('unhealthy');
      expect(data.services.storage.status).toBe('unhealthy');
    });
  });
}); 