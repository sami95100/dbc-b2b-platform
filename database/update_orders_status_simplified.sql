-- Script pour simplifier les statuts des commandes selon les vrais besoins métier
-- Les 4 statuts métier : brouillons, en attente de paiement, en cours de livraison, terminé

-- 1. D'ABORD supprimer l'ancienne contrainte pour permettre les UPDATE
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- 2. ENSUITE mettre à jour les commandes existantes pour mapper vers les nouveaux statuts
UPDATE orders SET status = 'draft' WHERE status IN ('draft', 'editing');
UPDATE orders SET status = 'pending_payment' WHERE status IN ('pending', 'validated');
UPDATE orders SET status = 'shipping' WHERE status IN ('processing', 'shipped');
UPDATE orders SET status = 'completed' WHERE status = 'delivered';

-- 3. ENFIN ajouter la nouvelle contrainte avec les 4 statuts métier
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN ('draft', 'pending_payment', 'shipping', 'completed'));

-- 4. Vérifier que la contrainte a été ajoutée correctement (syntaxe PostgreSQL récent)
SELECT conname, pg_get_constraintdef(oid) as definition 
FROM pg_constraint 
WHERE conname = 'orders_status_check' AND conrelid = 'orders'::regclass;

-- 5. Vérifier la répartition des statuts après migration
SELECT status, COUNT(*) as count FROM orders GROUP BY status ORDER BY status; 