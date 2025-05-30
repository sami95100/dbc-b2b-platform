import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '../../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('✏️ Confirmation d\'édition de commande...');
    
    const body = await request.json();
    const { orderId, addToGatalog, missingProducts, validProducts, editData } = body;

    console.log('📋 Paramètres d\'édition reçus:');
    console.log('- Commande ID:', orderId);
    console.log('- Ajouter au catalogue:', addToGatalog);
    console.log('- Produits manquants:', missingProducts?.length || 0);
    console.log('- Produits valides:', validProducts?.length || 0);
    console.log('- Produits à créer:', editData?.productsToCreate || 0);
    console.log('- Produits à mettre à jour:', editData?.productsToUpdate || 0);

    // Vérifications de sécurité
    if (!orderId) {
      throw new Error('ID de commande manquant');
    }

    if (!validProducts || !Array.isArray(validProducts)) {
      throw new Error('Produits valides manquants ou invalides');
    }

    if (!editData || !editData.fileName) {
      throw new Error('Données d\'édition manquantes');
    }

    let newlyAddedProducts: any[] = [];
    let updatedProducts: any[] = [];

    // Mettre à jour les produits existants avec stock = 0
    if (editData?.productsToUpdateData && Array.isArray(editData.productsToUpdateData) && editData.productsToUpdateData.length > 0) {
      console.log(`🔄 Mise à jour de ${editData.productsToUpdateData.length} produits...`);
      
      for (const product of editData.productsToUpdateData) {
        if (!product.sku) {
          console.warn('⚠️ Produit sans SKU ignoré:', product);
          continue;
        }

        // ÉDITION : Ne pas modifier le stock du catalogue, seulement le prix DBC si nécessaire
        const updateData: any = {};
        
        if (product.price_dbc && product.price_dbc > 0) {
          updateData.price_dbc = product.price_dbc;
        }
        
        // Si rien à mettre à jour, passer au suivant
        if (Object.keys(updateData).length === 0) {
          console.log(`ℹ️ Aucune mise à jour nécessaire pour ${product.sku}`);
          updatedProducts.push(product);
          continue;
        }
        
        const { error } = await supabaseAdmin
          .from('products')
          .update(updateData)
          .eq('sku', product.sku);
          
        if (error) {
          console.error(`❌ Erreur mise à jour ${product.sku}:`, error);
        } else {
          updatedProducts.push(product);
          console.log(`✅ Produit ${product.sku} mis à jour (prix DBC seulement)`);
        }
      }
      
      console.log(`✅ ${updatedProducts.length} produits mis à jour`);
    }

    // Si on doit ajouter les produits manquants au catalogue
    if (addToGatalog && editData?.productsToCreateData && Array.isArray(editData.productsToCreateData) && editData.productsToCreateData.length > 0) {
      console.log('➕ Ajout des produits manquants au catalogue...');
      
      const productsToAdd = editData.productsToCreateData.filter((p: any) => p.sku);

      if (productsToAdd.length === 0) {
        console.warn('⚠️ Aucun produit valide à créer');
      } else {
        const batchSize = 50;
        for (let i = 0; i < productsToAdd.length; i += batchSize) {
          const batch = productsToAdd.slice(i, i + batchSize);
          
          console.log(`Insertion batch ${Math.floor(i/batchSize) + 1}: ${batch.length} produits`);
          
          const { data: insertedProducts, error } = await supabaseAdmin
            .from('products')
            .insert(batch)
            .select('sku, product_name, price_dbc');

          if (error) {
            console.error('❌ Erreur insertion batch:', error);
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

    // Préparer tous les produits pour la commande éditée
    let allOrderProducts = [...validProducts];

    if (addToGatalog && newlyAddedProducts.length > 0 && missingProducts && Array.isArray(missingProducts)) {
      const newProductsForOrder = missingProducts.map((missingProduct: any) => {
        const addedProduct = newlyAddedProducts.find(p => p.sku === missingProduct.sku);
        return {
          sku: missingProduct.sku,
          product_name: addedProduct?.product_name || missingProduct.product_name || `Produit ${missingProduct.sku}`,
          quantity: missingProduct.quantity || 0,
          unit_price: addedProduct?.price_dbc || missingProduct.calculated_price_dbc || 0,
          catalog_quantity: missingProduct.quantity || 0
        };
      });
      
      allOrderProducts = [...allOrderProducts, ...newProductsForOrder];
    } else if (!addToGatalog && missingProducts && Array.isArray(missingProducts) && missingProducts.length > 0) {
      const missingProductsForOrder = missingProducts.map((missingProduct: any) => ({
        sku: missingProduct.sku,
        product_name: missingProduct.product_name || `Produit ${missingProduct.sku}`,
        quantity: missingProduct.quantity || 0,
        unit_price: 0,
        catalog_quantity: 0
      }));
      
      allOrderProducts = [...allOrderProducts, ...missingProductsForOrder];
    }

    // Récupérer la commande existante depuis localStorage (ou Supabase)
    // Pour l'instant, on travaille principalement avec localStorage
    
    // Préparer les nouveaux items de la commande
    const orderItems: {[key: string]: number} = {};
    allOrderProducts.forEach((product: any) => {
      if (product.sku && product.quantity > 0) {
        orderItems[product.sku] = product.quantity;
      }
    });

    // Calculer le nouveau total
    const totalAmount = allOrderProducts.reduce((sum: number, product: any) => 
      sum + ((product.unit_price || 0) * (product.quantity || 0)), 0
    );

    const totalItems = allOrderProducts.reduce((sum: number, product: any) => 
      sum + (product.quantity || 0), 0
    );

    const fileName = editData.fileName || 'commande_editee';
    const orderName = `Import ${fileName.replace(/\.[^/.]+$/, "")} (Édité)`;

    // Créer l'objet commande mis à jour
    const updatedOrder = {
      id: orderId,
      name: orderName,
      status: 'editing',
      statusLabel: 'En édition',
      updatedAt: new Date().toISOString(),
      items: orderItems,
      source: 'excel_edit',
      fileName: fileName,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalItems,
      productsCreated: newlyAddedProducts.length,
      productsUpdated: updatedProducts.length,
      missingProducts: addToGatalog ? 0 : (missingProducts?.length || 0),
      editHistory: {
        editedAt: new Date().toISOString(),
        fileName: fileName,
        changes: {
          productsAdded: newlyAddedProducts.length,
          productsUpdated: updatedProducts.length,
          totalProducts: allOrderProducts.length
        }
      }
    };

    // Mettre à jour aussi dans Supabase si possible
    try {
      const { data: existingOrder, error: fetchError } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('name', orderId.replace('IMP-', 'Import '))
        .single();

      if (!fetchError && existingOrder) {
        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update({
            status: 'editing',
            status_label: 'En édition',
            total_amount: updatedOrder.totalAmount,
            total_items: totalItems,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingOrder.id);

        if (updateError) {
          console.warn('⚠️ Erreur mise à jour commande Supabase:', updateError);
        } else {
          console.log('✅ Commande mise à jour dans Supabase');
          
          // Supprimer les anciens items et ajouter les nouveaux
          await supabaseAdmin
            .from('order_items')
            .delete()
            .eq('order_id', existingOrder.id);

          if (allOrderProducts.length > 0) {
            const orderItemsForSupabase = allOrderProducts.map(product => ({
              order_id: existingOrder.id,
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
              console.warn('⚠️ Erreur mise à jour items Supabase:', itemsError);
            } else {
              console.log('✅ Items de commande mis à jour dans Supabase');
            }
          }
        }
      }
    } catch (supabaseError) {
      console.warn('⚠️ Erreur générale mise à jour Supabase:', supabaseError);
    }

    console.log('✅ Commande éditée:', {
      id: orderId,
      name: orderName,
      status: 'editing',
      totalProducts: allOrderProducts.length,
      totalAmount: updatedOrder.totalAmount,
      totalItems,
      productsCreated: newlyAddedProducts.length,
      productsUpdated: updatedProducts.length
    });

    return NextResponse.json({
      success: true,
      orderId,
      orderName,
      order: updatedOrder,
      totalProducts: allOrderProducts.length,
      totalAmount: updatedOrder.totalAmount,
      totalItems,
      productsCreated: newlyAddedProducts.length,
      productsUpdated: updatedProducts.length,
      message: `Commande "${orderName}" éditée avec succès. Statut: En édition. ${newlyAddedProducts.length} nouveaux produits créés, ${updatedProducts.length} produits mis à jour.`
    });

  } catch (error) {
    console.error('❌ Erreur édition commande:', error);
    
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