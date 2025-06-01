import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('📊 Export données commande:', params.id);

    const url = new URL(request.url);
    const type = url.searchParams.get('type'); // 'sku' ou 'imei'
    const format = url.searchParams.get('format'); // 'csv' ou 'xlsx'

    if (!type || !['sku', 'imei'].includes(type)) {
      return NextResponse.json({ error: 'Type d\'export requis: sku ou imei' }, { status: 400 });
    }

    if (!format || !['csv', 'xlsx'].includes(format)) {
      return NextResponse.json({ error: 'Format requis: csv ou xlsx' }, { status: 400 });
    }

    // Récupérer les informations de la commande
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, name, status, created_at')
      .eq('id', params.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    let exportData: any[] = [];
    let filename = '';

    if (type === 'sku') {
      // Export des SKU (order_items)
      const { data: orderItems, error: itemsError } = await supabaseAdmin
        .from('order_items')
        .select('sku, product_name, quantity, unit_price, total_price')
        .eq('order_id', params.id)
        .order('sku');

      if (itemsError) {
        return NextResponse.json({ error: 'Erreur récupération des articles' }, { status: 500 });
      }

      exportData = orderItems || [];
      filename = `commande_${order.name}_sku_${new Date().toISOString().split('T')[0]}`;

         } else if (type === 'imei') {
       // Export des IMEI (order_item_imei)
       // D'abord récupérer les IDs des order_items
       const { data: orderItems, error: orderItemsError } = await supabaseAdmin
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

       const { data: imeiData, error: imeiError } = await supabaseAdmin
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

      exportData = imeiData;
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