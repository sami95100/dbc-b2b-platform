import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Test variables d\'environnement...');
    
    // Vérifier toutes les variables d'environnement
    const envVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };

    // Logger les variables (masquer les clés sensibles)
    console.log('Variables d\'environnement:');
    Object.entries(envVars).forEach(([key, value]) => {
      if (value) {
        if (key.includes('KEY')) {
          console.log(`✅ ${key}: ${value.substring(0, 20)}...${value.substring(value.length - 10)}`);
        } else {
          console.log(`✅ ${key}: ${value}`);
        }
      } else {
        console.log(`❌ ${key}: MANQUANT`);
      }
    });

    // Vérifier la création du client Supabase
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const isServiceKeyValid = supabaseServiceKey && supabaseServiceKey.length > 0;
    
    console.log(`Clé service: ${isServiceKeyValid ? 'Présente' : 'Manquante'}`);
    
    // Test de création du client
    let clientCreated = false;
    try {
      if (isServiceKeyValid) {
        const { createClient } = await import('@supabase/supabase-js');
        const testClient = createClient(
          envVars.NEXT_PUBLIC_SUPABASE_URL!,
          supabaseServiceKey,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        );
        clientCreated = !!testClient;
        console.log(`Client Supabase admin: ${clientCreated ? 'Créé avec succès' : 'Échec création'}`);
      }
    } catch (error) {
      console.error('Erreur création client:', error);
    }

    return NextResponse.json({
      success: true,
      environment: process.env.NODE_ENV,
      variables: {
        NEXT_PUBLIC_SUPABASE_URL: envVars.NEXT_PUBLIC_SUPABASE_URL ? 'Configuré' : 'Manquant',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configuré' : 'Manquant',
        SUPABASE_SERVICE_ROLE_KEY: envVars.SUPABASE_SERVICE_ROLE_KEY ? 'Configuré' : 'Manquant',
      },
      checks: {
        serviceKeyPresent: isServiceKeyValid,
        clientCreated: clientCreated,
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur test environnement:', error);
    return NextResponse.json({
      error: error.message || 'Erreur lors du test'
    }, { status: 500 });
  }
} 