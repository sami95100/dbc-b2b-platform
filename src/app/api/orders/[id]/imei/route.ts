import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
import * as XLSX from 'xlsx';

interface ExcelImeiData {
  sku: string;
  id?: string;
  product_name: string;
  item_identifier: string; // IMEI
  appearance: string;
  functionality: string;
  boxed: string;
  color?: string | null;
  cloud_lock?: string | null;
  additional_info?: string | null;
  quantity: number; // Toujours 1
  price: number; // Prix fournisseur
}

// Fonction pour calculer le prix DBC selon les règles
function calculateDbcPrice(supplierPrice: number, vatType?: string): number {
  if (!supplierPrice || supplierPrice <= 0) return 0;
  
  // Règles DBC :
  // - Produits marginaux (VAT Type = 'Marginal') : prix * 1.01
  // - Produits non marginaux : prix * 1.11
  const isMarginale = vatType === 'Marginal';
  const multiplier = isMarginale ? 1.01 : 1.11;
  
  return Math.round(supplierPrice * multiplier * 100) / 100; // Arrondir à 2 décimales
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('📱 Début import IMEI pour commande:', params.id);

    // 1. Vérifier que la commande existe et est en statut 'pending_payment'
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, name, status, total_amount')
      .eq('id', params.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    if (order.status !== 'pending_payment') {
      return NextResponse.json({ 
        error: `Impossible d'importer les IMEI. La commande doit être en statut "En attente de paiement", statut actuel: ${order.status}` 
      }, { status: 400 });
    }

    // 2. Récupérer les order_items de la commande
    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select('id, sku, product_name, quantity, unit_price')
      .eq('order_id', params.id);

    if (itemsError) {
      return NextResponse.json({ error: 'Erreur récupération des articles de commande' }, { status: 500 });
    }

    if (!orderItems || orderItems.length === 0) {
      return NextResponse.json({ error: 'Aucun article trouvé dans cette commande' }, { status: 400 });
    }

    console.log(`📦 ${orderItems.length} articles dans la commande`);

    // 3. Lire le fichier Excel des IMEI
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    console.log('📁 Lecture du fichier IMEI:', file.name);

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (jsonData.length < 2) {
      return NextResponse.json({ error: 'Le fichier Excel doit contenir au moins une ligne de headers et une ligne de données' }, { status: 400 });
    }

    const headers = jsonData[0] as string[];
    console.log('📋 Headers IMEI détectés:', headers);

    // 4. Mapping des colonnes attendues
    const columnMapping = {
      sku: headers.findIndex(h => h && h.toLowerCase().includes('sku')),
      id: headers.findIndex(h => h && h.toLowerCase().includes('id')),
      product_name: headers.findIndex(h => h && (h.toLowerCase().includes('product') || h.toLowerCase().includes('name'))),
      item_identifier: headers.findIndex(h => h && (h.toLowerCase().includes('identifier') || h.toLowerCase().includes('imei'))),
      appearance: headers.findIndex(h => h && h.toLowerCase().includes('appearance')),
      functionality: headers.findIndex(h => h && h.toLowerCase().includes('functionality')),
      boxed: headers.findIndex(h => h && h.toLowerCase().includes('boxed')),
      color: headers.findIndex(h => h && h.toLowerCase().includes('color')),
      cloud_lock: headers.findIndex(h => h && (h.toLowerCase().includes('cloud') || h.toLowerCase().includes('lock'))),
      additional_info: headers.findIndex(h => h && (h.toLowerCase().includes('additional') || h.toLowerCase().includes('info'))),
      quantity: headers.findIndex(h => h && (h.toLowerCase().includes('quantity') || h.toLowerCase().includes('qty'))),
      price: headers.findIndex(h => h && h.toLowerCase().includes('price'))
    };

    console.log('🗺️ Mapping colonnes IMEI:', columnMapping);

    // Validation du mapping
    if (columnMapping.sku === -1 || columnMapping.item_identifier === -1 || columnMapping.quantity === -1 || columnMapping.price === -1) {
      return NextResponse.json({ 
        error: 'Colonnes requises non trouvées: SKU, Item Identifier (IMEI), Quantity, Price' 
      }, { status: 400 });
    }

    // 5. Extraire les données IMEI
    const extractedImeiData: ExcelImeiData[] = jsonData.slice(1)
      .filter(row => row && row.length > 0 && row[columnMapping.sku] && row[columnMapping.item_identifier])
      .map(row => ({
        sku: String(row[columnMapping.sku]).trim(),
        id: columnMapping.id >= 0 ? String(row[columnMapping.id] || '').trim() : '',
        product_name: columnMapping.product_name >= 0 ? String(row[columnMapping.product_name] || '').trim() : '',
        item_identifier: String(row[columnMapping.item_identifier]).trim(),
        appearance: columnMapping.appearance >= 0 ? String(row[columnMapping.appearance] || '').trim() : '',
        functionality: columnMapping.functionality >= 0 ? String(row[columnMapping.functionality] || '').trim() : '',
        boxed: columnMapping.boxed >= 0 ? String(row[columnMapping.boxed] || '').trim() : '',
        color: columnMapping.color >= 0 ? String(row[columnMapping.color] || '').trim() : null,
        cloud_lock: columnMapping.cloud_lock >= 0 ? String(row[columnMapping.cloud_lock] || '').trim() : null,
        additional_info: columnMapping.additional_info >= 0 ? String(row[columnMapping.additional_info] || '').trim() : null,
        quantity: parseInt(String(row[columnMapping.quantity] || '1')) || 1,
        price: parseFloat(String(row[columnMapping.price] || '0')) || 0
      }));

    console.log(`📱 ${extractedImeiData.length} IMEI extraits du fichier`);

    if (extractedImeiData.length === 0) {
      return NextResponse.json({ error: 'Aucun IMEI valide trouvé dans le fichier' }, { status: 400 });
    }

    // 6. Vérifier la correspondance SKU et quantités
    const orderItemsMap = new Map(orderItems.map(item => [item.sku, item]));
    const imeiCountBySku = new Map<string, number>();

    // Compter les IMEI par SKU
    extractedImeiData.forEach(imei => {
      const currentCount = imeiCountBySku.get(imei.sku) || 0;
      imeiCountBySku.set(imei.sku, currentCount + 1);
    });

    // Vérifier que chaque SKU de la commande a le bon nombre d'IMEI
    const validationErrors: string[] = [];
    
    for (const orderItem of orderItems) {
      const imeiCount = imeiCountBySku.get(orderItem.sku) || 0;
      if (imeiCount !== orderItem.quantity) {
        validationErrors.push(`SKU ${orderItem.sku}: attendu ${orderItem.quantity} IMEI, trouvé ${imeiCount}`);
      }
    }

    // Vérifier qu'il n'y a pas d'IMEI pour des SKU non présents dans la commande
    Array.from(imeiCountBySku.keys()).forEach(sku => {
      if (!orderItemsMap.has(sku)) {
        validationErrors.push(`SKU ${sku}: présent dans les IMEI mais pas dans la commande`);
      }
    });

    if (validationErrors.length > 0) {
      return NextResponse.json({ 
        error: 'Erreurs de validation IMEI/Commande',
        validation_errors: validationErrors
      }, { status: 400 });
    }

    console.log('✅ Validation IMEI/Commande réussie');

    // 7. Préparer les données pour insertion avec prix DBC
    const imeiDataForInsert = extractedImeiData.map(imei => {
      const orderItem = orderItemsMap.get(imei.sku)!;
      
      // Utiliser le prix DBC de la commande plutôt que de recalculer
      const dbcPrice = orderItem.unit_price;

      return {
        order_item_id: orderItem.id,
        sku: imei.sku,
        imei: imei.item_identifier,
        product_name: imei.product_name || orderItem.product_name,
        appearance: imei.appearance || 'Grade A',
        functionality: imei.functionality || '100%',
        boxed: imei.boxed || 'Non renseigné',
        color: imei.color,
        cloud_lock: imei.cloud_lock,
        additional_info: imei.additional_info,
        supplier_price: imei.price,
        dbc_price: dbcPrice
      };
    });

    // 8. Vérifier s'il y a déjà des IMEI pour cette commande
    const { data: existingImei, error: existingError } = await supabaseAdmin
      .from('order_item_imei')
      .select('imei')
      .in('order_item_id', orderItems.map(item => item.id));

    if (existingError) {
      console.warn('⚠️ Erreur vérification IMEI existants:', existingError);
    }

    if (existingImei && existingImei.length > 0) {
      return NextResponse.json({ 
        error: `Cette commande a déjà ${existingImei.length} IMEI enregistrés. Supprimez-les d'abord si vous voulez réimporter.` 
      }, { status: 400 });
    }

    // 9. Insérer les IMEI dans la base de données
    console.log('💾 Insertion des IMEI en base...');

    const { data: insertedImei, error: insertError } = await supabaseAdmin
      .from('order_item_imei')
      .insert(imeiDataForInsert)
      .select('id, sku, imei');

    if (insertError) {
      console.error('❌ Erreur insertion IMEI:', insertError);
      return NextResponse.json({ 
        error: `Erreur lors de l'insertion des IMEI: ${insertError.message}` 
      }, { status: 500 });
    }

    console.log(`✅ ${insertedImei?.length || 0} IMEI insérés avec succès`);

    // 10. Mettre à jour le statut de la commande vers 'shipping'
    const { error: statusUpdateError } = await supabaseAdmin
      .from('orders')
      .update({ 
        status: 'shipping',
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id);

    if (statusUpdateError) {
      console.warn('⚠️ Erreur mise à jour statut commande:', statusUpdateError);
    } else {
      console.log('✅ Commande passée en statut "shipping"');
    }

    return NextResponse.json({
      success: true,
      message: `Import IMEI réussi: ${insertedImei?.length || 0} IMEI ajoutés`,
      summary: {
        totalImei: insertedImei?.length || 0,
        orderStatus: 'shipping',
        skuCount: imeiCountBySku.size
      },
      imeiData: insertedImei
    });

  } catch (error) {
    console.error('❌ Erreur import IMEI:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
} 