import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../lib/supabase';
import { calculateShippingCost } from '../../../../../lib/shipping';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = getSupabaseAdmin();
    
    if (!admin) {
      return NextResponse.json({ error: 'Configuration Supabase admin manquante' }, { status: 500 });
    }
    
    console.log('📄 Génération facture pour commande:', params.id);

    // Fonctions pour harmoniser la terminologie
    const getDisplayFunctionality = (functionality: string) => {
      switch(functionality) {
        case 'Minor Fault': return 'Grades x';
        case 'Working': return 'Stockage de base';
        default: return functionality;
      }
    };

    const getDisplayAppearance = (appearance: string, functionality: string) => {
      if (functionality === 'Minor Fault') {
        // Changer C+x en Cx+
        return appearance.replace('Grade C+', 'Grade Cx') + 'x';
      }
      return appearance;
    };

    // Récupérer les détails de la commande avec les informations utilisateur
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
        free_shipping,
        created_at,
        updated_at,
        user_id,
        users (
          company_name,
          contact_name,
          email,
          phone,
          address_line1,
          address_line2,
          city,
          postal_code,
          country
        )
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

    // Extraire les informations utilisateur
    const userInfo = Array.isArray(order.users) ? order.users[0] : order.users;

    // Récupérer les articles de la commande avec leurs détails complets
    const { data: orderItems, error: itemsError } = await admin
      .from('order_items')
      .select('sku, product_name, quantity, unit_price, total_price')
      .eq('order_id', params.id)
      .order('sku');

    if (itemsError) {
      console.error('❌ Erreur récupération articles:', itemsError);
      return NextResponse.json({ error: 'Erreur récupération articles', details: itemsError }, { status: 500 });
    }

    if (!orderItems || orderItems.length === 0) {
      console.error('❌ Aucun article trouvé pour cette commande');
      return NextResponse.json({ error: 'Aucun article trouvé' }, { status: 404 });
    }

    // Récupérer les détails des produits depuis le catalogue
    const skus = orderItems.map(item => item.sku);
    const { data: products, error: productsError } = await admin
      .from('products')
      .select('sku, appearance, functionality, color, boxed, additional_info')
      .in('sku', skus);

    if (productsError) {
      console.warn('⚠️ Erreur récupération produits:', productsError);
    }

    // Créer un map des produits pour un accès rapide
    const productsMap = new Map();
    products?.forEach(product => {
      productsMap.set(product.sku, product);
    });

    // Calculer les frais de livraison
    const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const shippingCost = order.free_shipping ? 0 : calculateShippingCost(totalItems);
    const totalWithShipping = order.total_amount + shippingCost;

    // Construire les lignes de produits pour la facture
    const productRows = orderItems.map(item => {
      const product = productsMap.get(item.sku);
      const displayAppearance = product ? getDisplayAppearance(product.appearance, product.functionality) : 'Grade A';
      const displayColor = product?.color || '';
      const displayInfo = product?.additional_info || '';

      return `
        <tr>
          <td>Mobiles</td>
          <td>${item.product_name}</td>
          <td class="text-center">${displayAppearance}</td>
          <td class="text-center">${displayInfo}</td>
          <td class="text-center">${displayColor}</td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-center">${item.unit_price.toFixed(2)}€</td>
          <td class="text-center">${item.total_price.toFixed(2)}€</td>
        </tr>
      `;
    }).join('');

    // Construire l'en-tête du tableau
    const tableHeader = `
      <tr style="background-color: #f5f5f5;">
        <th>Type</th>
        <th>Nom du produit</th>
        <th>Apparence</th>
        <th>Infos</th>
        <th>Couleur</th>
        <th>Unités</th>
        <th>Prix</th>
        <th>Total</th>
      </tr>
    `;

    // Ajouter la ligne de livraison
    const shippingRow = `
      <tr class="border-t-2 border-gray-200">
        <td>Livraison</td>
        <td>Frais de livraison</td>
        <td class="text-center">-</td>
        <td class="text-center">-</td>
        <td class="text-center">-</td>
        <td class="text-center">1</td>
        <td class="text-center">${order.free_shipping ? '0.00' : shippingCost.toFixed(2)}€</td>
        <td class="text-center">${order.free_shipping ? '0.00' : shippingCost.toFixed(2)}€</td>
      </tr>
    `;

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
                font-size: 24px;
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
                <div class="logo">DBC PARIS 17 BIS</div>
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
                    <strong>Société:</strong> DBC PARIS 17 BIS<br>
                    <strong>Adresse:</strong> 110 Avenue de Villiers, 75017, Paris, France<br><br>
                    <strong>Contact:</strong> Service Commercial<br>
                    <strong>N° TVA:</strong> FR28922178488
                </div>
            </div>
            <div class="address-block">
                <div class="address-title">Adresse de livraison</div>
                <div class="address-content">
                    <strong>Société:</strong> ${userInfo?.company_name || 'Client'}<br>
                    <strong>Adresse:</strong> ${userInfo?.address_line1 || ''} ${userInfo?.address_line2 || ''}, ${userInfo?.postal_code || ''}, ${userInfo?.city || ''}, ${userInfo?.country || 'France'}<br><br>
                    <strong>Nom contact:</strong> ${userInfo?.contact_name || userInfo?.email || 'Client'}<br>
                    <strong>N° contact:</strong> ${userInfo?.phone || 'Non renseigné'}
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
                ${tableHeader}
            </thead>
            <tbody>
                ${productRows}
                ${shippingRow}
            </tbody>
        </table>

        <!-- Totaux -->
        <div class="totals-section">
            <table class="totals-table">
                <tr>
                    <td class="total-label">Total net</td>
                    <td class="text-right">${totalWithShipping.toFixed(2)}€</td>
                </tr>
                <tr>
                    <td class="total-label">Total brut</td>
                    <td class="text-right">${totalWithShipping.toFixed(2)}€</td>
                </tr>
            </table>
        </div>

        <!-- Informations TVA -->
        <div class="vat-info">
            ${order.vat_type && order.vat_type.includes('autoliquidation') ? `
                <strong>TVA 0% - Autoliquidation, Art.138 de la Directive du Conseil 2006/112/CE</strong><br>
                Cette facture concerne des biens d'occasion soumis au régime d'autoliquidation. La TVA est due par l'acquéreur selon les dispositions européennes applicables.
            ` : `
                <strong>Régime de TVA sur la marge, Art.313 de la Directive du Conseil 2006/112/CE</strong><br>
                Cette facture concerne des biens d'occasion soumis au régime de TVA sur la marge. La TVA n'est pas récupérable par l'acquéreur.
            `}
            <br><br>
            DBC s'attend à ce que toutes les factures émises soient réglées par les destinataires prévus. Selon nos Conditions Générales de Vente, vous vous engagez à nous informer si des circonstances exceptionnelles où un tiers a l'intention de payer des factures émises à votre nom. Une enquête concernant tous ces cas de vente exceptionnels sera initiée. Nous pouvons demander des documents supplémentaires, rejeter ou annuler la commande si nous ne sommes pas satisfaits. Veuillez consulter nos Conditions Générales sur votre page de compte pour plus de détails.<br><br>
            <strong>Veuillez inclure le numéro de facture dans la référence de paiement pour assurer un traitement rapide et l'expédition de votre commande. Ne pas le faire peut entraîner des retards.</strong>
        </div>

        <!-- Pied de page -->
        <div class="footer-section">
            <div class="bank-details">
                <div class="section-title">Bénéficiaire: DBC PARIS 17 BIS</div><br>
                <div class="section-title">Détails bancaires</div>
                <strong>IBAN:</strong> FR7616958000013693245390793<br>
                <strong>BIC:</strong> QNTOFRP1XXX<br>
                <strong>Adresse du titulaire:</strong> DBC PARIS 17 BIS, 110 AVENUE DE VILLIERS, 75017, PARIS, FR
            </div>
            <div class="supplier-details">
                <div class="section-title">Détails fournisseur</div>
                <strong>Nom:</strong> DBC PARIS 17 BIS<br>
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