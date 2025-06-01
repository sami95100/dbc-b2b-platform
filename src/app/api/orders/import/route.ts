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

// Fonction pour trouver un produit "voisin" avec les mêmes caractéristiques
async function findNeighborProduct(productName: string, appearance: string, functionality: string, vatType?: string) {
  try {
    console.log(`🔍 Recherche produit voisin pour: ${productName} | ${appearance} | ${functionality} | ${vatType}`);
    
    let query = supabaseAdmin
      .from('products')
      .select('sku, product_name, price_dbc, vat_type, appearance, functionality')
      .eq('product_name', productName)
      .eq('appearance', appearance)
      .eq('functionality', functionality)
      .gt('price_dbc', 0); // S'assurer qu'il y a un prix
    
    // Si VAT type est spécifié, l'inclure en priorité
    if (vatType) {
      const { data: exactMatch } = await query.eq('vat_type', vatType).limit(1);
      if (exactMatch && exactMatch.length > 0) {
        console.log(`✅ Produit voisin trouvé avec VAT identique:`, exactMatch[0]);
        return exactMatch[0];
      }
    }
    
    // Sinon, chercher sans le VAT type
    const { data: products, error } = await query.limit(1);
    
    if (error) {
      console.error('❌ Erreur recherche voisin:', error);
      return null;
    }
    
    if (products && products.length > 0) {
      console.log(`✅ Produit voisin trouvé:`, products[0]);
      return products[0];
    }
    
    console.log(`❌ Aucun produit voisin trouvé`);
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
    console.log('📁 Début de l\'import de commande Excel amélioré...');
    
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

    // Mapping flexible des colonnes
    const columnMapping = {
      sku: headers.findIndex(h => h && (h.toLowerCase().includes('sku') || h.toLowerCase().includes('référence'))),
      product_name: headers.findIndex(h => h && (h.toLowerCase().includes('product') || h.toLowerCase().includes('nom') || h.toLowerCase().includes('name'))),
      quantity: headers.findIndex(h => h && (h.toLowerCase().includes('count') || h.toLowerCase().includes('quantit') || h.toLowerCase().includes('qty'))),
      unit_price: headers.findIndex(h => h && (h.toLowerCase().includes('price') || h.toLowerCase().includes('prix') || h.toLowerCase().includes('offered'))),
      vat_type: headers.findIndex(h => h && (h.toLowerCase().includes('vat') || h.toLowerCase().includes('tva') || h.toLowerCase().includes('margin'))),
      appearance: headers.findIndex(h => h && h.toLowerCase().includes('appearance')),
      functionality: headers.findIndex(h => h && h.toLowerCase().includes('functionality')),
      color: headers.findIndex(h => h && (h.toLowerCase().includes('color') || h.toLowerCase().includes('couleur'))),
      boxed: headers.findIndex(h => h && (h.toLowerCase().includes('boxed') || h.toLowerCase().includes('emballage') || h.toLowerCase().includes('box'))),
      additional_info: headers.findIndex(h => h && (h.toLowerCase().includes('additional') || h.toLowerCase().includes('info') || h.toLowerCase().includes('note') || h.toLowerCase().includes('comment')))
    };

    console.log('🗺️ Mapping des colonnes:', columnMapping);
    
    // Log pour débogage - afficher les colonnes trouvées
    console.log('📋 Colonnes détectées:');
    console.log('- Color:', columnMapping.color >= 0 ? `Colonne ${columnMapping.color} (${headers[columnMapping.color]})` : 'Non trouvée');
    console.log('- Boxed:', columnMapping.boxed >= 0 ? `Colonne ${columnMapping.boxed} (${headers[columnMapping.boxed]})` : 'Non trouvée');
    console.log('- Additional Info:', columnMapping.additional_info >= 0 ? `Colonne ${columnMapping.additional_info} (${headers[columnMapping.additional_info]})` : 'Non trouvée');

    // Validation du mapping
    if (columnMapping.sku === -1 || columnMapping.quantity === -1) {
      throw new Error('Colonnes SKU et quantité requises non trouvées dans le fichier Excel');
    }

    // Extraire les données
    const extractedProducts = jsonData.slice(1)
      .filter(row => row && row.length > 0 && row[columnMapping.sku])
      .map(row => {
        const sku = String(row[columnMapping.sku]).trim();
        
        return {
          sku,
          product_name: columnMapping.product_name >= 0 ? String(row[columnMapping.product_name] || '').trim() : '',
          quantity: parseInt(String(row[columnMapping.quantity] || '0')) || 0,
          unit_price: parseFloat(String(row[columnMapping.unit_price] || '0')) || 0,
          vat_type: columnMapping.vat_type >= 0 ? String(row[columnMapping.vat_type] || '').trim() : '',
          appearance: columnMapping.appearance >= 0 ? String(row[columnMapping.appearance] || '').trim() : '',
          functionality: columnMapping.functionality >= 0 ? String(row[columnMapping.functionality] || '').trim() : '',
          color: columnMapping.color >= 0 ? String(row[columnMapping.color] || '').trim() : '',
          boxed: columnMapping.boxed >= 0 ? String(row[columnMapping.boxed] || '').trim() : '',
          additional_info: columnMapping.additional_info >= 0 ? String(row[columnMapping.additional_info] || '').trim() : ''
        };
      })
      .filter(product => product.sku && product.quantity > 0);

    console.log('📦 Produits extraits de l\'Excel:', extractedProducts.length);

    if (extractedProducts.length === 0) {
      throw new Error('Aucun produit valide trouvé dans le fichier Excel');
    }

    // Vérifier les produits dans le catalogue
    console.log('🔍 Vérification des produits dans le catalogue...');
    
    const productsExistingWithGoodStock: any[] = [];
    const productsToUpdateStock: any[] = [];
    const productsToCreate: any[] = [];

    for (const excelProduct of extractedProducts) {
      try {
        // 1. Chercher le SKU exact dans le catalogue
        const { data: catalogProducts, error } = await supabaseAdmin
          .from('products')
          .select('*')
          .eq('sku', excelProduct.sku)
          .limit(1);
          
        if (error) throw error;
        
        if (catalogProducts && catalogProducts.length > 0) {
          const catalogProduct = catalogProducts[0];
          console.log(`✅ SKU ${excelProduct.sku} trouvé dans le catalogue`);
          
          // Vérifier si le stock est suffisant
          if (catalogProduct.quantity >= excelProduct.quantity) {
            // Stock suffisant - produit OK
            productsExistingWithGoodStock.push({
              sku: catalogProduct.sku,
              product_name: catalogProduct.product_name,
              quantity: excelProduct.quantity,
              supplier_price: excelProduct.unit_price,
              dbc_price: catalogProduct.price_dbc,
              vat_type: catalogProduct.vat_type || 'Non marginal',
              catalog_stock: catalogProduct.quantity,
              status: 'Stock suffisant'
            });
          } else {
            // Stock insuffisant - à mettre à jour
            productsToUpdateStock.push({
              sku: catalogProduct.sku,
              product_name: catalogProduct.product_name,
              quantity: excelProduct.quantity,
              supplier_price: excelProduct.unit_price,
              dbc_price: catalogProduct.price_dbc,
              vat_type: catalogProduct.vat_type || 'Non marginal',
              catalog_stock: catalogProduct.quantity,
              new_stock: excelProduct.quantity,
              status: 'Stock à mettre à jour'
            });
          }
        } else {
          console.log(`❌ SKU ${excelProduct.sku} non trouvé dans le catalogue`);
          
          // 2. SKU non trouvé - chercher un produit voisin pour le prix
          let calculatedPrice = excelProduct.unit_price;
          let priceSource = 'Prix fournisseur';
          
          if (excelProduct.product_name && excelProduct.appearance && excelProduct.functionality) {
            const neighborProduct = await findNeighborProduct(
              excelProduct.product_name,
              excelProduct.appearance,
              excelProduct.functionality,
              excelProduct.vat_type
            );
            
            if (neighborProduct) {
              calculatedPrice = neighborProduct.price_dbc;
              priceSource = `Prix voisin (${neighborProduct.sku})`;
              console.log(`💡 Prix calculé depuis produit voisin ${neighborProduct.sku}: ${calculatedPrice}€`);
            } else {
              // Appliquer la marge DBC standard si pas de voisin trouvé
              calculatedPrice = calculateDbcPrice(excelProduct.unit_price, excelProduct.vat_type);
              priceSource = 'Prix calculé (marge DBC)';
              console.log(`💡 Prix calculé avec marge DBC: ${calculatedPrice}€`);
            }
          } else {
            // Appliquer la marge DBC standard
            calculatedPrice = calculateDbcPrice(excelProduct.unit_price, excelProduct.vat_type);
            priceSource = 'Prix calculé (marge DBC)';
          }
          
          productsToCreate.push({
            sku: excelProduct.sku,
            product_name: excelProduct.product_name || `Produit ${excelProduct.sku}`,
            quantity: excelProduct.quantity,
            supplier_price: excelProduct.unit_price,
            dbc_price: calculatedPrice,
            vat_type: excelProduct.vat_type || 'Non marginal',
            appearance: excelProduct.appearance || 'Grade A',
            functionality: excelProduct.functionality || '100%',
            color: excelProduct.color || 'N/A',
            boxed: excelProduct.boxed || 'Non renseigné',
            additional_info: excelProduct.additional_info || null, // Laisser vide si pas de données
            price_source: priceSource,
            status: 'À créer'
          });
        }
      } catch (error) {
        console.error(`❌ Erreur lors de la vérification du SKU ${excelProduct.sku}:`, error);
        
        // En cas d'erreur, traiter comme un produit à créer
        const calculatedPrice = calculateDbcPrice(excelProduct.unit_price, excelProduct.vat_type);
        productsToCreate.push({
          sku: excelProduct.sku,
          product_name: excelProduct.product_name || `Produit ${excelProduct.sku}`,
          quantity: excelProduct.quantity,
          supplier_price: excelProduct.unit_price,
          dbc_price: calculatedPrice,
          vat_type: excelProduct.vat_type || 'Non marginal',
          appearance: excelProduct.appearance || 'Grade A',
          functionality: excelProduct.functionality || '100%',
          color: excelProduct.color || 'N/A',
          boxed: excelProduct.boxed || 'Non renseigné',
          additional_info: excelProduct.additional_info || null, // Laisser vide si pas de données
          price_source: 'Prix calculé (erreur)',
          status: 'À créer (erreur)'
        });
      }
    }

    console.log(`✅ Produits avec stock suffisant: ${productsExistingWithGoodStock.length}`);
    console.log(`🔄 Produits avec stock à mettre à jour: ${productsToUpdateStock.length}`);
    console.log(`➕ Produits à créer: ${productsToCreate.length}`);

    const fileName = file.name.replace(/\.[^/.]+$/, "");

    return NextResponse.json({
      success: true,
      productsExistingWithGoodStock,
      productsToUpdateStock,
      productsToCreate,
      orderData: {
        fileName,
        totalProducts: extractedProducts.length,
        summary: {
          existing: productsExistingWithGoodStock.length,
          toUpdate: productsToUpdateStock.length,
          toCreate: productsToCreate.length
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur import:', error);
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