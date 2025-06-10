// Configuration des routes et permissions par rôle

export interface RouteConfig {
  path: string;
  label: string;
  icon?: string;
  roles: ('admin' | 'client')[];
  showInNav?: boolean;
}

export const ROUTES: Record<string, RouteConfig> = {
  // Routes communes
  LOGIN: {
    path: '/login',
    label: 'Connexion',
    roles: ['admin', 'client'],
    showInNav: false
  },
  SIGNUP: {
    path: '/signup',
    label: 'Inscription',
    roles: ['admin', 'client'],
    showInNav: false
  },

  // Routes clients (accessibles aussi par l'admin)
  CATALOG: {
    path: '/catalog',
    label: 'Catalogue',
    icon: 'Package',
    roles: ['client', 'admin'],
    showInNav: true
  },
  CLIENT_ORDERS: {
    path: '/orders',
    label: 'Mes Commandes',
    icon: 'ShoppingCart',
    roles: ['client', 'admin'],
    showInNav: true
  },

  // Routes admin
  ADMIN_DASHBOARD: {
    path: '/admin',
    label: 'Tableau de bord',
    icon: 'BarChart3',
    roles: ['admin'],
    showInNav: true
  },
  ADMIN_CATALOG: {
    path: '/admin/catalog',
    label: 'Gestion Catalogue',
    icon: 'Package',
    roles: ['admin'],
    showInNav: true
  },
  ADMIN_ORDERS: {
    path: '/admin/orders',
    label: 'Commandes Clients',
    icon: 'ShoppingCart',
    roles: ['admin'],
    showInNav: true
  },
  ADMIN_CLIENTS: {
    path: '/admin/clients',
    label: 'Gestion Clients',
    icon: 'Users',
    roles: ['admin'],
    showInNav: true
  }
};

// Helper pour vérifier les permissions d'accès
export function hasAccess(userRole: 'admin' | 'client', routePath: string): boolean {
  const route = Object.values(ROUTES).find(r => r.path === routePath);
  return route ? route.roles.includes(userRole) : false;
}

// Helper pour obtenir les routes de navigation selon le rôle
export function getNavRoutes(userRole: 'admin' | 'client'): RouteConfig[] {
  return Object.values(ROUTES).filter(
    route => route.showInNav && route.roles.includes(userRole)
  );
}

// Routes de redirection par défaut selon le rôle
export const DEFAULT_ROUTES = {
  admin: '/admin',
  client: '/catalog'
};

// Pages qui nécessitent une authentification mais pas de rôle spécifique
export const PROTECTED_ROUTES = [
  '/catalog',
  '/orders',
  '/admin'
]; 