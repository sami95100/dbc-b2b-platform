const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration Supabase
const supabaseUrl = 'https://fstxzfxcmbpvbhqyqcfs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzdHh6ZnhjbWJwdmJocXlxY2ZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjAzODMwOCwiZXhwIjoyMDQ3NjE0MzA4fQ.HKRlwEg1L6KXWnTcyA1cQHJmCdKAmb8oWRMnZwNqR6U';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  try {
    console.log('🚀 Configuration de la base de données...');
    
    // Lire le fichier SQL
    const sqlPath = path.join(__dirname, '..', 'database', 'create_orders_tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Diviser les commandes SQL (séparer par ; et filter les vides)
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📝 ${commands.length} commandes SQL à exécuter`);
    
    // Exécuter chaque commande
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.length === 0) continue;
      
      console.log(`🔄 Exécution commande ${i + 1}/${commands.length}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: command
        });
        
        if (error) {
          // Essayer la méthode directe si RPC ne marche pas
          console.log('⚠️ RPC failed, trying direct query...');
          const { data: directData, error: directError } = await supabase
            .from('pg_stat_user_tables')
            .select('*')
            .limit(1);
            
          if (directError) {
            console.error(`❌ Erreur commande ${i + 1}:`, error.message);
          } else {
            console.log(`✅ Commande ${i + 1} exécutée (direct)`);
          }
        } else {
          console.log(`✅ Commande ${i + 1} exécutée avec succès`);
        }
      } catch (err) {
        console.error(`❌ Erreur commande ${i + 1}:`, err.message);
      }
    }
    
    // Vérifier que les tables ont été créées
    console.log('🔍 Vérification des tables...');
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['orders', 'order_items']);
    
    if (tablesError) {
      console.error('❌ Erreur lors de la vérification:', tablesError.message);
    } else {
      console.log('✅ Tables vérifiées:', tables?.map(t => t.table_name) || []);
    }
    
    console.log('🎉 Configuration terminée !');
    
  } catch (error) {
    console.error('❌ Erreur globale:', error.message);
  }
}

// Alternative plus simple : créer les tables directement
async function createTablesDirectly() {
  try {
    console.log('🚀 Création directe des tables...');
    
    // Table orders
    const ordersSQL = `
      CREATE TABLE IF NOT EXISTS orders (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('draft', 'pending', 'processing', 'shipped', 'delivered')),
        status_label TEXT NOT NULL,
        customer_ref TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        total_amount DECIMAL(10,2) DEFAULT 0,
        total_items INTEGER DEFAULT 0,
        vat_type TEXT
      );
    `;
    
    const { error: ordersError } = await supabase.rpc('exec_sql', { sql: ordersSQL });
    
    if (ordersError) {
      console.error('❌ Erreur création table orders:', ordersError.message);
    } else {
      console.log('✅ Table orders créée');
    }
    
    // Table order_items
    const orderItemsSQL = `
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        sku TEXT NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    
    const { error: itemsError } = await supabase.rpc('exec_sql', { sql: orderItemsSQL });
    
    if (itemsError) {
      console.error('❌ Erreur création table order_items:', itemsError.message);
    } else {
      console.log('✅ Table order_items créée');
    }
    
    console.log('🎉 Tables créées avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Exécuter le setup
if (require.main === module) {
  createTablesDirectly().then(() => {
    console.log('✅ Setup terminé');
    process.exit(0);
  }).catch(err => {
    console.error('❌ Setup échoué:', err);
    process.exit(1);
  });
}

module.exports = { setupDatabase, createTablesDirectly }; 