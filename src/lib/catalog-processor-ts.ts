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
    out_of_stock_count: number 
  }> {
    console.log('📤 Starting Supabase import...');

    // Récupérer les produits existants
    const { data: existingProducts, error: fetchError } = await this.supabase
      .from('products')
      .select('sku, quantity');

    if (fetchError) {
      throw new Error(`Erreur récupération produits existants: ${fetchError.message}`);
    }

    const existingSkus = new Map(existingProducts?.map(p => [p.sku, p.quantity]) || []);
    console.log(`📊 Existing products in DB: ${existingSkus.size}`);

    const newSkus: string[] = [];
    const outOfStockSkus: string[] = [];

    // Identifier les nouveaux SKU et les ruptures
    for (const product of products) {
      const oldQuantity = existingSkus.get(product.sku) || 0;
      
      if (!existingSkus.has(product.sku) && product.quantity > 0) {
        newSkus.push(product.sku);
      } else if (product.quantity === 0 && oldQuantity > 0) {
        outOfStockSkus.push(product.sku);
      }
    }

    // Import par batch
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
        throw new Error(`Erreur import batch ${i}-${i + batch.length}: ${upsertError.message}`);
      }

      totalImported += batch.length;
      console.log(`📤 Imported: ${totalImported}/${products.length} products...`);
    }

    // Marquer en rupture les SKU absents du nouveau catalogue
    const catalogSkus = new Set(products.map(p => p.sku));
    const missingSkus = Array.from(existingSkus.keys()).filter(sku => 
      !catalogSkus.has(sku) && existingSkus.get(sku)! > 0
    );

    if (missingSkus.length > 0) {
      const { error: updateError } = await this.supabase
        .from('products')
        .update({ quantity: 0, is_active: false })
        .in('sku', missingSkus);

      if (updateError) {
        console.warn('Erreur mise à jour ruptures:', updateError);
      } else {
        console.log(`🚫 Marked ${missingSkus.length} products as out of stock`);
        outOfStockSkus.push(...missingSkus);
      }
    }

    return {
      imported_count: totalImported,
      new_skus: newSkus,
      out_of_stock_count: outOfStockSkus.length
    };
  }

  async processAndImport(buffer: Buffer) {
    const { products, stats } = await this.processCatalogBuffer(buffer);
    const importResult = await this.importToSupabase(products);

    return {
      success: true,
      stats: {
        ...stats,
        out_of_stock: importResult.out_of_stock_count
      },
      imported_count: importResult.imported_count,
      new_skus_count: importResult.new_skus.length,
      new_skus: importResult.new_skus.slice(0, 50),
      all_new_skus: importResult.new_skus
    };
  }
} 