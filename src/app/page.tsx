'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { DEFAULT_ROUTES } from '../lib/routes-config';

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Redirection selon le rôle
    const redirectPath = user?.role ? DEFAULT_ROUTES[user.role] : '/login';
    router.push(redirectPath);
  }, [router, isAuthenticated, user, loading]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-dbc-light-green mx-auto mb-4"></div>
        <p className="text-gray-600">
          {loading ? 'Vérification de l\'authentification...' : 'Redirection en cours...'}
        </p>
      </div>
    </div>
  );
} 