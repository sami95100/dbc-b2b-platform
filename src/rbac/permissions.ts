import { Role, Permission, RolePermissions, User } from './types';

// Matrice des permissions par rôle
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    // Toutes les permissions pour l'admin
    Permission.CATALOG_READ,
    Permission.CATALOG_WRITE,
    Permission.CATALOG_IMPORT,
    Permission.ORDER_READ_ALL,
    Permission.ORDER_CREATE,
    Permission.ORDER_UPDATE_ALL,
    Permission.ORDER_DELETE_ALL,
    Permission.ORDER_EXPORT,
    Permission.USER_READ_ALL,
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.METRICS_READ,
    Permission.SYSTEM_HEALTH,
    Permission.SYSTEM_LOGS
  ],
  [Role.CLIENT]: [
    // Permissions limitées pour le client
    Permission.CATALOG_READ,
    Permission.ORDER_READ_OWN,
    Permission.ORDER_CREATE,
    Permission.ORDER_UPDATE_OWN,
    Permission.ORDER_DELETE_OWN
  ]
};

/**
 * Obtient les permissions pour un rôle donné
 */
export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Vérifie si un utilisateur a une permission spécifique
 */
export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user || !user.is_active) return false;
  
  const userPermissions = getPermissionsForRole(user.role);
  return userPermissions.includes(permission);
}

/**
 * Vérifie si un utilisateur a au moins une des permissions données
 */
export function hasAnyPermission(user: User | null, permissions: Permission[]): boolean {
  if (!user || !user.is_active) return false;
  
  const userPermissions = getPermissionsForRole(user.role);
  return permissions.some(permission => userPermissions.includes(permission));
}

/**
 * Vérifie si un utilisateur peut accéder à une ressource spécifique
 */
export function canAccessResource(user: User | null, resource: string, action: string): boolean {
  if (!user || !user.is_active) return false;
  
  const permission = `${resource}:${action}` as Permission;
  return hasPermission(user, permission);
}

/**
 * Vérifie si un utilisateur peut accéder à ses propres ressources ou toutes les ressources
 */
export function canAccessOwnOrAll(user: User | null, resource: string, action: string, isOwn: boolean = false): boolean {
  if (!user || !user.is_active) return false;
  
  // Vérifier d'abord la permission "all"
  const allPermission = `${resource}:${action}:all` as Permission;
  if (hasPermission(user, allPermission)) return true;
  
  // Si c'est sa propre ressource, vérifier la permission "own"
  if (isOwn) {
    const ownPermission = `${resource}:${action}:own` as Permission;
    return hasPermission(user, ownPermission);
  }
  
  return false;
}

/**
 * Filtre les données selon les permissions de l'utilisateur
 */
export function filterByPermissions<T extends { user_id?: string }>(
  user: User | null,
  data: T[],
  resource: string
): T[] {
  if (!user || !user.is_active) return [];
  
  // Si l'utilisateur peut voir toutes les ressources
  if (canAccessResource(user, resource, 'read:all')) {
    return data;
  }
  
  // Si l'utilisateur peut voir seulement ses propres ressources
  if (canAccessResource(user, resource, 'read:own')) {
    return data.filter(item => item.user_id === user.id);
  }
  
  return [];
}

/**
 * Middleware de vérification des permissions
 */
export function requirePermission(permission: Permission) {
  return (user: User | null) => {
    if (!hasPermission(user, permission)) {
      throw new Error(`Permission denied: ${permission} required`);
    }
  };
}

/**
 * Middleware de vérification des permissions avec ownership
 */
export function requirePermissionWithOwnership(
  resource: string, 
  action: string, 
  checkOwnership: (user: User, resourceId: string) => Promise<boolean>
) {
  return async (user: User | null, resourceId: string) => {
    if (!user || !user.is_active) {
      throw new Error('Authentication required');
    }
    
    // Vérifier la permission "all" d'abord
    const allPermission = `${resource}:${action}:all` as Permission;
    if (hasPermission(user, allPermission)) {
      return;
    }
    
    // Vérifier la permission "own" avec ownership
    const ownPermission = `${resource}:${action}:own` as Permission;
    if (hasPermission(user, ownPermission)) {
      const isOwner = await checkOwnership(user, resourceId);
      if (isOwner) {
        return;
      }
    }
    
    throw new Error(`Permission denied: ${resource}:${action} required`);
  };
} 