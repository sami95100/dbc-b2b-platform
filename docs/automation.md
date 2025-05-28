# Workflow d'Automatisation DBC B2B

## Vue d'ensemble du processus

Le workflow suit le parcours complet depuis la réception du stock fournisseur jusqu'au paiement client.

## Étapes du workflow

### 1. Réception du stock fournisseur

**Actuel**: Import manuel du fichier Excel quotidien
**Futur**: Synchronisation automatique via API Foxway

```python
# Tâche Celery quotidienne
@celery.task
def sync_daily_catalog():
    if FOXWAY_API_ENABLED:
        catalog = foxway_client.get_catalog()
    else:
        catalog = process_uploaded_file()
    transform_and_store_catalog(catalog)
```

### 2. Transformation catalogue

- Application automatique des marges (1% ou 11%)
- Stockage en base de données
- Historisation des prix

### 3. Mise à disposition client

- Catalogue en ligne avec filtres
- Prix DBC appliqués
- Stock temps réel (futur)

### 4. Commande client

**Processus**:

1. Sélection produits + quantités
2. Validation panier
3. Génération commande draft

### 5. Validation fournisseur

**Actuel**: Export Excel → Email → Import réponse
**Futur**: API directe

```python
# Future intégration
async def validate_order_with_supplier(order_id):
    order = get_order(order_id)
    foxway_response = await foxway_client.create_order(order)
    update_order_status(order_id, foxway_response)
```

### 6. Ajustements stock

- Gestion ruptures de stock
- Mise à jour quantités
- Notification client si changements

### 7. Application prix DBC

- Script `apply_dbc_prices_to_order.py`
- Génération facture pro forma

### 8. Paiement client

**Options**:

- Virement bancaire
- Paiement en ligne (futur)
- Crédit client B2B

### 9. Expédition

- Confirmation paiement
- Génération bon de livraison
- Tracking number

### 10. Facture finale

- Script `process_imei_order.py`
- Export CSV pour comptabilité
- Archivage

## Automatisations prioritaires

### Phase 1 (Court terme)

1. **Import catalogue automatique**

   - Upload programmé
   - Transformation automatique
   - Notification completion

2. **Génération commandes**
   - Template Excel automatique
   - Pré-remplissage données client

### Phase 2 (Moyen terme)

1. **Validation fournisseur**

   - Envoi automatique par email
   - Parsing réponse
   - Mise à jour statuts

2. **Notifications**
   - Ruptures de stock
   - Changements de prix
   - Statuts commande

### Phase 3 (Long terme)

1. **API Foxway complète**

   - Catalogue temps réel
   - Commandes directes
   - Webhooks événements

2. **Paiement intégré**
   - Gateway B2B
   - Crédit clients
   - Facturation automatique

## Configuration des tâches

### Celery Beat (Tâches programmées)

```python
CELERY_BEAT_SCHEDULE = {
    'sync-catalog': {
        'task': 'tasks.sync_daily_catalog',
        'schedule': crontab(hour=7, minute=0),  # 7h00 chaque jour
    },
    'check-pending-orders': {
        'task': 'tasks.check_pending_orders',
        'schedule': crontab(minute='*/30'),  # Toutes les 30 min
    },
    'cleanup-old-catalogs': {
        'task': 'tasks.cleanup_old_catalogs',
        'schedule': crontab(hour=2, minute=0, day_of_week=0),  # Dimanche 2h
    },
}
```

### Événements déclencheurs

```python
# Webhooks / Signals
@order_created.connect
def on_order_created(order):
    send_to_supplier.delay(order.id)
    notify_admin.delay(order.id)

@payment_received.connect
def on_payment_received(payment):
    process_shipment.delay(payment.order_id)
    generate_invoice.delay(payment.order_id)
```

## Monitoring et alertes

### KPIs à suivre

- Temps moyen validation commande
- Taux de rupture de stock
- Délai traitement commandes
- Taux d'erreur transformations

### Alertes critiques

- Échec import catalogue
- Commande bloquée > 24h
- Stock critique sur produits populaires
- Écart prix important détecté

## Intégration avec systèmes existants

### ERP/Comptabilité

- Export automatique factures
- Synchronisation clients
- Rapprochement paiements

### Logistique

- Interface transporteur
- Génération étiquettes
- Suivi colis

### CRM

- Historique commandes
- Préférences clients
- Analytics ventes
