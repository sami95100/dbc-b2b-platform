import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

// Fonction helper pour vérifier supabaseAdmin
function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Configuration Supabase admin manquante - vérifiez SUPABASE_SERVICE_ROLE_KEY dans .env.local');
  }
  return supabaseAdmin;
}

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    // Récupérer tous les utilisateurs avec le rôle 'client'
    const { data: clients, error } = await supabaseAdmin
      .from('users')
      .select('id, email, contact_name, company_name, phone, is_active')
      .eq('role', 'client')
      .eq('is_active', true)
      .order('company_name', { ascending: true });

    if (error) {
      console.error('❌ Erreur récupération clients:', error);
      return NextResponse.json({
        error: 'Erreur lors de la récupération des clients',
        details: error.message || error
      }, { status: 500 });
    }

    return NextResponse.json({
      clients: clients || [],
      count: clients?.length || 0
    });

  } catch (error) {
    console.error('❌ Erreur générale:', error);
    return NextResponse.json({
      error: 'Erreur serveur'
    }, { status: 500 });
  }
} 