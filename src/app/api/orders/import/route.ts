import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '../../../../lib/supabase';
import * as XLSX from 'xlsx';

interface ExcelProduct {
  sku: string;
  product_name?: string;
  quantity: number;
  unit_price?: number;
  vat_type?: string;
  appearance?: string;
  functionality?: string;
  color?: string;
  boxed?: string;
  additional_info?: string;
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
  appearance: string;
  functionality: string;
  color?: string;
  boxed?: string;
  additional_info?: string;
}

interface NeighborProduct {
  sku: string;
  product_name: string;
  price_dbc: number;
  vat_type?: string;
  appearance: string;
  functionality: string;
  color?: string;
  boxed?: string;
}

// Fonction pour calculer le prix DBC selon les règles
function calculateDbcPrice(originalPrice: number, vatType?: string): number {
  if (!originalPrice || originalPrice <= 0) return 0;
  
  // Règles DBC :
  // - Produits marginaux (VAT Type = 'Marginal') : prix * 1.01
  // - Produits non marginaux : prix * 1.11
  const isMarginale = vatType === 'Marginal' || vatType === 'marginal';
  const multiplier = isMarginale ? 1.01 : 1.11;
  
  return Math.round(originalPrice * multiplier * 100) / 100; // Arrondir à 2 décimales
}

// Fonction améliorée pour trouver un produit "voisin" avec les mêmes caractéristiques
async function findNeighborProduct(productName: string, appearance?: string, functionality?: string, vatType?: string): Promise<NeighborProduct | null> {
  try {
    console.log(`🔍 Recherche produit voisin pour: ${productName} | ${appearance} | ${functionality} | ${vatType}`);
    
    if (!productName || !supabaseAdmin) {
      console.log('❌ Nom de produit manquant ou supabaseAdmin non disponible pour la recherche voisin');
      return null;
    }

    // Stratégie de recherche par ordre de priorité :
    // 1. product_name + appearance + functionality + vat_type (correspondance exacte)
    // 2. product_name + appearance + functionality (sans vat_type)
    // 3. product_name seul

    let query = supabaseAdmin
      .from('products')
      .select('sku, product_name, price_dbc, vat_type, appearance, functionality, color, boxed')
      .eq('product_name', productName)
      .gt('price_dbc', 0) // S'assurer qu'il y a un prix
      .eq('is_active', true);

    // Recherche avec tous les critères si disponibles
    if (appearance && functionality) {
      query = query.eq('appearance', appearance).eq('functionality', functionality);
      
      if (vatType) {
        query = query.eq('vat_type', vatType);
      }
      
      const { data: exactMatch } = await query.limit(1);
      if (exactMatch && exactMatch.length > 0) {
        console.log(`✅ Produit voisin trouvé (correspondance exacte):`, exactMatch[0]);
        return exactMatch[0];
      }
      
      // Si pas trouvé avec VAT, retry sans VAT
      if (vatType) {
        query = supabaseAdmin
          .from('products')
          .select('sku, product_name, price_dbc, vat_type, appearance, functionality, color, boxed')
          .eq('product_name', productName)
          .eq('appearance', appearance)
          .eq('functionality', functionality)
          .gt('price_dbc', 0)
          .eq('is_active', true);
          
        const { data: partialMatch } = await query.limit(1);
        if (partialMatch && partialMatch.length > 0) {
          console.log(`✅ Produit voisin trouvé (sans VAT):`, partialMatch[0]);
          return partialMatch[0];
        }
      }
    }
    
    // Recherche avec seulement le nom du produit
    const { data: nameOnlyMatch } = await supabaseAdmin
      .from('products')
      .select('sku, product_name, price_dbc, vat_type, appearance, functionality, color, boxed')
      .eq('product_name', productName)
      .gt('price_dbc', 0)
      .eq('is_active', true)
      .limit(1);
      
    if (nameOnlyMatch && nameOnlyMatch.length > 0) {
      console.log(`✅ Produit voisin trouvé (nom seulement):`, nameOnlyMatch[0]);
      return nameOnlyMatch[0];
    }
    
    console.log(`❌ Aucun produit voisin trouvé pour: ${productName}`);
    return null;
  } catch (error) {
    console.error('❌ Erreur dans findNeighborProduct:', error);
    return null;
  }
}

