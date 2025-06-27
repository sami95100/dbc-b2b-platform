'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { User } from './supabase';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isClient: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setUser(null);
        return;
      }

      // Récupérer le profil utilisateur
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !profile) {
        console.error('Erreur profil:', error);
        setUser(null);
        return;
      }

      // Stocker le profil même si le compte n'est pas actif
      // Cela permettra de gérer la redirection vers la page d'attente
      setUser(profile);
    } catch (error) {
      console.error('Erreur refreshUser:', error);
      setUser(null);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      // Nettoyer le localStorage
      localStorage.removeItem('currentDraftOrder');
      localStorage.removeItem('draftOrders');
    } catch (error) {
      console.error('Erreur signOut:', error);
    }
  };

  useEffect(() => {
    // Initial load
    refreshUser().finally(() => setLoading(false));

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'SIGNED_IN' && session) {
        refreshUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isClient: user?.role === 'client',
    loading,
    signOut,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// HOC pour protéger les routes selon le rôle
export function withAuth<T extends {}>(
  WrappedComponent: React.ComponentType<T>,
  requiredRole?: 'admin' | 'client'
) {
  return function AuthenticatedComponent(props: T) {
    const { user, isAuthenticated, loading } = useAuth();
    const [timeoutReached, setTimeoutReached] = React.useState(false);
    
    // Timeout de sécurité pour éviter d'être bloqué sur la page de chargement
    React.useEffect(() => {
      if (loading) {
        const timer = setTimeout(() => {
          console.log('⏰ Timeout d\'authentification atteint, redirection...');
          setTimeoutReached(true);
        }, 10000); // 10 secondes
        
        return () => clearTimeout(timer);
      }
    }, [loading]);
    
    // Debug: Afficher l'état d'authentification
    console.log('🔍 withAuth Debug:', {
      loading,
      isAuthenticated,
      user: user ? { id: user.id, role: user.role, is_active: user.is_active } : null,
      userRole: user?.role,
      requiredRole,
      hasAccess: user?.role === requiredRole || !requiredRole,
      timeoutReached
    });
    
    // Si le timeout est atteint, rediriger vers login
    if (timeoutReached) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return null;
    }
    
    if (loading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dbc-light-green mx-auto mb-4"></div>
            <p className="text-gray-600">Vérification de l'authentification...</p>
            <p className="text-xs text-gray-400 mt-2">Si cette page persiste, rechargez votre navigateur</p>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      console.log('❌ Utilisateur non authentifié, redirection vers /login');
      // Redirection côté client
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return null;
    }

    // Vérifier si l'utilisateur est authentifié mais son compte n'est pas actif
    if (user && !user.is_active) {
      console.log('⏳ Compte non validé, redirection vers page d\'attente');
      if (typeof window !== 'undefined') {
        window.location.href = '/pending-validation';
      }
      return null;
    }

    if (requiredRole && user?.role !== requiredRole) {
      console.log('❌ Rôle insuffisant:', { userRole: user?.role, requiredRole });
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="text-red-500 text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Accès non autorisé</h1>
            <p className="text-gray-600 mb-6">
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </p>
            <button
              onClick={() => window.location.href = user?.role === 'admin' ? '/admin' : '/catalog'}
              className="bg-dbc-light-green text-white px-6 py-2 rounded-lg hover:bg-dbc-dark-green transition-colors"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      );
    }

    console.log('✅ Accès autorisé à la page');
    return <WrappedComponent {...props} />;
  };
} 