import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';

// Fonction helper pour vérifier supabaseAdmin
function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Configuration Supabase admin manquante - vérifiez SUPABASE_SERVICE_ROLE_KEY dans .env.local');
  }
  return supabaseAdmin;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = getSupabaseAdmin();
    console.log('📄 Génération facture pour commande:', params.id);

    // Récupérer les détails de la commande
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select(`
        id,
        name,
        status,
        status_label,
        total_amount,
        customer_ref,
        vat_type,
        created_at,
        updated_at
      `)
      .eq('id', params.id)
      .single();

    console.log('🔍 Debug ordre récupérée:', { order, orderError });

    if (orderError) {
      console.error('❌ Erreur Supabase ordre:', orderError);
      return NextResponse.json({ error: 'Commande non trouvée', details: orderError }, { status: 404 });
    }

    if (!order) {
      console.error('❌ Ordre vide mais pas d\'erreur');
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    // Extraire le numéro de tracking depuis customer_ref
    const trackingNumber = order.customer_ref?.startsWith('TRACKING:') 
      ? order.customer_ref.replace('TRACKING:', '') 
      : null;

    // Récupérer les articles de la commande avec leurs détails complets
    const { data: orderItems, error: itemsError } = await admin
      .from('order_items')
      .select('sku, product_name, quantity, unit_price, total_price')
      .eq('order_id', params.id)
      .order('sku');

    console.log('🔍 Debug orderItems récupérés:', { orderItems, itemsError, orderId: params.id });

    if (itemsError) {
      console.error('❌ Erreur récupération articles:', itemsError);
      return NextResponse.json({ error: 'Erreur récupération des articles' }, { status: 500 });
    }

    if (!orderItems || orderItems.length === 0) {
      console.warn('⚠️ Aucun article trouvé pour la commande:', params.id);
    }

    // Récupérer les détails complets des produits depuis le catalogue
    const skus = orderItems?.map(item => item.sku) || [];
    const { data: productDetails, error: productsError } = await admin
      .from('products')
      .select('sku, appearance, functionality, color, boxed, additional_info, price, price_dbc')
      .in('sku', skus);

    console.log('🔍 Debug productDetails récupérés:', { productDetails, productsError });

    // Combiner les données order_items avec les détails produits
    const enrichedItems = orderItems?.map(orderItem => {
      const productDetail = productDetails?.find(p => p.sku === orderItem.sku);
      return {
        ...orderItem,
        appearance: productDetail?.appearance || 'Grade A',
        functionality: productDetail?.functionality || 'Working',
        color: productDetail?.color || '-',
        boxed: productDetail?.boxed || 'Unboxed',
        additional_info: productDetail?.additional_info || '-',
        supplier_price: productDetail?.price || 0,
        catalog_price_dbc: productDetail?.price_dbc || 0
      };
    }) || [];

    // Générer le HTML de la facture
    const invoiceHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Facture ${order.name}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            @page {
                size: A4;
                margin: 15mm;
            }
            
            body { 
                font-family: 'Arial', sans-serif;
                font-size: 10pt;
                line-height: 1.4;
                color: #333;
                background: white;
            }
            
            .invoice-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 30px;
                border-bottom: 1px solid #ddd;
                padding-bottom: 20px;
            }
            
            .logo-section {
                flex: 1;
            }
            
            .logo {
                font-size: 36px;
                font-weight: bold;
                color: #10B981;
                letter-spacing: -1px;
            }
            
            .invoice-details {
                text-align: right;
                flex: 1;
            }
            
            .invoice-details table {
                margin-left: auto;
                border-collapse: collapse;
            }
            
            .invoice-details td {
                padding: 3px 8px;
                border: 1px solid #ddd;
            }
            
            .invoice-details .header-cell {
                background-color: #f8f9fa;
                font-weight: bold;
            }
            
            .addresses-section {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
            }
            
            .address-block {
                flex: 1;
                margin-right: 20px;
            }
            
            .address-block:last-child {
                margin-right: 0;
            }
            
            .address-title {
                font-weight: bold;
                margin-bottom: 8px;
                color: #555;
            }
            
            .address-content {
                font-size: 9pt;
                line-height: 1.3;
            }
            
            .payment-terms {
                margin: 20px 0;
                padding: 10px;
                background-color: #f8f9fa;
                border: 1px solid #ddd;
            }
            
            .payment-terms table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .payment-terms td {
                padding: 4px 8px;
                border: 1px solid #ddd;
            }
            
            .products-title {
                font-weight: bold;
                margin: 20px 0 10px 0;
                color: #333;
            }
            
            .products-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }
            
            .products-table th,
            .products-table td {
                border: 1px solid #ddd;
                padding: 6px 4px;
                text-align: left;
                font-size: 8pt;
            }
            
            .products-table th {
                background-color: #f8f9fa;
                font-weight: bold;
                text-align: center;
            }
            
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            
            .totals-section {
                margin-top: 20px;
                display: flex;
                justify-content: flex-end;
            }
            
            .totals-table {
                border-collapse: collapse;
            }
            
            .totals-table td {
                padding: 4px 12px;
                border: 1px solid #ddd;
            }
            
            .totals-table .total-label {
                background-color: #f8f9fa;
                font-weight: bold;
            }
            
            .vat-info {
                margin: 20px 0;
                font-size: 8pt;
                color: #666;
                border-top: 1px solid #ddd;
                padding-top: 10px;
            }
            
            .footer-section {
                margin-top: 30px;
                display: flex;
                justify-content: space-between;
                font-size: 8pt;
                color: #666;
                border-top: 1px solid #ddd;
                padding-top: 15px;
            }
            
            .bank-details,
            .supplier-details {
                flex: 1;
                margin-right: 20px;
            }
            
            .supplier-details {
                margin-right: 0;
            }
            
            .section-title {
                font-weight: bold;
                margin-bottom: 5px;
                color: #333;
            }
            
            @media print {
                body { margin: 0; }
                .no-print { display: none; }
            }
        </style>
    </head>
    <body>
        <!-- En-tête avec logo et détails facture -->
        <div class="invoice-header">
            <div class="logo-section">
                <div class="logo">DBC</div>
            </div>
            <div class="invoice-details">
                <table>
                    <tr>
                        <td class="header-cell">Facture:</td>
                        <td>${order.id.slice(-8).toUpperCase()}</td>
                    </tr>
                    <tr>
                        <td class="header-cell">Date facture:</td>
                        <td>${new Date().toLocaleDateString('fr-FR')}</td>
                    </tr>
                    <tr>
                        <td class="header-cell">Termes paiement:</td>
                        <td>Prépaiement</td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- Adresses -->
        <div class="addresses-section">
            <div class="address-block">
                <div class="address-title">Adresse de facturation</div>
                <div class="address-content">
                    <strong>Société:</strong> DBC<br>
                    <strong>Adresse:</strong> 110 Avenue de Villiers, 75017, Paris, France<br><br>
                    <strong>Contact:</strong> Service Commercial<br>
                    <strong>N° TVA:</strong> FR28922178488
                </div>
            </div>
            <div class="address-block">
                <div class="address-title">Adresse de livraison</div>
                <div class="address-content">
                    <strong>Société:</strong> ${order.customer_ref?.replace('TRACKING:', '') || 'Client'}<br>
                    <strong>Adresse:</strong> 110 Avenue de Villiers, 75017, Paris, France<br><br>
                    <strong>Nom contact:</strong> ${order.customer_ref?.replace('TRACKING:', '') || 'Client'}<br>
                    <strong>N° contact:</strong> +33076644427
                </div>
            </div>
        </div>

        <!-- Conditions de paiement -->
        <div class="payment-terms">
            <table>
                <tr>
                    <td style="background-color: #f8f9fa; font-weight: bold;">Prépaiement</td>
                    <td style="background-color: #f8f9fa; font-weight: bold;">Devise</td>
                    <td style="background-color: #f8f9fa; font-weight: bold;">EUR</td>
                </tr>
                <tr>
                    <td colspan="3" style="font-size: 8pt;">Si la commande n'a pas été payée sous 7 jours, nous avons le droit d'annuler la commande</td>
                </tr>
            </table>
            <div style="margin-top: 8px; font-size: 8pt; color: #e74c3c;">
                Veuillez inclure le numéro de facture <strong>${order.id.slice(-8).toUpperCase()}</strong> dans l'explication du paiement
            </div>
        </div>

        <!-- Produits -->
        <div class="products-title">Appareils mobiles</div>
        <table class="products-table">
            <thead>
                <tr>
                    <th>Type</th>
                    <th>Nom du produit</th>
                    <th>Apparence</th>
                    <th>Fonctionnalité</th>
                    <th>Emballage</th>
                    <th>Couleur</th>
                    <th>Cloud Lock</th>
                    <th>Info supplémentaire</th>
                    <th>Unités</th>
                    <th>Prix</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${enrichedItems.map(item => `
                <tr>
                    <td class="text-center">Mobiles</td>
                    <td>${item.product_name}</td>
                    <td class="text-center">${item.appearance.replace('Grade ', '')}</td>
                    <td class="text-center">${item.functionality}</td>
                    <td class="text-center">${item.boxed}</td>
                    <td class="text-center">${item.color}</td>
                    <td class="text-center">CloudOFF</td>
                    <td class="text-center">${item.additional_info}</td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-right">${item.unit_price.toFixed(2)}</td>
                    <td class="text-right">${item.total_price.toFixed(2)}</td>
                </tr>
                `).join('')}
                <tr>
                    <td colspan="9"></td>
                    <td class="text-center"><strong>${enrichedItems.reduce((sum, item) => sum + item.quantity, 0)}</strong></td>
                    <td></td>
                </tr>
            </tbody>
        </table>

        <!-- Totaux -->
        <div class="totals-section">
            <table class="totals-table">
                <tr>
                    <td class="total-label">Total net</td>
                    <td class="text-right">${order.total_amount.toFixed(2)}</td>
                </tr>
                <tr>
                    <td class="total-label">Total brut</td>
                    <td class="text-right">${order.total_amount.toFixed(2)}</td>
                </tr>
            </table>
        </div>

        <!-- Informations TVA -->
        <div class="vat-info">
            <strong>Régime de TVA sur la marge, Art.313 de la Directive du Conseil 2006/112/CE</strong><br>
            DBC s'attend à ce que toutes les factures émises soient réglées par les destinataires prévus. Selon nos Conditions Générales de Vente, vous vous engagez à nous informer si des circonstances exceptionnelles où un tiers a l'intention de payer des factures émises à votre nom. Une enquête concernant tous ces cas de vente exceptionnels sera initiée. Nous pouvons demander des documents supplémentaires, rejeter ou annuler la commande si nous ne sommes pas satisfaits. Veuillez consulter nos Conditions Générales sur votre page de compte pour plus de détails.<br><br>
            <strong>Veuillez inclure le numéro de facture dans la référence de paiement pour assurer un traitement rapide et l'expédition de votre commande. Ne pas le faire peut entraîner des retards.</strong>
        </div>

        <!-- Pied de page -->
        <div class="footer-section">
            <div class="bank-details">
                <div class="section-title">Bénéficiaire: DBC</div><br>
                <div class="section-title">Détails bancaires</div>
                <strong>Nom:</strong> Crédit Agricole<br>
                <strong>Adresse:</strong> 110 Avenue de Villiers, 75017, Paris, France<br>
                <strong>Swift/BIC:</strong> AGRIFRPP<br>
                <strong>IBAN:</strong> FR1234567890123456789
            </div>
            <div class="supplier-details">
                <div class="section-title">Détails fournisseur</div>
                <strong>Nom:</strong> DBC<br>
                <strong>Adresse:</strong> 110 Avenue de Villiers, 75017, Paris, France<br>
                <strong>N° TVA:</strong> FR28922178488<br>
                <strong>N° Reg.:</strong> 922178488<br><br>
                <em>Propulsé par DBC</em>
            </div>
        </div>

        <script>
            // Auto-print when loaded
            window.onload = function() {
                setTimeout(() => {
                    window.print();
                }, 500);
            }
        </script>
    </body>
    </html>
    `;

    return new NextResponse(invoiceHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      }
    });

  } catch (error) {
    console.error('❌ Erreur génération facture:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur génération facture' },
      { status: 500 }
    );
  }
} 