// API pour éditer une commande existante avec un nouveau fichier Excel
export async function PUT(request: NextRequest) {
  try {
    console.log('✏️ Début de l\'édition de commande par import...');

    if (!supabaseAdmin) {
      throw new Error('Configuration Supabase admin manquante');
    }

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
      vat_type: findColumnIndex(headers, ['vat', 'VAT', 'vat_type', 'VAT Type', 'Vat Margin', 'vat margin']),
      appearance: findColumnIndex(headers, ['appearance', 'Appearance', 'apparence', 'Apparence', 'grade', 'Grade']),
      functionality: findColumnIndex(headers, ['functionality', 'Functionality', 'fonctionnalite', 'Fonctionnalité']),
      color: findColumnIndex(headers, ['color', 'Color', 'couleur', 'Couleur']),
      boxed: findColumnIndex(headers, ['boxed', 'Boxed', 'emballage', 'Emballage', 'box', 'Box']),
      additional_info: findColumnIndex(headers, ['additional', 'Additional Info', 'info', 'Information', 'note', 'Note', 'comment', 'Comment'])
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
        vat_type: vatType,
        appearance: columnMap.appearance !== -1 ? row[columnMap.appearance]?.toString().trim() : undefined,
        functionality: columnMap.functionality !== -1 ? row[columnMap.functionality]?.toString().trim() : undefined,
        color: columnMap.color !== -1 ? row[columnMap.color]?.toString().trim() : undefined,
        boxed: columnMap.boxed !== -1 ? row[columnMap.boxed]?.toString().trim() : undefined,
        additional_info: columnMap.additional_info !== -1 ? row[columnMap.additional_info]?.toString().trim() : undefined
      };

      // Ajouter d'autres champs détectés
      headers.forEach((header, index) => {
        if (index !== columnMap.sku && index !== columnMap.quantity && 
            index !== columnMap.product_name && index !== columnMap.unit_price && 
            index !== columnMap.vat_type && index !== columnMap.appearance &&
            index !== columnMap.functionality && index !== columnMap.color &&
            index !== columnMap.boxed && index !== columnMap.additional_info) {
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
        .select('sku, product_name, price_dbc, quantity, is_active, vat_type, appearance, functionality, color, boxed, additional_info')
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
          appearance: excelProduct.appearance || 'Grade A',
          functionality: excelProduct.functionality || 'Working',
          boxed: excelProduct.boxed || 'Unboxed',
          color: excelProduct.color || null,
          cloud_lock: excelProduct['Cloud Lock'] || null,
          additional_info: excelProduct.additional_info || null,
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
    console.log('📁 Début de l\'import de commande Excel amélioré...');
    
    if (!supabaseAdmin) {
      throw new Error('Configuration Supabase admin manquante');
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('Aucun fichier fourni');
    }

    // Lire le fichier Excel
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convertir en JSON avec les headers
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (jsonData.length < 2) {
      throw new Error('Le fichier Excel doit contenir au moins une ligne de headers et une ligne de données');
    }

    const headers = jsonData[0] as string[];
    console.log('📋 Headers détectés:', headers);

    // Mapping flexible des colonnes amélioré
    const columnMap = {
      sku: findColumnIndex(headers, ['sku', 'SKU', 'ean', 'EAN', 'code', 'Code produit', 'Product Code']),
      product_name: findColumnIndex(headers, ['nom', 'name', 'product_name', 'Product Name', 'Nom du produit', 'description', 'Description']),
      quantity: findColumnIndex(headers, ['qty', 'quantity', 'quantite', 'Quantité', 'Quantity', 'qte', 'nb', 'Required Count', 'required count']),
      unit_price: findColumnIndex(headers, ['prix', 'price', 'unit_price', 'Prix unitaire', 'Unit Price', 'cout', 'Cost', 'Offered Price', 'offered price']),
      vat_type: findColumnIndex(headers, ['vat', 'VAT', 'vat_type', 'VAT Type', 'Vat Margin', 'vat margin']),
      appearance: findColumnIndex(headers, ['appearance', 'Appearance', 'apparence', 'Apparence', 'grade', 'Grade']),
      functionality: findColumnIndex(headers, ['functionality', 'Functionality', 'fonctionnalite', 'Fonctionnalité']),
      color: findColumnIndex(headers, ['color', 'Color', 'couleur', 'Couleur']),
      boxed: findColumnIndex(headers, ['boxed', 'Boxed', 'emballage', 'Emballage', 'box', 'Box']),
      additional_info: findColumnIndex(headers, ['additional', 'Additional Info', 'info', 'Information', 'note', 'Note', 'comment', 'Comment'])
    };

    console.log('🗺️ Mapping des colonnes:', columnMap);

    // Validation du mapping
    if (columnMap.sku === -1 || columnMap.quantity === -1) {
      throw new Error('Colonnes SKU et quantité requises non trouvées dans le fichier Excel');
    }

    // Extraire les produits du fichier Excel
    const extractedProducts: ExcelProduct[] = [];
    
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;
      
      const sku = row[columnMap.sku]?.toString().trim();
      const quantity = parseInt(row[columnMap.quantity]?.toString() || '0');
      
      if (!sku || quantity <= 0) continue;
      
      const product: ExcelProduct = {
        sku,
        quantity,
        product_name: columnMap.product_name !== -1 ? row[columnMap.product_name]?.toString().trim() : undefined,
        unit_price: columnMap.unit_price !== -1 ? parseFloat(row[columnMap.unit_price]?.toString() || '0') : undefined,
        vat_type: columnMap.vat_type !== -1 ? row[columnMap.vat_type]?.toString().trim() : undefined,
        appearance: columnMap.appearance !== -1 ? row[columnMap.appearance]?.toString().trim() : undefined,
        functionality: columnMap.functionality !== -1 ? row[columnMap.functionality]?.toString().trim() : undefined,
        color: columnMap.color !== -1 ? row[columnMap.color]?.toString().trim() : undefined,
        boxed: columnMap.boxed !== -1 ? row[columnMap.boxed]?.toString().trim() : undefined,
        additional_info: columnMap.additional_info !== -1 ? row[columnMap.additional_info]?.toString().trim() : undefined
      };

      extractedProducts.push(product);
    }

    console.log('📦 Produits extraits:', extractedProducts.length);

    if (extractedProducts.length === 0) {
      throw new Error('Aucun produit valide trouvé dans le fichier Excel');
    }

    // Récupérer tous les produits du catalogue
    let allCatalogProducts: ProductInCatalog[] = [];
    let hasMoreData = true;
    let currentPage = 0;
    const batchSize = 1000;
    
    while (hasMoreData) {
      const from = currentPage * batchSize;
      const to = from + batchSize - 1;
      
      const { data, error } = await supabaseAdmin
        .from('products')
        .select('sku, product_name, price_dbc, quantity, is_active, vat_type, appearance, functionality, color, boxed, additional_info')
        .range(from, to);
      
      if (error) {
        console.error('❌ Erreur récupération catalogue:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        allCatalogProducts = [...allCatalogProducts, ...data];
        hasMoreData = data.length === batchSize;
      } else {
        hasMoreData = false;
      }
      
      currentPage++;
      if (currentPage > 50) break; // Sécurité pour éviter les boucles infinies
    }

    console.log('📚 Produits catalogue récupérés:', allCatalogProducts.length);

    const catalogSkuMap = new Map(allCatalogProducts.map(p => [p.sku, p]));

    // Analyser chaque produit Excel et le catégoriser
    const productsExistingWithGoodStock: any[] = [];
    const productsToUpdateStock: any[] = [];
    const productsToCreate: any[] = [];

    for (const excelProduct of extractedProducts) {
      const catalogProduct = catalogSkuMap.get(excelProduct.sku);
      
      if (catalogProduct) {
        // SKU existe dans le catalogue
        console.log(`🔍 SKU ${excelProduct.sku} trouvé dans le catalogue`);
        
        const supplierPrice = excelProduct.unit_price || 0;
        const dbcPrice = catalogProduct.price_dbc;
        const catalogStock = catalogProduct.quantity;
        const requiredQuantity = excelProduct.quantity;
        
        if (catalogStock >= requiredQuantity) {
          // Stock suffisant
          productsExistingWithGoodStock.push({
            sku: excelProduct.sku,
            product_name: catalogProduct.product_name,
            quantity: requiredQuantity,
            supplier_price: supplierPrice,
            dbc_price: dbcPrice,
            vat_type: catalogProduct.vat_type || 'Non marginal',
            catalog_stock: catalogStock,
            appearance: catalogProduct.appearance || 'Grade A',
            functionality: catalogProduct.functionality || '100%',
            color: catalogProduct.color || null,
            status: 'Stock suffisant'
          });
        } else {
          // Stock insuffisant - à mettre à jour
          productsToUpdateStock.push({
            sku: excelProduct.sku,
            product_name: catalogProduct.product_name,
            quantity: requiredQuantity,
            supplier_price: supplierPrice,
            dbc_price: dbcPrice,
            vat_type: catalogProduct.vat_type || 'Non marginal',
            catalog_stock: catalogStock,
            new_stock: requiredQuantity,
            appearance: catalogProduct.appearance || 'Grade A',
            functionality: catalogProduct.functionality || '100%',
            color: catalogProduct.color || null,
            status: `Stock à mettre à jour (${catalogStock} → ${requiredQuantity})`
          });
        }
      } else {
        // SKU n'existe pas - créer avec méthode voisin
        console.log(`🆕 SKU ${excelProduct.sku} à créer, recherche d'un voisin...`);
        
        const supplierPrice = excelProduct.unit_price || 0;
        let dbcPrice = 0;
        let priceSource = 'Aucun prix trouvé';
        let finalVatType = excelProduct.vat_type || 'Non marginal';
        let finalAppearance = excelProduct.appearance || 'Grade A';
        let finalFunctionality = excelProduct.functionality || '100%';
        let finalColor = excelProduct.color || null;
        let finalBoxed = excelProduct.boxed || 'Non renseigné';
        
        // Rechercher un produit voisin
        const neighborProduct = await findNeighborProduct(
          excelProduct.product_name || `Produit ${excelProduct.sku}`,
          excelProduct.appearance,
          excelProduct.functionality,
          excelProduct.vat_type
        );
        
        if (neighborProduct) {
          // Utiliser le prix du produit voisin
          dbcPrice = neighborProduct.price_dbc;
          priceSource = `Prix voisin (${neighborProduct.sku})`;
          
          // Utiliser les caractéristiques du voisin si pas spécifiées dans l'Excel
          if (!excelProduct.vat_type && neighborProduct.vat_type) {
            finalVatType = neighborProduct.vat_type;
          }
          if (!excelProduct.appearance) {
            finalAppearance = neighborProduct.appearance;
          }
          if (!excelProduct.functionality) {
            finalFunctionality = neighborProduct.functionality;
          }
          if (!excelProduct.color && neighborProduct.color) {
            finalColor = neighborProduct.color;
          }
          if (!excelProduct.boxed && neighborProduct.boxed) {
            finalBoxed = neighborProduct.boxed;
          }
          
          console.log(`✅ Produit voisin trouvé pour ${excelProduct.sku}: ${neighborProduct.sku} (prix: ${dbcPrice}€)`);
        } else {
          // Aucun voisin trouvé, calculer le prix avec la marge standard
          if (supplierPrice > 0) {
            dbcPrice = calculateDbcPrice(supplierPrice, finalVatType);
            priceSource = 'Marge standard DBC';
          }
          console.log(`⚠️ Aucun voisin trouvé pour ${excelProduct.sku}, prix calculé: ${dbcPrice}€`);
        }
        
        productsToCreate.push({
          sku: excelProduct.sku,
          product_name: excelProduct.product_name || `Produit ${excelProduct.sku}`,
          quantity: excelProduct.quantity,
          supplier_price: supplierPrice,
          dbc_price: dbcPrice,
          vat_type: finalVatType,
          appearance: finalAppearance,
          functionality: finalFunctionality,
          color: finalColor,
          boxed: finalBoxed,
          additional_info: excelProduct.additional_info || null,
          price_source: priceSource,
          status: neighborProduct ? 'Prix voisin trouvé' : 'Prix calculé'
        });
      }
    }

    console.log('📊 Résultats de l\'analyse:');
    console.log(`- Produits existants OK: ${productsExistingWithGoodStock.length}`);
    console.log(`- Produits à mettre à jour: ${productsToUpdateStock.length}`);
    console.log(`- Produits à créer: ${productsToCreate.length}`);

    // Préparer les données de commande
    const orderData = {
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
      totalProducts: extractedProducts.length
    };

    return NextResponse.json({
      success: true,
      productsExistingWithGoodStock,
      productsToUpdateStock,
      productsToCreate,
      orderData,
      summary: {
        totalProducts: extractedProducts.length,
        existingWithGoodStock: productsExistingWithGoodStock.length,
        toUpdate: productsToUpdateStock.length,
        toCreate: productsToCreate.length
      },
      message: `Import analysé: ${productsExistingWithGoodStock.length} produits OK, ${productsToUpdateStock.length} à mettre à jour, ${productsToCreate.length} à créer`
    });

  } catch (error) {
    console.error('❌ Erreur import:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
}

function findColumnIndex(headers: string[], possibleNames: string[]): number {
  for (const name of possibleNames) {
    const index = headers.findIndex(h => 
      h && h.toLowerCase().trim() === name.toLowerCase().trim()
    );
    if (index !== -1) return index;
  }
  
  // Recherche plus flexible avec includes
  for (const name of possibleNames) {
    const index = headers.findIndex(h => 
      h && h.toLowerCase().includes(name.toLowerCase())
    );
    if (index !== -1) return index;
  }
  
  return -1;
} 