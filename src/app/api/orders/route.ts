import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';

// Fonction helper pour vérifier supabaseAdmin
function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Configuration Supabase admin manquante - vérifiez SUPABASE_SERVICE_ROLE_KEY dans .env.local');
  }
  return supabaseAdmin;
}

export async function GET(request: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    
    // Extraire les paramètres de l'URL
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const statusFilter = searchParams.get('status');
    const clientFilter = searchParams.get('client');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const quantityMin = searchParams.get('quantityMin');
    const quantityMax = searchParams.get('quantityMax');
    const amountMin = searchParams.get('amountMin');
    const amountMax = searchParams.get('amountMax');

    console.log('📦 API Orders - Récupération des commandes...', { 
      userId, 
      statusFilter, 
      clientFilter, 
      dateFrom, 
      dateTo, 
      quantityMin, 
      quantityMax, 
      amountMin, 
      amountMax 
    });

    // Vérifier le rôle de l'utilisateur si userId est fourni
    let isAdmin = false;
    if (userId) {
      const { data: userProfile, error: userError } = await admin
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (!userError && userProfile) {
        isAdmin = userProfile.role === 'admin';
        console.log('🔍 Rôle utilisateur:', userProfile.role, '- Admin:', isAdmin);
      }
    }

    // Commencer la requête
    let query = admin
      .from('orders')
      .select(`
        id,
        name,
        status,
        status_label,
        customer_ref,
        created_at,
        updated_at,
        total_amount,
        total_items,
        vat_type,
        user_id,
        users (
          id,
          company_name,
          contact_name,
          email
        ),
        order_items (
          id,
          sku,
          product_name,
          quantity,
          unit_price,
          total_price
        )
      `);

    // Filtrer par userId SEULEMENT si l'utilisateur n'est PAS admin
    if (userId && !isAdmin) {
      query = query.eq('user_id', userId);
      console.log('🔍 Filtrage par userId (utilisateur normal):', userId);
    } else if (isAdmin) {
      console.log('🔍 Admin détecté - affichage de TOUTES les commandes');
    }

    // Ajouter le filtre par statut si fourni
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
      console.log('🔍 Filtrage par statut:', statusFilter);
    }

    // Ajouter le filtre par client si fourni (recherche dans company_name et contact_name)
    if (clientFilter && clientFilter.trim() !== '') {
      // Note: Pour une recherche plus complexe, nous filtrerons côté client après récupération
      // car Supabase ne permet pas facilement de faire des recherches dans les relations jointes
      console.log('🔍 Filtrage par client côté serveur préparé:', clientFilter);
    }

    // Ajouter les filtres de dates
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
      console.log('🔍 Filtrage date début:', dateFrom);
    }
    
    if (dateTo) {
      // Ajouter 23:59:59 pour inclure toute la journée
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte('created_at', endDate.toISOString());
      console.log('🔍 Filtrage date fin:', endDate.toISOString());
    }

    // Ajouter les filtres de quantité
    if (quantityMin) {
      const minQty = parseInt(quantityMin);
      if (!isNaN(minQty)) {
        query = query.gte('total_items', minQty);
        console.log('🔍 Filtrage quantité min:', minQty);
      }
    }
    
    if (quantityMax) {
      const maxQty = parseInt(quantityMax);
      if (!isNaN(maxQty)) {
        query = query.lte('total_items', maxQty);
        console.log('🔍 Filtrage quantité max:', maxQty);
      }
    }

    // Ajouter les filtres de montant
    if (amountMin) {
      const minAmount = parseFloat(amountMin);
      if (!isNaN(minAmount)) {
        query = query.gte('total_amount', minAmount);
        console.log('🔍 Filtrage montant min:', minAmount);
      }
    }
    
    if (amountMax) {
      const maxAmount = parseFloat(amountMax);
      if (!isNaN(maxAmount)) {
        query = query.lte('total_amount', maxAmount);
        console.log('🔍 Filtrage montant max:', maxAmount);
      }
    }

    // Exécuter la requête
    const { data: orders, error } = await query.order('updated_at', { ascending: false });

    console.log('🔍 Requête Supabase orders:', {
      data: orders,
      error: error,
      count: orders?.length || 0
    });

    if (error) {
      console.error('❌ Erreur Supabase orders:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des commandes', details: error },
        { status: 500 }
      );
    }

    let ordersWithTracking = orders || [];
    
    if (orders) {
      // Extraire le tracking_number depuis customer_ref
      ordersWithTracking = orders.map(order => ({
        ...order,
        tracking_number: order.customer_ref?.startsWith('TRACKING:') 
          ? order.customer_ref.replace('TRACKING:', '') 
          : null
      }));

      // Filtrage côté serveur pour le client (après récupération des données jointes)
      if (clientFilter && clientFilter.trim() !== '') {
        const clientFilterLower = clientFilter.toLowerCase().trim();
        ordersWithTracking = ordersWithTracking.filter(order => {
          if (!order.users || Array.isArray(order.users)) return false;
          const user = order.users as any;
          const companyName = user.company_name?.toLowerCase() || '';
          const contactName = user.contact_name?.toLowerCase() || '';
          const email = user.email?.toLowerCase() || '';
          return companyName.includes(clientFilterLower) || 
                 contactName.includes(clientFilterLower) ||
                 email.includes(clientFilterLower);
        });
        console.log('🔍 Filtrage client appliqué:', clientFilter, 'Résultats:', ordersWithTracking.length);
      }

      const statusCounts = ordersWithTracking.reduce((acc: any, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});
      console.log('📊 Répartition des statuts:', statusCounts);
    }

    console.log(`✅ API Orders - ${ordersWithTracking?.length || 0} commandes récupérées après filtrage`);

    return NextResponse.json({
      success: true,
      orders: ordersWithTracking,
      count: ordersWithTracking.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erreur API orders:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Erreur interne',
      success: false
    }, { status: 500 });
  }
} 