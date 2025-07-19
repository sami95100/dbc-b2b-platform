#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration requise par environnement
const REQUIRED_VARS = {
  development: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ],
  production: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_API_URL',
    'CORS_ORIGINS'
  ],
  test: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ]
};

// Variables sensibles qui ne doivent pas être loggées
const SENSITIVE_VARS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'FOXWAY_API_KEY',
  'GRAFANA_PASSWORD'
];

class ConfigValidator {
  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.errors = [];
    this.warnings = [];
  }

  validate() {
    console.log('🔧 Validation de la configuration...');
    console.log(`📍 Environnement: ${this.environment}`);
    console.log('');

    this.validateRequiredVars();
    this.validateUrlFormats();
    this.validateSecrets();
    this.checkEnvironmentFile();
    this.validateSupabaseConfig();

    this.printResults();
    return this.errors.length === 0;
  }

  validateRequiredVars() {
    const required = REQUIRED_VARS[this.environment] || REQUIRED_VARS.development;
    
    console.log('📋 Vérification des variables requises...');
    
    for (const varName of required) {
      const value = process.env[varName];
      
      if (!value) {
        this.errors.push(`❌ Variable manquante: ${varName}`);
      } else if (value.includes('your_') || value.includes('change_me')) {
        this.errors.push(`❌ Variable non configurée: ${varName} (contient une valeur d'exemple)`);
      } else {
        const displayValue = SENSITIVE_VARS.includes(varName) 
          ? `${value.substring(0, 8)}...` 
          : value;
        console.log(`  ✅ ${varName}: ${displayValue}`);
      }
    }
    
    console.log('');
  }

  validateUrlFormats() {
    console.log('🌐 Vérification des formats d\'URL...');
    
    const urlVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_API_URL',
      'FOXWAY_API_URL'
    ];

    for (const varName of urlVars) {
      const value = process.env[varName];
      
      if (value && !this.isValidUrl(value)) {
        this.errors.push(`❌ URL invalide: ${varName} = ${value}`);
      } else if (value) {
        console.log(`  ✅ ${varName}: ${value}`);
      }
    }
    
    console.log('');
  }

  validateSecrets() {
    console.log('🔒 Vérification des secrets...');
    
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      if (!serviceRoleKey.startsWith('eyJ')) {
        this.warnings.push(`⚠️  SUPABASE_SERVICE_ROLE_KEY ne ressemble pas à un JWT`);
      } else if (serviceRoleKey.length < 100) {
        this.warnings.push(`⚠️  SUPABASE_SERVICE_ROLE_KEY semble trop court`);
      } else {
        console.log(`  ✅ SUPABASE_SERVICE_ROLE_KEY: Format JWT valide`);
      }
    }

    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (anonKey) {
      if (!anonKey.startsWith('eyJ')) {
        this.warnings.push(`⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY ne ressemble pas à un JWT`);
      } else {
        console.log(`  ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: Format JWT valide`);
      }
    }
    
    console.log('');
  }

  checkEnvironmentFile() {
    console.log('📄 Vérification des fichiers d\'environnement...');
    
    const envFiles = ['.env.local', '.env', '.env.development'];
    let foundEnvFile = false;
    
    for (const fileName of envFiles) {
      if (fs.existsSync(fileName)) {
        console.log(`  ✅ Fichier trouvé: ${fileName}`);
        foundEnvFile = true;
        
        // Vérifier que le fichier n'est pas vide
        const content = fs.readFileSync(fileName, 'utf8').trim();
        if (!content) {
          this.warnings.push(`⚠️  Fichier vide: ${fileName}`);
        }
      }
    }
    
    if (!foundEnvFile) {
      this.warnings.push(`⚠️  Aucun fichier d'environnement trouvé (${envFiles.join(', ')})`);
      console.log(`  💡 Créez un fichier .env.local basé sur env.example`);
    }
    
    console.log('');
  }

  validateSupabaseConfig() {
    console.log('🗄️  Vérification de la configuration Supabase...');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (supabaseUrl) {
      if (!supabaseUrl.includes('.supabase.co')) {
        this.warnings.push(`⚠️  L'URL Supabase ne semble pas standard: ${supabaseUrl}`);
      } else {
        console.log(`  ✅ URL Supabase valide: ${supabaseUrl}`);
      }
      
      // Extraire l'ID du projet
      const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
      if (projectId) {
        console.log(`  📋 ID du projet Supabase: ${projectId}`);
      }
    }
    
    console.log('');
  }

  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  printResults() {
    console.log('📊 RÉSULTATS DE LA VALIDATION');
    console.log('='.repeat(50));
    
    if (this.errors.length === 0) {
      console.log('🎉 Configuration valide !');
    } else {
      console.log(`❌ ${this.errors.length} erreur(s) trouvée(s):`);
      this.errors.forEach(error => console.log(`   ${error}`));
    }
    
    if (this.warnings.length > 0) {
      console.log(`⚠️  ${this.warnings.length} avertissement(s):`);
      this.warnings.forEach(warning => console.log(`   ${warning}`));
    }
    
    console.log('');
    
    if (this.errors.length > 0) {
      console.log('💡 Pour corriger:');
      console.log('   1. Copiez env.example vers .env.local');
      console.log('   2. Remplissez les valeurs manquantes');
      console.log('   3. Relancez ce script');
      console.log('');
    }
  }
}

// Exécution du script
if (require.main === module) {
  const validator = new ConfigValidator();
  const isValid = validator.validate();
  
  process.exit(isValid ? 0 : 1);
}

module.exports = ConfigValidator; 