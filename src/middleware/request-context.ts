import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { User, RequestContext } from '@/rbac/types';

// Headers personnalisés
export const REQUEST_ID_HEADER = 'x-request-id';
export const USER_CONTEXT_HEADER = 'x-user-context';

/**
 * Génère un ID de requête unique
 */
export function generateRequestId(): string {
  return uuidv4();
}

/**
 * Extrait le contexte utilisateur de la requête
 */
export async function extractUserContext(request: NextRequest): Promise<User | null> {
  try {
    // Récupérer le token depuis les cookies ou headers
    const authHeader = request.headers.get('authorization');
    const authCookie = request.cookies.get('auth-token');
    
    if (!authHeader && !authCookie) {
      return null;
    }
    
    // TODO: Implémenter la vérification JWT avec Supabase
    // Pour l'instant, retourner null
    return null;
  } catch (error) {
    console.error('Error extracting user context:', error);
    return null;
  }
}

/**
 * Crée le contexte de requête complet
 */
export function createRequestContext(
  requestId: string,
  user: User | null,
  request: NextRequest
): RequestContext {
  return {
    requestId,
    user,
    permissions: user ? [] : [], // TODO: Récupérer les permissions depuis RBAC
    timestamp: new Date(),
    ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  };
}

/**
 * Middleware pour ajouter le contexte de requête
 */
export async function withRequestContext(
  request: NextRequest,
  handler: (context: RequestContext) => Promise<NextResponse>
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const user = await extractUserContext(request);
  const context = createRequestContext(requestId, user, request);
  
  try {
    // Logger le début de la requête
    console.log(`[${requestId}] ${request.method} ${request.url}`, {
      requestId,
      method: request.method,
      url: request.url,
      userId: user?.id || 'anonymous',
      ip: context.ip,
      userAgent: context.userAgent,
      timestamp: context.timestamp.toISOString()
    });
    
    const response = await handler(context);
    
    // Ajouter l'ID de requête aux headers de réponse
    response.headers.set(REQUEST_ID_HEADER, requestId);
    
    // Logger la fin de la requête
    console.log(`[${requestId}] Response ${response.status}`, {
      requestId,
      status: response.status,
      duration: Date.now() - context.timestamp.getTime()
    });
    
    return response;
  } catch (error) {
    // Logger l'erreur avec le contexte complet
    console.error(`[${requestId}] Error:`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        method: request.method,
        url: request.url,
        userId: user?.id || 'anonymous',
        ip: context.ip
      }
    });
    
    // Retourner une erreur 500 avec l'ID de requête
    const errorResponse = NextResponse.json(
      {
        error: 'Internal server error',
        requestId,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
    
    errorResponse.headers.set(REQUEST_ID_HEADER, requestId);
    return errorResponse;
  }
}

/**
 * Hook pour récupérer l'ID de requête côté client
 */
export function useRequestId(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Récupérer l'ID depuis le dernier appel API
  return sessionStorage.getItem('last-request-id') || null;
}

/**
 * Utilitaire pour logger les erreurs avec contexte
 */
export function logError(
  requestId: string,
  error: Error,
  context?: Record<string, any>
) {
  console.error(`[${requestId}] Error:`, {
    requestId,
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
}

/**
 * Utilitaire pour logger les informations avec contexte
 */
export function logInfo(
  requestId: string,
  message: string,
  data?: Record<string, any>
) {
  console.log(`[${requestId}] ${message}`, {
    requestId,
    message,
    data,
    timestamp: new Date().toISOString()
  });
}

/**
 * Utilitaire pour logger les métriques business
 */
export function logBusinessMetric(
  requestId: string,
  metric: string,
  value: number,
  tags?: Record<string, string>
) {
  console.log(`[${requestId}] METRIC: ${metric}`, {
    requestId,
    metric,
    value,
    tags,
    timestamp: new Date().toISOString()
  });
} 