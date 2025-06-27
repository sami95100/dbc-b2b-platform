import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Créer le client admin directement dans la fonction
function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('🔧 Création client Supabase Admin:');
  console.log(`  - URL: ${supabaseUrl}`);
  console.log(`  - Service Key présente: ${supabaseServiceKey ? 'OUI' : 'NON'}`);
  
  if (!supabaseServiceKey) {
    throw new Error('Configuration Supabase admin manquante - vérifiez SUPABASE_SERVICE_ROLE_KEY dans .env.local');
  }
  
  if (!supabaseUrl) {
    throw new Error('Configuration Supabase URL manquante - vérifiez NEXT_PUBLIC_SUPABASE_URL dans .env.local');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('📝 Début inscription utilisateur...');
    
    const admin = createSupabaseAdminClient();
    const body = await request.json();
    
    const {
      email,
      password,
      company_name,
      contact_name,
      phone,
      address
    } = body;

    // Validation des champs obligatoires
    if (!email || !password || !company_name || !contact_name || !phone) {
      return NextResponse.json({
        error: 'Tous les champs obligatoires doivent être remplis'
      }, { status: 400 });
    }

    // 1. Créer l'utilisateur avec l'API Admin
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmer l'email automatiquement
    });

    if (authError) {
      console.error('❌ Erreur création auth:', authError);
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error('Erreur lors de la création du compte');
    }

    console.log('✅ Utilisateur auth créé:', authData.user.id);

    // 2. Créer l'entrée dans la table users - AVEC is_active: false pour validation admin
    const userData = {
      id: authData.user.id, // Utiliser le même ID que l'auth
      email,
      company_name,
      contact_name,
      phone,
      address: address || null,
      role: 'client',
      is_active: false, // 🔒 NOUVEAU : Compte en attente de validation admin
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: userError } = await admin
      .from('users')
      .insert([userData]);

    if (userError) {
      console.error('❌ Erreur création utilisateur:', userError);
      
      // Si erreur, supprimer l'utilisateur auth créé
      await admin.auth.admin.deleteUser(authData.user.id);
      
      throw new Error(userError.message);
    }

    console.log('✅ Utilisateur créé dans la table users (en attente de validation)');

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        company_name,
        contact_name,
        is_active: false // Indiquer que le compte est en attente
      },
      message: 'Inscription enregistrée avec succès. Votre compte est en attente de validation.',
      needs_validation: true // 🔔 Flag pour redirection vers page onboarding
    });

  } catch (error: any) {
    console.error('❌ Erreur inscription:', error);
    return NextResponse.json({
      error: error.message || 'Erreur lors de l\'inscription'
    }, { status: 500 });
  }
} 