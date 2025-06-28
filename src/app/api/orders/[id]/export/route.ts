import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
import * as XLSX from 'xlsx';

// Forcer le rendu dynamique pour cette API route
export const dynamic = 'force-dynamic';

// Fonction helper pour vérifier supabaseAdmin
function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Configuration Supabase admin manquante - vérifiez SUPABASE_SERVICE_ROLE_KEY dans .env.local');
  }
  return supabaseAdmin;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = getSupabaseAdmin();
    
    console.log('📊 Export données commande:', params.id);

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // 'sku' ou 'imei'
    const format = searchParams.get('format'); // 'csv' ou 'xlsx'

    if (!type || !['sku', 'imei'].includes(type)) {
      return NextResponse.json({ error: 'Type d\'export requis: sku ou imei' }, { status: 400 });
    }

    if (!format || !['csv', 'xlsx'].includes(format)) {
      return NextResponse.json({ error: 'Format requis: csv ou xlsx' }, { status: 400 });
    }

    // Récupérer les informations de la commande
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('id, name, status, created_at')
      .eq('id', params.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    // Vérifier que la commande existe et a un statut approprié pour l'export
    const allowedStatuses = ['shipping', 'completed'];
    if (!allowedStatuses.includes(order.status)) {
      return NextResponse.json({ 
        error: `Export non autorisé pour le statut ${order.status}. Statuts autorisés: ${allowedStatuses.join(', ')}` 
      }, { status: 400 });
    }

    let exportData: any[] = [];
    let filename = '';

    if (type === 'sku') {
      // Export des SKU (order_items) avec headers compatibles import
      const { data: orderItems, error: itemsError } = await admin
        .from('order_items')
        .select('sku, product_name, quantity, unit_price, total_price')
        .eq('order_id', params.id)
        .order('sku');

      if (itemsError) {
        return NextResponse.json({ error: 'Erreur récupération des articles' }, { status: 500 });
      }

      // Transformer les données avec les en-têtes d'import standard
      exportData = (orderItems || []).map(item => ({
        'SKU': item.sku,
        'Product Name': item.product_name,
        'Quantity': item.quantity,
        'Offered Price': item.unit_price,
        'VAT Type': 'Non marginal', // Valeur par défaut
        'Appearance': 'Grade A',    // Valeur par défaut
        'Functionality': '100%',    // Valeur par défaut
        'Color': '',               // Vide par défaut
        'Boxed': 'Unboxed',       // Valeur par défaut
        'Additional Info': ''      // Vide par défaut
      }));

      filename = `commande_${order.name}_sku_${new Date().toISOString().split('T')[0]}`;

    } else if (type === 'imei') {
      // Export des IMEI (order_item_imei) avec headers compatibles import
      // D'abord récupérer les IDs des order_items
      const { data: orderItems, error: orderItemsError } = await admin
        .from('order_items')
        .select('id')
        .eq('order_id', params.id);

      if (orderItemsError) {
        return NextResponse.json({ error: 'Erreur récupération des articles' }, { status: 500 });
      }

      const orderItemIds = orderItems?.map(item => item.id) || [];

      if (orderItemIds.length === 0) {
        return NextResponse.json({ error: 'Aucun article trouvé pour cette commande' }, { status: 404 });
      }

      const { data: imeiData, error: imeiError } = await admin
        .from('order_item_imei')
        .select(`
          sku,
          imei,
          product_name,
          appearance,
          functionality,
          boxed,
          color,
          cloud_lock,
          additional_info,
          supplier_price,
          dbc_price
        `)
        .in('order_item_id', orderItemIds)
        .order('sku');

      if (imeiError) {
        return NextResponse.json({ error: 'Erreur récupération des IMEI' }, { status: 500 });
      }

      if (!imeiData || imeiData.length === 0) {
        return NextResponse.json({ error: 'Aucun IMEI trouvé pour cette commande' }, { status: 404 });
      }

      // Transformer les données avec les en-têtes d'import IMEI standard
      exportData = imeiData.map((item, index) => ({
        'SKU': item.sku,
        'Id': index + 1,                        // ID séquentiel
        'Product Name': item.product_name,
        'Item Identifier': item.imei,           // IMEI
        'Appearance': item.appearance,
        'Functionality': item.functionality,
        'Boxed': item.boxed,
        'Color': item.color || '',
        'Cloud Lock': item.cloud_lock || '',
        'Additional Info': item.additional_info || '',
        'Quantity': 1,                          // Toujours 1 pour les IMEI
        'Price': item.dbc_price                 // Prix DBC (prix de vente, pas prix fournisseur)
      }));

      filename = `commande_${order.name}_imei_${new Date().toISOString().split('T')[0]}`;
    }

    if (exportData.length === 0) {
      return NextResponse.json({ error: 'Aucune donnée à exporter' }, { status: 404 });
    }

    console.log(`📊 ${exportData.length} lignes à exporter en format ${format}`);

    if (format === 'csv') {
      // Export CSV
      const headers = Object.keys(exportData[0]);
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header];
            // Échapper les virgules et guillemets dans les valeurs CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value || '';
          }).join(',')
        )
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"`
        }
      });

    } else if (format === 'xlsx') {
      // Export XLSX
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Ajuster la largeur des colonnes
      const maxWidth = 30;
      const headers = Object.keys(exportData[0]);
      worksheet['!cols'] = headers.map(header => ({
        width: Math.min(maxWidth, Math.max(10, header.length + 2))
      }));

      // Ajouter le worksheet au workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, type === 'sku' ? 'SKU' : 'IMEI');

      // Générer le fichier Excel en buffer
      const excelBuffer = XLSX.write(workbook, { 
        type: 'buffer', 
        bookType: 'xlsx' 
      });

      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`
        }
      });
    }

    return NextResponse.json({ error: 'Format non supporté' }, { status: 400 });

  } catch (error) {
    console.error('❌ Erreur export:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
} 