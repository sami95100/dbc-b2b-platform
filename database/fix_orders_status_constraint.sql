-- Script pour corriger la contrainte de statut des commandes
-- Ce script doit être exécuté si la table orders existe déjà avec l'ancienne contrainte

-- 1. Supprimer l'ancienne contrainte (si elle existe)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- 2. Ajouter la nouvelle contrainte avec tous les statuts utilisés dans l'application
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN ('draft', 'pending', 'processing', 'shipped', 'delivered', 'validated', 'editing'));

-- Vérifier que la contrainte a été ajoutée correctement
SELECT conname, consrc FROM pg_constraint 
WHERE conname = 'orders_status_check' AND conrelid = 'orders'::regclass; 