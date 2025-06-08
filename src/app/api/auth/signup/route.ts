import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

// Fonction helper pour vérifier supabaseAdmin
function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Configuration Supabase admin manquante - vérifiez SUPABASE_SERVICE_ROLE_KEY dans .env.local');
  }
  return supabaseAdmin;
}

export async function POST(request: NextRequest) {
  try {
    console.log('📝 Début inscription utilisateur...');
    
    const admin = getSupabaseAdmin();
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

    // 2. Créer l'entrée dans la table users
    const userData = {
      id: authData.user.id, // Utiliser le même ID que l'auth
      email,
      company_name,
      contact_name,
      phone,
      address: address || null,
      role: 'client',
      is_active: true,
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

    console.log('✅ Utilisateur créé dans la table users');

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        company_name,
        contact_name
      },
      message: 'Compte créé avec succès'
    });

  } catch (error: any) {
    console.error('❌ Erreur inscription:', error);
    return NextResponse.json({
      error: error.message || 'Erreur lors de l\'inscription'
    }, { status: 500 });
  }
} 