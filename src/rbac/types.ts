// Types pour le système RBAC
export enum Role {
  ADMIN = 'admin',
  CLIENT = 'client'
}

export enum Permission {
  // Permissions Catalogue
  CATALOG_READ = 'catalog:read',
  CATALOG_WRITE = 'catalog:write',
  CATALOG_IMPORT = 'catalog:import',
  
  // Permissions Commandes
  ORDER_READ_OWN = 'order:read:own',
  ORDER_READ_ALL = 'order:read:all',
  ORDER_CREATE = 'order:create',
  ORDER_UPDATE_OWN = 'order:update:own',
  ORDER_UPDATE_ALL = 'order:update:all',
  ORDER_DELETE_OWN = 'order:delete:own',
  ORDER_DELETE_ALL = 'order:delete:all',
  ORDER_EXPORT = 'order:export',
  
  // Permissions Utilisateurs
  USER_READ_ALL = 'user:read:all',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  
  // Permissions Métriques
  METRICS_READ = 'metrics:read',
  
  // Permissions Système
  SYSTEM_HEALTH = 'system:health',
  SYSTEM_LOGS = 'system:logs'
}

export enum Resource {
  CATALOG = 'catalog',
  ORDER = 'order',
  USER = 'user',
  METRICS = 'metrics',
  SYSTEM = 'system'
}

export interface RolePermissions {
  role: Role;
  permissions: Permission[];
}

export interface User {
  id: string;
  email: string;
  role: Role;
  company_name?: string;
  contact_name?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthContext {
  user: User | null;
  permissions: Permission[];
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  canAccessResource: (resource: Resource, action: string) => boolean;
}

export interface RequestContext {
  requestId: string;
  user: User | null;
  permissions: Permission[];
  timestamp: Date;
  ip?: string;
  userAgent?: string;
} 