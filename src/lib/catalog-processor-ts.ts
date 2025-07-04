import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

interface Product {
  sku: string;
  item_group: string;
  product_name: string;
  appearance: string;
  functionality: string;
  boxed: string;
  color?: string;
  cloud_lock?: string;
  additional_info?: string;
  quantity: number;
  price: number;
  campaign_price?: number;
  vat_type?: string;
  price_dbc: number;
  is_active: boolean;
}

interface ProcessingStats {
  total: number;
  marginal: number;
  non_marginal: number;
  invalid_price: number;
  active_products: number;
  out_of_stock: number;
}

export class CatalogProcessorTS {
  private supabase;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variables d\'environnement Supabase manquantes');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  private applyDbcMargins(row: any): [number, string] {
    const price = parseFloat(row.Price) || 0;
    const vatType = row['VAT Type'] || '';

    if (isNaN(price) || price === 0) {
      return [price, 'Prix invalide'];
    }

    if (vatType === 'Marginal') {
      return [Math.round(price * 1.01 * 100) / 100, '1% (marginal)'];
    } else {
      return [Math.round(price * 1.11 * 100) / 100, '11% (non marginal)'];
    }
  }

  async processCatalogBuffer(buffer: Buffer): Promise<{ products: Product[], stats: ProcessingStats }> {
    console.log('📁 Processing Excel file...');
    
    // Lire le fichier Excel
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convertir en JSON avec les types appropriés
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      raw: false,
      defval: '' 
    });

    console.log(`📊 Excel file read: ${rawData.length} rows`);
    console.log(`🔍 Detected columns:`, Object.keys(rawData[0] || {}));

    // Vérifier les colonnes requises
    const requiredColumns = ['SKU', 'Product Name', 'Price', 'Quantity'];
    const firstRow = rawData[0] as any;
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));
    
    if (missingColumns.length > 0) {
      throw new Error(`Colonnes manquantes: ${missingColumns.join(', ')}`);
    }

    const stats: ProcessingStats = {
      total: rawData.length,
      marginal: 0,
      non_marginal: 0,
      invalid_price: 0,
      active_products: 0,
      out_of_stock: 0
    };

    const products: Product[] = [];

    for (const row of rawData) {
      const rowData = row as any;
      
      // Appliquer les marges DBC
      const [priceDbc, marginInfo] = this.applyDbcMargins(rowData);
      
      // Convertir et valider les données
      const sku = String(rowData.SKU || '').trim();
      const quantity = parseInt(rowData.Quantity) || 0;
      const price = parseFloat(rowData.Price) || 0;
      
      // Ignorer les lignes sans SKU
      if (!sku || sku === 'undefined') {
        continue;
      }

      const product: Product = {
        sku,
        item_group: String(rowData['Item Group'] || ''),
        product_name: String(rowData['Product Name'] || ''),
        appearance: String(rowData.Appearance || ''),
        functionality: String(rowData.Functionality || ''),
        boxed: String(rowData.Boxed || ''),
        color: rowData.Color ? String(rowData.Color) : undefined,
        cloud_lock: rowData['Cloud Lock'] ? String(rowData['Cloud Lock']) : undefined,
        additional_info: rowData['Additional Info'] ? String(rowData['Additional Info']) : undefined,
        quantity,
        price,
        campaign_price: rowData['Campaign Price'] ? parseFloat(rowData['Campaign Price']) : undefined,
        vat_type: rowData['VAT Type'] ? String(rowData['VAT Type']) : undefined,
        price_dbc: priceDbc,
        is_active: quantity > 0
      };

      products.push(product);

      // Mise à jour des statistiques
      if (marginInfo.includes('1% (marginal)')) {
        stats.marginal++;
      } else if (marginInfo.includes('11% (non marginal)')) {
        stats.non_marginal++;
      } else {
        stats.invalid_price++;
      }

      if (product.is_active) {
        stats.active_products++;
      } else {
        stats.out_of_stock++;
      }
    }

    console.log(`✅ Processed ${products.length} products`);
    
    return { products, stats };
  }

  async importToSupabase(products: Product[]): Promise<{ 
    imported_count: number, 
    new_skus: string[], 
    restocked_skus: string[],
    out_of_stock_count: number,
    missing_skus: string[]
  }> {
    console.log('📤 Starting Supabase import...');

    // Récupérer TOUS les produits existants avec pagination
    console.log('🔍 Fetching all existing products from database...');
    let allExistingProducts: any[] = [];
    let hasMoreData = true;
    let currentPage = 0;
    const fetchBatchSize = 1000;

    while (hasMoreData) {
      const from = currentPage * fetchBatchSize;
      const to = from + fetchBatchSize - 1;
      
      const { data, error: fetchError } = await this.supabase
        .from('products')
        .select('sku, quantity')
        .range(from, to);
      
      if (fetchError) {
        throw new Error(`Erreur récupération produits existants (page ${currentPage}): ${fetchError.message}`);
      }
      
      if (data && data.length > 0) {
        allExistingProducts = [...allExistingProducts, ...data];
        hasMoreData = data.length === fetchBatchSize;
        console.log(`📊 Fetched ${allExistingProducts.length} existing products so far...`);
      } else {
        hasMoreData = false;
      }
      
      currentPage++;
      // Sécurité pour éviter les boucles infinies
      if (currentPage > 50) {
        console.warn('⚠️ Stopped pagination after 50 pages (50k products max)');
        break;
      }
    }

    const existingSkus = new Map(allExistingProducts?.map(p => [p.sku, p.quantity]) || []);
    console.log(`📊 Total existing products in DB: ${existingSkus.size}`);

    // DEBUG: Afficher quelques SKU existants pour vérifier le format
    if (existingSkus.size > 0) {
      const sampleExisting = Array.from(existingSkus.keys()).slice(0, 5);
      console.log(`🔍 Sample existing SKUs: ${JSON.stringify(sampleExisting)}`);
    } else {
      console.log('⚠️ WARNING: No existing products found in DB! All will be considered new.');
    }

    // DEBUG: Afficher quelques SKU du catalogue pour comparaison
    if (products.length > 0) {
      const sampleCatalog = products.slice(0, 5).map(p => p.sku);
      console.log(`🔍 Sample catalog SKUs: ${JSON.stringify(sampleCatalog)}`);
    }

    const newSkus: string[] = [];
    const restockedSkus: string[] = [];
    const outOfStockSkus: string[] = [];
    const catalogSkus = new Set(products.map(p => p.sku));
    const missingSkus: string[] = [];
    let exactMatches = 0; // Compteur pour diagnostiquer les correspondances

    // Identifier les nouveaux SKU, restockés et ruptures
    for (const product of products) {
      const oldQuantity = existingSkus.get(product.sku) || 0;
      
      if (!existingSkus.has(product.sku)) {
        // Vraiment nouveau SKU
        if (product.quantity > 0) {
          newSkus.push(product.sku);
          if (newSkus.length <= 10) { // Log seulement les 10 premiers
            console.log(`✨ ${product.sku}: new product with stock ${product.quantity}`);
          }
        }
      } else {
        exactMatches++;
        // SKU existant
        if (oldQuantity === 0 && product.quantity > 0) {
          // Passé de 0 à en stock = restocké
          restockedSkus.push(product.sku);
          if (restockedSkus.length <= 5) { // Log seulement les 5 premiers
            console.log(`🔄 ${product.sku}: restocked (${oldQuantity} → ${product.quantity})`);
          }
        } else if (product.quantity === 0 && oldQuantity > 0) {
          // Passé d'en stock à 0 = rupture
          outOfStockSkus.push(product.sku);
          if (outOfStockSkus.length <= 5) { // Log seulement les 5 premiers
            console.log(`📦 ${product.sku}: out of stock (${oldQuantity} → 0)`);
          }
        } else if (oldQuantity !== product.quantity && newSkus.length < 3) {
          // Log quelques mises à jour de stock seulement
          console.log(`🔄 ${product.sku}: stock updated (${oldQuantity} → ${product.quantity})`);
        }
      }
    }

    // Identifier les SKU manquants (présents en base mais absents du catalogue)
    for (const [existingSku, oldQuantity] of Array.from(existingSkus.entries())) {
      if (!catalogSkus.has(existingSku) && oldQuantity > 0) {
        missingSkus.push(existingSku);
        if (missingSkus.length <= 10) {
          console.log(`❌ ${existingSku}: missing from catalog (was ${oldQuantity})`);
        }
      }
    }

    // DIAGNOSTIC IMPORTANT
    console.log(`\n🔍 IMPORT DIAGNOSTIC:`);
    console.log(`  - Products in catalog: ${products.length}`);
    console.log(`  - Existing products in DB: ${existingSkus.size}`);
    console.log(`  - Exact matches found: ${exactMatches}`);
    console.log(`  - New SKUs detected: ${newSkus.length}`);
    console.log(`  - Missing SKUs (rupture): ${missingSkus.length}`);
    
    // Information sur les nouveaux SKUs
    const newSkuPercentage = (newSkus.length / products.length) * 100;
    console.log(`📊 New SKUs: ${newSkus.length}/${products.length} (${newSkuPercentage.toFixed(1)}%)`);
    
    if (newSkuPercentage > 90) {
      console.log(`⚠️  High percentage of new SKUs: ${newSkuPercentage.toFixed(1)}%`);
      console.log(`   This might indicate first import or format change`);
    }
    
    console.log(`📊 Import summary:`);
    console.log(`  - New SKUs: ${newSkus.length}`);
    console.log(`  - Restocked SKUs: ${restockedSkus.length}`);
    console.log(`  - Out of stock SKUs (passed to 0): ${outOfStockSkus.length}`);
    console.log(`  - Missing SKUs (absent from catalog): ${missingSkus.length}`);
    console.log(`  - Total to process: ${products.length}`);
    


    // Import par batch avec UPSERT
    const batchSize = 100;
    let totalImported = 0;

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      
      const { error: upsertError } = await this.supabase
        .from('products')
        .upsert(batch, { 
          onConflict: 'sku',
          ignoreDuplicates: false 
        });

      if (upsertError) {
        throw new Error(`Erreur upsert batch ${i}: ${upsertError.message}`);
      }

      totalImported += batch.length;
      console.log(`📤 Imported: ${totalImported}/${products.length} products...`);
    }

    // Compter le nombre total de produits avec quantité 0 après l'import
    const totalZeroQuantityProducts = products.filter(p => p.quantity === 0).length;
    console.log(`📊 Total products with quantity 0: ${totalZeroQuantityProducts}`);
    
    // Sauvegarder les données d'import en base de données avec missing_skus
    await this.saveImportToDatabase(newSkus, restockedSkus, missingSkus, totalImported, {
      total: products.length,
      new_skus: newSkus.length,
      restocked_skus: restockedSkus.length,
      out_of_stock: totalZeroQuantityProducts,  // Utiliser le vrai nombre de produits à quantité 0
      missing_skus: missingSkus.length,
      existing_in_db: existingSkus.size,
      exact_matches: exactMatches
    });

    return {
      imported_count: totalImported,
      new_skus: newSkus,
      restocked_skus: restockedSkus,
      out_of_stock_count: totalZeroQuantityProducts,  // Nombre total de produits avec quantité 0
      missing_skus: missingSkus
    };
  }

  private async saveImportToDatabase(
    newSkus: string[], 
    restockedSkus: string[], 
    missingSkus: string[],
    totalImported: number, 
    stats: any
  ): Promise<void> {
    try {
      const importData = {
        import_date: new Date().toISOString(),
        total_imported: totalImported,
        total_updated: newSkus.length + restockedSkus.length,
        new_skus: newSkus,
        restocked_skus: restockedSkus,
        missing_skus: missingSkus,
        import_summary: {
          stats,
          new_skus_count: newSkus.length,
          restocked_skus_count: restockedSkus.length,
          missing_skus_count: missingSkus.length,
          total_new_products: newSkus.length + restockedSkus.length
        }
      };
      
      const { data, error } = await this.supabase
        .from('catalog_imports')
        .insert(importData);
      
      if (error) {
        console.error('⚠️ Erreur sauvegarde import en base:', error);
      } else {
        console.log('✅ Données d\'import sauvegardées en base');
      }
    } catch (error) {
      console.error('⚠️ Erreur fonction saveImportToDatabase:', error);
    }
  }

  async processAndImport(buffer: Buffer) {
    try {
      console.log('🚀 Starting catalog processing (TypeScript)...');
      
      // 1. Traiter le fichier Excel
      const { products, stats } = await this.processCatalogBuffer(buffer);
      
      // 2. Importer dans Supabase
      const { imported_count, new_skus, restocked_skus, out_of_stock_count, missing_skus } = await this.importToSupabase(products);
      
      console.log('✅ Catalog processing completed successfully');
      console.log(`📊 Final stats:`, {
        processed: products.length,
        imported: imported_count,
        new_skus: new_skus.length,
        restocked_skus: restocked_skus.length,
        out_of_stock: out_of_stock_count,
        missing_skus: missing_skus.length,
        total_zero_quantity: out_of_stock_count
      });
      
      return {
        success: true,
        imported_count,
        new_skus_count: new_skus.length,
        new_skus: new_skus.slice(0, 50), // Aperçu limité
        all_new_skus: new_skus, // Liste complète pour filtres
        restocked_skus: restocked_skus, // Liste des produits restockés
        missing_skus: missing_skus, // Liste des SKU en rupture
        out_of_stock_count,
        stats: {
          ...stats,
          out_of_stock: out_of_stock_count  // Nombre total de produits avec quantité 0
        }
      };
      
    } catch (error) {
      console.error('❌ Error in catalog processing:', error);
      throw error;
    }
  }
} 