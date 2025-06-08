import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '../../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Début de la confirmation d\'import...');
    
    if (!supabaseAdmin) {
      throw new Error('Configuration Supabase admin manquante');
    }
    
    const body = await request.json();
    const { 
      orderData,
      productsExistingWithGoodStock,
      productsToUpdateStock,
      productsToCreate,
      addToCatalog,
      userId 
    } = body;

    console.log('📋 Données reçues:');
    console.log('- Produits existants OK:', productsExistingWithGoodStock?.length || 0);

    console.log('- Produits à créer:', productsToCreate?.length || 0);
    console.log('- Ajouter au catalogue:', addToCatalog);

    // 1. METTRE À JOUR LES STOCKS si demandé
    if (addToCatalog && productsToUpdateStock && productsToUpdateStock.length > 0) {
      console.log('📦 Mise à jour des stocks...');
      
      for (const product of productsToUpdateStock) {
        try {
          const { error: updateError } = await supabaseAdmin
            .from('products')
            .update({ 
              quantity: product.new_stock,
              price_dbc: product.dbc_price 
            })
            .eq('sku', product.sku);

          if (updateError) {
            console.error(`❌ Erreur mise à jour stock ${product.sku}:`, updateError);
          } else {
            console.log(`✅ Stock mis à jour pour ${product.sku}: ${product.new_stock}`);
          }
        } catch (error) {
          console.error(`❌ Erreur mise à jour ${product.sku}:`, error);
        }
      }
    }

    // 2. CRÉER LES NOUVEAUX PRODUITS si demandé
    let newlyAddedProducts = [];
    if (addToCatalog && productsToCreate && productsToCreate.length > 0) {
      console.log('➕ Création des nouveaux produits...');
      
      const productsToInsert = productsToCreate.map((product: any) => ({
        sku: product.sku,
        item_group: 'Mobiles',
        product_name: product.product_name,
        appearance: product.appearance || 'Grade A',
        functionality: product.functionality || '100%',
        boxed: product.boxed || 'Non renseigné',
        color: product.color || null,
        cloud_lock: null,
        additional_info: product.additional_info || null,
        quantity: product.quantity,
        price: product.supplier_price,
        campaign_price: null,
        vat_type: product.vat_type || 'Non marginal',
        price_dbc: product.dbc_price,
        is_active: true
      }));

      // Vérifier d'abord quels produits existent déjà pour éviter les doublons
      console.log('🔍 Vérification des doublons avant insertion...');
      const skusToCreate = productsToInsert.map((p: any) => p.sku);
      
      const { data: existingProducts, error: checkError } = await supabaseAdmin
        .from('products')
        .select('sku')
        .in('sku', skusToCreate);

      if (checkError) {
        console.warn('⚠️ Erreur vérification doublons:', checkError);
      }

      const existingSkus = new Set(existingProducts?.map((p: any) => p.sku) || []);
      const productsToActuallyInsert = productsToInsert.filter((p: any) => !existingSkus.has(p.sku));
      
      console.log(`📊 Résultat vérification doublons:`);
      console.log(`- Produits à créer: ${productsToInsert.length}`);
      console.log(`- Produits déjà existants: ${existingSkus.size}`);
      console.log(`- Produits à réellement insérer: ${productsToActuallyInsert.length}`);

      if (existingSkus.size > 0) {
        console.log('⚠️ Produits détectés comme existants:', Array.from(existingSkus));
      }

      if (productsToActuallyInsert.length > 0) {
        try {
          const { data: insertedProducts, error: insertError } = await supabaseAdmin
            .from('products')
            .insert(productsToActuallyInsert)
            .select('sku, product_name');

          if (insertError) {
            console.error('❌ Erreur insertion produits:', insertError);
            
            // Si c'est encore une erreur de contrainte unique, essayer d'insérer un par un
            if (insertError.code === '23505') { // Contrainte unique violée
              console.log('🔄 Tentative d\'insertion individuelle...');
              newlyAddedProducts = [];
              
              for (const product of productsToActuallyInsert) {
                try {
                  const { data: singleInsert, error: singleError } = await supabaseAdmin
                    .from('products')
                    .insert([product])
                    .select('sku, product_name');

                  if (singleError) {
                    if (singleError.code === '23505') {
                      console.log(`⚠️ Produit ${product.sku} existe déjà, ignoré`);
                    } else {
                      console.error(`❌ Erreur insertion ${product.sku}:`, singleError);
                    }
                  } else if (singleInsert && singleInsert.length > 0) {
                    newlyAddedProducts.push(singleInsert[0]);
                    console.log(`✅ Produit ${product.sku} créé individuellement`);
                  }
                } catch (singleProductError) {
                  console.error(`❌ Erreur produit individuel ${product.sku}:`, singleProductError);
                }
              }
              
              console.log(`✅ ${newlyAddedProducts.length} produits créés avec insertion individuelle`);
            } else {
              throw new Error(`Erreur lors de la création des produits: ${insertError.message}`);
            }
          } else {
            newlyAddedProducts = insertedProducts || [];
            console.log(`✅ ${newlyAddedProducts.length} nouveaux produits créés en batch`);
          }
        } catch (error) {
          console.error('❌ Erreur création produits:', error);
          throw error;
        }
      } else {
        console.log('ℹ️ Aucun nouveau produit à créer (tous existent déjà)');
        newlyAddedProducts = [];
      }
    }

    // 3. PRÉPARER LES DONNÉES DE COMMANDE
    console.log('📝 Préparation de la commande...');
    
    // Tous les produits pour la commande
    const allOrderProducts = [
      ...productsExistingWithGoodStock,
      ...productsToUpdateStock,
      ...productsToCreate
    ];

    if (allOrderProducts.length === 0) {
      throw new Error('Aucun produit à commander');
    }

    // Calculer les totaux
    const totalAmount = allOrderProducts.reduce((sum, product) => 
      sum + (product.dbc_price * product.quantity), 0
    );

    const totalItems = allOrderProducts.reduce((sum, product) => 
      sum + product.quantity, 0
    );

    const fileName = orderData.fileName || 'commande_importee';
    const orderName = `Import ${fileName} - ${new Date().toLocaleDateString('fr-FR')}`;

    // 4. CRÉER LA COMMANDE EN BROUILLON
    console.log('📋 Création de la commande en base...');
    
    const orderForSupabase: any = {
      name: orderName,
      status: 'draft' as const,
      status_label: 'Brouillon',
      total_amount: Math.round(totalAmount * 100) / 100,
      total_items: totalItems,
      customer_ref: 'IMPORT-AUTO',
      vat_type: 'Bien d\'occasion - TVA calculée sur la marge'
    };

    // Ajouter le user_id si fourni
    if (userId) {
      orderForSupabase.user_id = userId;
    }

    const { data: insertedOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert([orderForSupabase])
      .select()
      .single();

    if (orderError) {
      console.error('❌ Erreur création commande:', orderError);
      throw new Error(`Erreur création commande: ${orderError.message}`);
    }

    console.log('✅ Commande créée:', insertedOrder.id);

    // 5. AJOUTER LES ITEMS DE COMMANDE
    console.log('📦 Ajout des items de commande...');
    
    const orderItemsData = allOrderProducts.map(product => ({
      order_id: insertedOrder.id,
      sku: product.sku,
      product_name: product.product_name,
      quantity: product.quantity,
      unit_price: product.dbc_price,
      total_price: product.dbc_price * product.quantity
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItemsData);

    if (itemsError) {
      console.error('❌ Erreur ajout items:', itemsError);
      // Ne pas faire échouer pour ça, juste avertir
      console.warn('⚠️ Items non ajoutés mais commande créée');
    } else {
      console.log(`✅ ${orderItemsData.length} items ajoutés à la commande`);
    }

    // 6. PRÉPARER LA RÉPONSE
    const response = {
      success: true,
      order: {
        id: insertedOrder.id,
        name: insertedOrder.name,
        status: insertedOrder.status,
        status_label: insertedOrder.status_label,
        total_amount: insertedOrder.total_amount,
        total_items: insertedOrder.total_items,
        created_at: insertedOrder.created_at
      },
      summary: {
        totalProducts: allOrderProducts.length,
        existingProducts: productsExistingWithGoodStock.length,
        updatedProducts: productsToUpdateStock.length,
        createdProducts: newlyAddedProducts.length,
        catalogUpdated: addToCatalog,
        totalAmount: Math.round(totalAmount * 100) / 100,
        totalItems
      },
      message: `Commande "${orderName}" créée avec succès. ${allOrderProducts.length} produits, ${addToCatalog ? newlyAddedProducts.length + ' créés et ' + productsToUpdateStock.length + ' mis à jour dans le catalogue.' : 'sans modification du catalogue.'}`
    };

    console.log('✅ Import terminé avec succès:', response.summary);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Erreur lors de la confirmation d\'import:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 