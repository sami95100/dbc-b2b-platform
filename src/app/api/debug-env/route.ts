import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
    SUPABASE_SERVICE: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
    ALL_ENV_KEYS: Object.keys(process.env).filter(key => key.includes('SUPABASE')),
  };

  return NextResponse.json(envVars);
} 