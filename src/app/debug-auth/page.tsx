'use client';

import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { useState, useEffect } from 'react';

export default function DebugAuthPage() {
  const auth = useAuth();
  const [session, setSession] = useState<any>(null);
  const [rawUser, setRawUser] = useState<any>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session) {
        const { data: user } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setRawUser(user);
      }
    };
    getSession();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Authentification</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* État du contexte Auth */}
          <div className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-4 text-blue-600">Contexte Auth</h2>
            <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify({
                loading: auth.loading,
                isAuthenticated: auth.isAuthenticated,
                isAdmin: auth.isAdmin,
                isClient: auth.isClient,
                user: auth.user
              }, null, 2)}
            </pre>
          </div>

          {/* Session Supabase */}
          <div className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-4 text-green-600">Session Supabase</h2>
            <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>

          {/* Utilisateur brut */}
          <div className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-4 text-purple-600">Utilisateur DB</h2>
            <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(rawUser, null, 2)}
            </pre>
          </div>

          {/* Actions de test */}
          <div className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-4 text-red-600">Actions</h2>
            <div className="space-y-4">
              <button
                onClick={() => auth.refreshUser()}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
              >
                Refresh User
              </button>
              <button
                onClick={() => auth.signOut()}
                className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
              >
                Sign Out
              </button>
              <button
                onClick={() => window.location.href = '/admin'}
                className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
              >
                Aller vers /admin
              </button>
              <button
                onClick={() => window.location.href = '/catalog'}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700"
              >
                Aller vers /catalog
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 