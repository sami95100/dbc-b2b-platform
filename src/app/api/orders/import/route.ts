import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '../../../../lib/supabase';
import * as XLSX from 'xlsx';

interface ExcelProduct {
  sku: string;
  product_name?: string;
  quantity: number;
  unit_price?: number;
  vat_type?: string;
  // Autres champs optionnels
  [key: string]: any;
}

interface ProductInCatalog {
  sku: string;
  product_name: string;
  price_dbc: number;
  quantity: number;
  is_active: boolean;
  vat_type?: string;
}

// Fonction pour calculer le prix DBC selon les règles
function calculateDbcPrice(originalPrice: number, vatType?: string): number {
  if (!originalPrice || originalPrice <= 0) return 0;
  
  // Règles DBC :
  // - Produits marginaux (VAT Type = 'Marginal') : prix * 1.01
  // - Produits non marginaux : prix * 1.11
  const isMarginale = vatType === 'Marginal';
  const multiplier = isMarginale ? 1.01 : 1.11;
  
  return Math.round(originalPrice * multiplier * 100) / 100; // Arrondir à 2 décimales
}

// API pour éditer une commande existante avec un nouveau fichier Excel
export async function PUT(request: NextRequest) {
  try {
    console.log('✏️ Début de l\'édition de commande par import...');

    const url = new URL(request.url);
    const orderId = url.searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ error: 'ID de commande manquant' }, { status: 400 });
    }

    console.log('📝 Édition de la commande:', orderId);

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    // Récupérer la commande existante depuis localStorage (simulation)
    // En réalité, on récupérerait depuis Supabase
    // Pour l'instant, on traite le nouveau fichier et on compare

    // Lire le nouveau fichier Excel
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (rawData.length < 2) {
      return NextResponse.json({ error: 'Le fichier Excel semble vide ou mal formaté' }, { status: 400 });
    }

    // Analyser les headers
    const headers = rawData[0] as string[];
    console.log('📋 Headers détectés:', headers);

    const columnMap = {
      sku: findColumnIndex(headers, ['sku', 'SKU', 'ean', 'EAN', 'code', 'Code produit', 'Product Code']),
      product_name: findColumnIndex(headers, ['nom', 'name', 'product_name', 'Product Name', 'Nom du produit', 'description', 'Description']),
      quantity: findColumnIndex(headers, ['qty', 'quantity', 'quantite', 'Quantité', 'Quantity', 'qte', 'nb', 'Required Count', 'required count']),
      unit_price: findColumnIndex(headers, ['prix', 'price', 'unit_price', 'Prix unitaire', 'Unit Price', 'cout', 'Cost', 'Offered Price', 'offered price']),
      vat_type: findColumnIndex(headers, ['vat', 'VAT', 'vat_type', 'VAT Type', 'Vat Margin', 'vat margin'])
    };

    if (columnMap.sku === -1 || columnMap.quantity === -1) {
      return NextResponse.json({ 
        error: 'Impossible de trouver les colonnes SKU ou Quantité' 
      }, { status: 400 });
    }

    // Extraire les produits du nouveau fichier Excel
    const newExcelProducts: ExcelProduct[] = [];
    
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;
      
      const sku = row[columnMap.sku]?.toString().trim();
      const quantity = parseInt(row[columnMap.quantity]?.toString() || '0');
      
      if (!sku || quantity <= 0) continue;
      
      const vatType = columnMap.vat_type !== -1 ? row[columnMap.vat_type]?.toString().trim() : undefined;
      
      const product: ExcelProduct = {
        sku,
        quantity,
        product_name: columnMap.product_name !== -1 ? row[columnMap.product_name]?.toString().trim() : undefined,
        unit_price: columnMap.unit_price !== -1 ? parseFloat(row[columnMap.unit_price]?.toString() || '0') : undefined,
        vat_type: vatType
      };

      // Ajouter d'autres champs détectés
      headers.forEach((header, index) => {
        if (index !== columnMap.sku && index !== columnMap.quantity && 
            index !== columnMap.product_name && index !== columnMap.unit_price && 
            index !== columnMap.vat_type) {
          const value = row[index];
          if (value !== undefined && value !== null && value !== '') {
            product[header] = value;
          }
        }
      });

      newExcelProducts.push(product);
    }

    console.log('📦 Nouveaux produits extraits:', newExcelProducts.length);

    if (newExcelProducts.length === 0) {
      return NextResponse.json({ error: 'Aucun produit valide trouvé dans le nouveau fichier' }, { status: 400 });
    }

    // Récupérer les produits du catalogue pour validation
    let allCatalogProducts: ProductInCatalog[] = [];
    const batchSize = 1000;
    let currentBatch = 0;
    
    while (true) {
      const from = currentBatch * batchSize;
      const to = from + batchSize - 1;
      
      const { data, error } = await supabaseAdmin
        .from('products')
        .select('sku, product_name, price_dbc, quantity, is_active, vat_type')
        .range(from, to);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        allCatalogProducts = [...allCatalogProducts, ...data];
        if (data.length < batchSize) break;
      } else {
        break;
      }
      
      currentBatch++;
      if (currentBatch > 50) break;
    }

    const catalogSkuMap = new Map(allCatalogProducts.map(p => [p.sku, p]));

    // Analyser les changements
    const validProducts: any[] = [];
    const missingProducts: any[] = [];
    const productsToUpdate: any[] = [];
    const productsToCreate: any[] = [];

    for (const excelProduct of newExcelProducts) {
      const catalogProduct = catalogSkuMap.get(excelProduct.sku);
      
      if (catalogProduct) {
        const dbcPrice = calculateDbcPrice(excelProduct.unit_price || 0, excelProduct.vat_type);
        
        let actionRequired = '';
        if (catalogProduct.quantity === 0) {
          productsToUpdate.push({
            sku: excelProduct.sku,
            quantity: excelProduct.quantity,
            price_dbc: dbcPrice > 0 ? dbcPrice : catalogProduct.price_dbc
          });
          actionRequired = 'Stock à initialiser';
        }
        
        validProducts.push({
          sku: excelProduct.sku,
          product_name: catalogProduct.product_name,
          quantity: excelProduct.quantity,
          unit_price: dbcPrice > 0 ? dbcPrice : catalogProduct.price_dbc,
          catalog_quantity: catalogProduct.quantity,
          offered_price: excelProduct.unit_price,
          existing_price_dbc: catalogProduct.price_dbc,
          calculated_price_dbc: dbcPrice,
          vat_type: excelProduct.vat_type || catalogProduct.vat_type || 'Non marginal',
          action_required: actionRequired
        });
      } else {
        const dbcPrice = calculateDbcPrice(excelProduct.unit_price || 0, excelProduct.vat_type);
        
        const newProduct = {
          sku: excelProduct.sku,
          product_name: excelProduct.product_name || `Produit ${excelProduct.sku}`,
          item_group: excelProduct['Item Group'] || 'Mobiles',
          appearance: excelProduct['Appearance'] || 'Grade A',
          functionality: excelProduct['Functionality'] || 'Working',
          boxed: excelProduct['Boxed'] || 'Unboxed',
          color: excelProduct['Color'] || null,
          cloud_lock: excelProduct['Cloud Lock'] || null,
          additional_info: excelProduct['Additional Info'] || null,
          quantity: excelProduct.quantity,
          price: excelProduct.unit_price || 0,
          campaign_price: null,
          vat_type: excelProduct.vat_type || excelProduct['Vat Margin'] || 'Non marginal',
          price_dbc: dbcPrice,
          is_active: true
        };
        
        productsToCreate.push(newProduct);
        missingProducts.push({
          sku: excelProduct.sku,
          product_name: newProduct.product_name,
          quantity: excelProduct.quantity,
          unit_price: dbcPrice,
          offered_price: excelProduct.unit_price,
          calculated_price_dbc: dbcPrice,
          vat_type: newProduct.vat_type,
          item_group: newProduct.item_group,
          appearance: newProduct.appearance,
          functionality: newProduct.functionality,
          boxed: newProduct.boxed,
          color: newProduct.color,
          cloud_lock: newProduct.cloud_lock,
          additional_info: newProduct.additional_info,
          price: newProduct.price,
          campaign_price: newProduct.campaign_price,
          price_dbc: newProduct.price_dbc,
          is_active: newProduct.is_active
        });
      }
    }

    // Créer les données de réponse pour l'édition
    const editData = {
      orderId,
      fileName: file.name,
      totalProducts: newExcelProducts.length,
      validProducts: validProducts.length,
      missingProducts: missingProducts.length,
      productsToUpdate: productsToUpdate.length,
      productsToCreate: productsToCreate.length,
      editType: 'import',
      createdAt: new Date().toISOString(),
      productsToCreateData: productsToCreate,
      productsToUpdateData: productsToUpdate
    };

    console.log('✅ Analyse d\'édition terminée:', {
      orderId,
      validProducts: validProducts.length,
      missingProducts: missingProducts.length,
      productsToUpdate: productsToUpdate.length,
      productsToCreate: productsToCreate.length
    });

    return NextResponse.json({
      success: true,
      editMode: true,
      orderId,
      validProducts,
      missingProducts,
      editData,
      hasChanges: productsToUpdate.length > 0 || productsToCreate.length > 0,
      message: `Édition détectée: ${validProducts.length} produits existants, ${missingProducts.length} à créer, ${productsToUpdate.length} à mettre à jour`
    });

  } catch (error) {
    console.error('❌ Erreur édition commande:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
}

// API originale pour créer une nouvelle commande
export async function POST(request: NextRequest) {
  try {
    console.log('📁 Début de l\'import de commande Excel...');

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    // Lire le fichier Excel
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convertir en JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (rawData.length < 2) {
      return NextResponse.json({ error: 'Le fichier Excel semble vide ou mal formaté' }, { status: 400 });
    }

    // Analyser les headers pour détecter les colonnes
    const headers = rawData[0] as string[];
    console.log('📋 Headers détectés:', headers);

    // Mapper les colonnes (avec plusieurs variantes possibles)
    const columnMap = {
      sku: findColumnIndex(headers, ['sku', 'SKU', 'ean', 'EAN', 'code', 'Code produit', 'Product Code']),
      product_name: findColumnIndex(headers, ['nom', 'name', 'product_name', 'Product Name', 'Nom du produit', 'description', 'Description']),
      quantity: findColumnIndex(headers, ['qty', 'quantity', 'quantite', 'Quantité', 'Quantity', 'qte', 'nb', 'Required Count', 'required count']),
      unit_price: findColumnIndex(headers, ['prix', 'price', 'unit_price', 'Prix unitaire', 'Unit Price', 'cout', 'Cost', 'Offered Price', 'offered price']),
      vat_type: findColumnIndex(headers, ['vat', 'VAT', 'vat_type', 'VAT Type', 'Vat Margin', 'vat margin'])
    };

    console.log('🗺️ Mapping des colonnes:', columnMap);

    if (columnMap.sku === -1) {
      return NextResponse.json({ 
        error: 'Impossible de trouver la colonne SKU. Colonnes détectées: ' + headers.join(', ') 
      }, { status: 400 });
    }

    if (columnMap.quantity === -1) {
      return NextResponse.json({ 
        error: 'Impossible de trouver la colonne Quantité. Colonnes détectées: ' + headers.join(', ') 
      }, { status: 400 });
    }

    // Extraire les produits depuis l'Excel
    const excelProducts: ExcelProduct[] = [];
    
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      
      if (!row || row.length === 0) continue;
      
      const sku = row[columnMap.sku]?.toString().trim();
      const quantity = parseInt(row[columnMap.quantity]?.toString() || '0');
      
      if (!sku || quantity <= 0) continue;
      
      const vatType = columnMap.vat_type !== -1 ? row[columnMap.vat_type]?.toString().trim() : undefined;
      
      const product: ExcelProduct = {
        sku,
        quantity,
        product_name: columnMap.product_name !== -1 ? row[columnMap.product_name]?.toString().trim() : undefined,
        unit_price: columnMap.unit_price !== -1 ? parseFloat(row[columnMap.unit_price]?.toString() || '0') : undefined,
        vat_type: vatType
      };

      // Ajouter d'autres champs détectés
      headers.forEach((header, index) => {
        if (index !== columnMap.sku && index !== columnMap.quantity && 
            index !== columnMap.product_name && index !== columnMap.unit_price && 
            index !== columnMap.vat_type) {
          const value = row[index];
          if (value !== undefined && value !== null && value !== '') {
            product[header] = value;
          }
        }
      });

      excelProducts.push(product);
    }

    console.log('📦 Produits extraits de l\'Excel:', excelProducts.length);

    if (excelProducts.length === 0) {
      return NextResponse.json({ error: 'Aucun produit valide trouvé dans le fichier' }, { status: 400 });
    }

    // Récupérer tous les produits du catalogue par batch
    console.log('🔍 Vérification des produits dans le catalogue...');
    let allCatalogProducts: ProductInCatalog[] = [];
    const batchSize = 1000;
    let currentBatch = 0;
    
    while (true) {
      const from = currentBatch * batchSize;
      const to = from + batchSize - 1;
      
      const { data, error } = await supabaseAdmin
        .from('products')
        .select('sku, product_name, price_dbc, quantity, is_active, vat_type')
        .range(from, to);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        allCatalogProducts = [...allCatalogProducts, ...data];
        console.log(`✅ Batch ${currentBatch + 1}: ${data.length} produits (total: ${allCatalogProducts.length})`);
        
        if (data.length < batchSize) {
          break; // Dernier batch
        }
      } else {
        break;
      }
      
      currentBatch++;
      
      if (currentBatch > 50) {
        console.warn('⚠️ Arrêt sécurité après 50 batchs');
        break;
      }
    }

    // Créer un Map pour une recherche rapide
    const catalogSkuMap = new Map(allCatalogProducts.map(p => [p.sku, p]));

    // Analyser chaque produit selon les règles business
    const validProducts: any[] = [];
    const missingProducts: any[] = [];
    const productsToUpdate: any[] = [];
    const productsToCreate: any[] = [];

    for (const excelProduct of excelProducts) {
      const catalogProduct = catalogSkuMap.get(excelProduct.sku);
      
      if (catalogProduct) {
        // SKU existe dans le catalogue
        console.log(`✅ SKU ${excelProduct.sku} trouvé dans le catalogue`);
        
        // Calculer le prix DBC à partir du prix offert
        const dbcPrice = calculateDbcPrice(excelProduct.unit_price || 0, excelProduct.vat_type);
        
        let actionRequired = '';
        
        // Si stock = 0, marquer pour mise à jour
        if (catalogProduct.quantity === 0) {
          console.log(`📦 SKU ${excelProduct.sku} stock = 0, à initialiser à ${excelProduct.quantity}`);
          productsToUpdate.push({
            sku: excelProduct.sku,
            quantity: excelProduct.quantity,
            price_dbc: dbcPrice > 0 ? dbcPrice : catalogProduct.price_dbc
          });
          actionRequired = 'Stock à initialiser';
        }
        
        // Ajouter à la commande avec prix DBC calculé ou existant
        validProducts.push({
          sku: excelProduct.sku,
          product_name: catalogProduct.product_name,
          quantity: excelProduct.quantity,
          unit_price: dbcPrice > 0 ? dbcPrice : catalogProduct.price_dbc, // Prix DBC calculé ou existant
          catalog_quantity: catalogProduct.quantity,
          offered_price: excelProduct.unit_price, // Prix proposé dans l'Excel
          existing_price_dbc: catalogProduct.price_dbc,
          calculated_price_dbc: dbcPrice,
          vat_type: excelProduct.vat_type || catalogProduct.vat_type || 'Non marginal',
          action_required: actionRequired
        });
      } else {
        // SKU n'existe pas, marquer comme produit à créer
        console.log(`➕ SKU ${excelProduct.sku} n'existe pas, à créer dans le catalogue`);
        
        // Calculer le prix DBC
        const dbcPrice = calculateDbcPrice(excelProduct.unit_price || 0, excelProduct.vat_type);
        
        const newProduct = {
          sku: excelProduct.sku,
          product_name: excelProduct.product_name || `Produit ${excelProduct.sku}`,
          item_group: excelProduct['Item Group'] || 'Mobiles',
          appearance: excelProduct['Appearance'] || 'Grade A',
          functionality: excelProduct['Functionality'] || 'Working',
          boxed: excelProduct['Boxed'] || 'Unboxed',
          color: excelProduct['Color'] || null,
          cloud_lock: excelProduct['Cloud Lock'] || null,
          additional_info: excelProduct['Additional Info'] || null,
          quantity: excelProduct.quantity, // Stock initial = quantité commande
          price: excelProduct.unit_price || 0,
          campaign_price: null,
          vat_type: excelProduct.vat_type || excelProduct['Vat Margin'] || 'Non marginal',
          price_dbc: dbcPrice, // Prix DBC calculé
          is_active: true
        };
        
        productsToCreate.push(newProduct);
        
        // Ajouter aux produits manquants pour confirmation
        missingProducts.push({
          sku: excelProduct.sku,
          product_name: newProduct.product_name,
          quantity: excelProduct.quantity,
          unit_price: dbcPrice,
          offered_price: excelProduct.unit_price,
          calculated_price_dbc: dbcPrice,
          vat_type: newProduct.vat_type,
          // Autres propriétés du nouveau produit
          item_group: newProduct.item_group,
          appearance: newProduct.appearance,
          functionality: newProduct.functionality,
          boxed: newProduct.boxed,
          color: newProduct.color,
          cloud_lock: newProduct.cloud_lock,
          additional_info: newProduct.additional_info,
          price: newProduct.price,
          campaign_price: newProduct.campaign_price,
          price_dbc: newProduct.price_dbc,
          is_active: newProduct.is_active
        });
      }
    }

    console.log('✅ Produits existants:', validProducts.length);
    console.log('❌ Produits à créer:', missingProducts.length);
    console.log('🔄 Produits à mettre à jour:', productsToUpdate.length);

    // Créer les données de la commande
    const orderData = {
      fileName: file.name,
      totalProducts: excelProducts.length,
      validProducts: validProducts.length,
      missingProducts: missingProducts.length,
      productsToUpdate: productsToUpdate.length,
      productsToCreate: productsToCreate.length,
      createdAt: new Date().toISOString(),
      productsToCreateData: productsToCreate,
      productsToUpdateData: productsToUpdate
    };

    return NextResponse.json({
      success: true,
      validProducts,
      missingProducts,
      orderData,
      hasUpdates: productsToUpdate.length > 0 || productsToCreate.length > 0,
      message: `${validProducts.length} produits existants, ${missingProducts.length} à créer, ${productsToUpdate.length} à mettre à jour`
    });

  } catch (error) {
    console.error('❌ Erreur import commande:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
}

// Fonction utilitaire pour trouver l'index d'une colonne
function findColumnIndex(headers: string[], possibleNames: string[]): number {
  for (const name of possibleNames) {
    const index = headers.findIndex(header => 
      header.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(header.toLowerCase())
    );
    if (index !== -1) return index;
  }
  return -1;
} 