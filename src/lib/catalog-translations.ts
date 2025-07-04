// Traductions pour le catalogue - Frontend uniquement
// Les valeurs en base restent en anglais, on traduit uniquement l'affichage

export const CATALOG_TRANSLATIONS = {
  // Additional Info
  additional_info: {
    'Brand New Battery': 'Batterie 100%',
    'Broken seal': 'Emballage ouvert',
    'Chip/Crack': 'Traces sur les cotés',
    'Discoloration': 'Décoloration',
    'Engraving Removed': 'Traces de Gravure',
    'Heavy cosmetic wear': 'Traces d\'usure Très Prononcé',
    'Other': 'Autre',
    'Premium Refurbished': 'Reconditionné premium',
    'Reduced Battery Performance': 'Batterie < 80%',
    'True Tone Missing': 'Pas de True Tone'
  },

  // Apparences
  appearance: {
    'Brand New': 'Neuf sous blister',
    'Grade A+': 'Grade A+',
    'Grade A': 'Grade A',
    'Grade AB': 'Grade AB',
    'Grade B': 'Grade B',
    'Grade BC': 'Grade BC',
    'Grade C': 'Grade C',
    'Grade C+': 'Grade C+'
  },

  // Boîte
  boxed: {
    'Original Box': 'Boîte d\'origine',
    'Premium Unboxed': 'Sans boîte',
    'Unboxed': 'Sans boîte'
  },

  // Fonctionnalités (à ne plus afficher)
  functionality: {
    'Working': 'Fonctionnel',
    'Minor Fault': 'Défaut mineur'
  },

  // Labels d'interface
  interface_labels: {
    'Manufacturer': 'Fabricant',
    'Appearance': 'Apparence',
    'Boxed': 'Boîte',
    'Color': 'Couleur',
    'Additional Info': 'Info supplémentaire',
    'Price': 'Prix',
    'Quantity': 'Quantité',
    'From': 'De',
    'To': 'À',
    'Reset filters': 'Réinitialiser les filtres',
    'All': 'Tout',
    'Select all': 'Tout sélectionner',
    'Deselect all': 'Tout désélectionner'
  }
} as const;

// Fonction helper pour traduire
export function translateCatalogTerm(
  category: keyof typeof CATALOG_TRANSLATIONS,
  term: string | null | undefined
): string {
  if (!term) return '';
  
  const translations = CATALOG_TRANSLATIONS[category];
  return (translations as any)[term] || term;
}

// Fonction helper pour traduire les labels d'interface
export function translateInterfaceLabel(label: string): string {
  return CATALOG_TRANSLATIONS.interface_labels[label as keyof typeof CATALOG_TRANSLATIONS.interface_labels] || label;
}

// Constantes pour les filtres
export const MANUFACTURERS = ['Apple', 'Samsung', 'Xiaomi', 'Google', 'Huawei', 'OnePlus', 'Motorola', 'Honor', 'Oppo', 'Realme', 'Sony', 'LG', 'TCL', 'Nokia', 'Vivo', 'Asus', 'ZTE', 'Nothing', 'Gigaset', 'HTC'];

// Constantes anglaises pour les filtres (valeurs backend)
export const APPEARANCES_EN = ['Brand New', 'Grade A+', 'Grade A', 'Grade AB', 'Grade B', 'Grade BC', 'Grade C', 'Grade C+'];
export const BOXED_OPTIONS_EN = ['Original Box', 'Premium Unboxed', 'Unboxed'];

// Constantes françaises pour l'affichage
export const APPEARANCES_FR = [
  'Neuf sous blister',
  'Grade A+', 
  'Grade A', 
  'Grade AB', 
  'Grade B', 
  'Grade BC', 
  'Grade C', 
  'Grade C+'
];

export const BOXED_OPTIONS_FR = [
  'Boîte d\'origine',
  'Sans boîte',
  'Sans boîte'
];

export const ADDITIONAL_INFO_OPTIONS_FR = [
  'Batterie 100%',
  'Emballage ouvert',
  'Traces sur les cotés',
  'Décoloration',
  'Traces de Gravure',
  'Traces d\'usure Très Prononcé',
  'Autre',
  'Reconditionné premium',
  'Batterie < 80%',
  'Pas de True Tone'
];

// Fonction pour obtenir la valeur originale depuis la traduction
export function getOriginalTerm(
  category: keyof typeof CATALOG_TRANSLATIONS,
  translatedTerm: string
): string {
  const translations = CATALOG_TRANSLATIONS[category];
  const entry = Object.entries(translations).find(([_, translation]) => translation === translatedTerm);
  return entry ? entry[0] : translatedTerm;
}

// Fonction pour convertir les valeurs françaises vers les valeurs anglaises pour les filtres
export function frenchToEnglishValue(frenchValue: string, category: 'appearance' | 'boxed'): string {
  return getOriginalTerm(category, frenchValue);
} 