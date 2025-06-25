import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  // Test avec une variable publique temporaire
  const allEnvKeys = Object.keys(process.env);
  const supabaseKeys = allEnvKeys.filter(key => key.includes('SUPABASE'));
  
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    
    // Variables existantes
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
    SUPABASE_SERVICE: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
    
    // Test de variations possibles
    SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE ? 'SET' : 'MISSING',
    SUPABASE_ADMIN_KEY: process.env.SUPABASE_ADMIN_KEY ? 'SET' : 'MISSING',
    
    // Toutes les clés d'environnement
    ALL_ENV_KEYS: allEnvKeys,
    SUPABASE_KEYS_ONLY: supabaseKeys,
    
    // Nombre total de variables
    TOTAL_ENV_VARS: allEnvKeys.length,
    
    // Variables qui contiennent "SERVICE"
    SERVICE_KEYS: allEnvKeys.filter(key => key.includes('SERVICE')),
    
    // Variables qui contiennent "ROLE"
    ROLE_KEYS: allEnvKeys.filter(key => key.includes('ROLE')),
    
    // Test si la variable existe avec un autre nom
    TEST_VARIATIONS: {
      'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY ? 'FOUND' : 'NOT_FOUND',
      'SUPABASE_SERVICE_KEY': process.env.SUPABASE_SERVICE_KEY ? 'FOUND' : 'NOT_FOUND',
      'SUPABASE_ADMIN_KEY': process.env.SUPABASE_ADMIN_KEY ? 'FOUND' : 'NOT_FOUND',
    }
  };

  return NextResponse.json(envVars, { status: 200 });
} 