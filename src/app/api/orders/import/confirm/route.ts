import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '../../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Confirmation d\'import de commande...');
    
    // Debug: vérifier les clés Supabase
    console.log('🔑 URL Supabase:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...');
    console.log('🔑 Service Role Key présente:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('🔑 Service Role Key commence par:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...');

    const body = await request.json();
    const { addToGatalog, missingProducts, validProducts, orderData } = body;

    console.log('📋 Paramètres reçus:');
    console.log('- Ajouter au catalogue:', addToGatalog);
    console.log('- Produits manquants:', missingProducts?.length || 0);
    console.log('- Produits valides:', validProducts?.length || 0);
    console.log('- Produits à créer:', orderData?.productsToCreate || 0);
    console.log('- Produits à mettre à jour:', orderData?.productsToUpdate || 0);

    // Vérifications de sécurité
    if (!validProducts || !Array.isArray(validProducts)) {
      throw new Error('Produits valides manquants ou invalides');
    }

    if (!orderData || !orderData.fileName) {
      throw new Error('Données de commande manquantes');
    }

    let newlyAddedProducts: any[] = [];
    let updatedProducts: any[] = [];

    // Mettre à jour les produits existants avec stock = 0
    if (orderData?.productsToUpdateData && Array.isArray(orderData.productsToUpdateData) && orderData.productsToUpdateData.length > 0) {
      console.log(`🔄 Mise à jour de ${orderData.productsToUpdateData.length} produits...`);
      
      for (const product of orderData.productsToUpdateData) {
        if (!product.sku) {
          console.warn('⚠️ Produit sans SKU ignoré:', product);
          continue;
        }

        const updateData: any = { quantity: product.quantity || 0 };
        
        // Mettre à jour aussi le prix DBC si calculé
        if (product.price_dbc && product.price_dbc > 0) {
          updateData.price_dbc = product.price_dbc;
        }
        
        const { error } = await supabaseAdmin
          .from('products')
          .update(updateData)
          .eq('sku', product.sku);
          
        if (error) {
          console.error(`❌ Erreur mise à jour ${product.sku}:`, error);
        } else {
          updatedProducts.push(product);
          console.log(`✅ Produit ${product.sku} mis à jour`);
        }
      }
      
      console.log(`✅ ${updatedProducts.length} produits mis à jour`);
    }

    // Si on doit ajouter les produits manquants au catalogue
    if (addToGatalog && orderData?.productsToCreateData && Array.isArray(orderData.productsToCreateData) && orderData.productsToCreateData.length > 0) {
      console.log('➕ Ajout des produits manquants au catalogue...');
      
      const productsToAdd = orderData.productsToCreateData.filter((p: any) => p.sku); // Filtrer les produits sans SKU

      if (productsToAdd.length === 0) {
        console.warn('⚠️ Aucun produit valide à créer');
      } else {
        // Insérer par batch pour éviter les timeouts
        const batchSize = 50; // Réduire la taille du batch
        for (let i = 0; i < productsToAdd.length; i += batchSize) {
          const batch = productsToAdd.slice(i, i + batchSize);
          
          console.log(`Insertion batch ${Math.floor(i/batchSize) + 1}: ${batch.length} produits`);
          
          const { data: insertedProducts, error } = await supabaseAdmin
            .from('products')
            .insert(batch)
            .select('sku, product_name, price_dbc');

          if (error) {
            console.error('❌ Erreur insertion batch:', error);
            console.error('Batch qui a échoué:', batch);
            throw new Error(`Erreur insertion produits: ${error.message}`);
          }

          if (insertedProducts) {
            newlyAddedProducts = [...newlyAddedProducts, ...insertedProducts];
            console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${insertedProducts.length} produits ajoutés`);
          }
        }
      }

      console.log('✅ Total produits ajoutés au catalogue:', newlyAddedProducts.length);
    }

    // Préparer tous les produits pour la commande
    let allOrderProducts = [...validProducts];

    if (addToGatalog && newlyAddedProducts.length > 0 && missingProducts && Array.isArray(missingProducts)) {
      // Ajouter les nouveaux produits à la commande
      const newProductsForOrder = missingProducts.map((missingProduct: any) => {
        const addedProduct = newlyAddedProducts.find(p => p.sku === missingProduct.sku);
        return {
          sku: missingProduct.sku,
          product_name: addedProduct?.product_name || missingProduct.product_name || `Produit ${missingProduct.sku}`,
          quantity: missingProduct.quantity || 0,
          unit_price: addedProduct?.price_dbc || missingProduct.calculated_price_dbc || 0,
          catalog_quantity: missingProduct.quantity || 0 // Stock initial
        };
      });
      
      allOrderProducts = [...allOrderProducts, ...newProductsForOrder];
    } else if (!addToGatalog && missingProducts && Array.isArray(missingProducts) && missingProducts.length > 0) {
      // Créer la commande même avec des produits manquants (avec prix 0)
      const missingProductsForOrder = missingProducts.map((missingProduct: any) => ({
        sku: missingProduct.sku,
        product_name: missingProduct.product_name || `Produit ${missingProduct.sku}`,
        quantity: missingProduct.quantity || 0,
        unit_price: 0, // Prix 0 pour les produits non catalogués
        catalog_quantity: 0
      }));
      
      allOrderProducts = [...allOrderProducts, ...missingProductsForOrder];
    }

    // Créer la commande
    console.log('📦 Création de la commande avec', allOrderProducts.length, 'produits...');
    
    const orderId = `IMP-${Date.now()}`;
    const fileName = orderData.fileName || 'commande';
    const orderName = `Import ${fileName.replace(/\.[^/.]+$/, "")}`;
    
    // Préparer les items de la commande
    const orderItems: {[key: string]: number} = {};
    allOrderProducts.forEach((product: any) => {
      if (product.sku && product.quantity > 0) {
        orderItems[product.sku] = product.quantity;
      }
    });

    // Calculer le total avec les prix DBC
    const totalAmount = allOrderProducts.reduce((sum: number, product: any) => 
      sum + ((product.unit_price || 0) * (product.quantity || 0)), 0
    );

    const totalItems = allOrderProducts.reduce((sum: number, product: any) => 
      sum + (product.quantity || 0), 0
    );

    // Créer l'objet commande pour localStorage (côté frontend)
    const newOrder = {
      id: orderId,
      name: orderName,
      status: 'validated',
      statusLabel: 'Validée',
      createdAt: new Date().toISOString(),
      items: orderItems,
      source: 'excel_import',
      fileName: fileName,
      totalAmount: Math.round(totalAmount * 100) / 100, // Arrondir à 2 décimales
      totalItems,
      productsCreated: newlyAddedProducts.length,
      productsUpdated: updatedProducts.length,
      missingProducts: addToGatalog ? 0 : (missingProducts?.length || 0)
    };

    // Sauvegarder aussi dans Supabase
    try {
      const orderForSupabase = {
        name: orderName,
        status: 'validated' as const,
        status_label: 'Validée',
        total_amount: newOrder.totalAmount,
        total_items: totalItems,
        customer_ref: 'IMPORT-AUTO',
        vat_type: 'Bien d\'occasion - TVA calculée sur la marge'
      };

      const { data: supabaseOrder, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert([orderForSupabase])
        .select()
        .single();

      if (orderError) {
        console.warn('⚠️ Erreur sauvegarde commande Supabase:', orderError);
        // Continuer même si la sauvegarde Supabase échoue
      } else {
        console.log('✅ Commande sauvegardée dans Supabase:', supabaseOrder.id);
        
        // Ajouter les items de commande dans Supabase
        if (allOrderProducts.length > 0) {
          const orderItemsForSupabase = allOrderProducts.map(product => ({
            order_id: supabaseOrder.id,
            sku: product.sku,
            product_name: product.product_name,
            quantity: product.quantity,
            unit_price: product.unit_price,
            total_price: (product.unit_price || 0) * (product.quantity || 0)
          }));

          const { error: itemsError } = await supabaseAdmin
            .from('order_items')
            .insert(orderItemsForSupabase);

          if (itemsError) {
            console.warn('⚠️ Erreur sauvegarde items Supabase:', itemsError);
          } else {
            console.log('✅ Items de commande sauvegardés dans Supabase');
          }
        }
      }
    } catch (supabaseError) {
      console.warn('⚠️ Erreur générale Supabase:', supabaseError);
      // Continuer même si Supabase échoue
    }

    console.log('✅ Commande créée:', {
      id: orderId,
      name: orderName,
      totalProducts: allOrderProducts.length,
      totalAmount: newOrder.totalAmount,
      totalItems,
      productsCreated: newlyAddedProducts.length,
      productsUpdated: updatedProducts.length
    });

    return NextResponse.json({
      success: true,
      orderId,
      orderName,
      order: newOrder,
      totalProducts: allOrderProducts.length,
      totalAmount: newOrder.totalAmount,
      totalItems,
      productsCreated: newlyAddedProducts.length,
      productsUpdated: updatedProducts.length,
      message: `Commande "${orderName}" créée avec succès. ${newlyAddedProducts.length} nouveaux produits créés, ${updatedProducts.length} produits mis à jour.`
    });

  } catch (error) {
    console.error('❌ Erreur confirmation import:', error);
    
    // Log détaillé de l'erreur
    if (error instanceof Error) {
      console.error('Message d\'erreur:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erreur interne', 
        details: error instanceof Error ? error.stack : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
} 