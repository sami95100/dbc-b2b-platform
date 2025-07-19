import { supabase, supabaseAdmin } from '@/lib/supabase';
import { 
  Product, 
  CatalogImportResult, 
  CatalogFilter, 
  CatalogSortOptions, 
  PaginatedCatalogResponse 
} from './types';
import { logError, logInfo, logBusinessMetric } from '@/middleware/request-context';

export class CatalogService {
  private requestId: string;

  constructor(requestId: string = 'unknown') {
    this.requestId = requestId;
  }

  /**
   * Import atomique du catalogue depuis un fichier Excel
   */
  async importCatalog(
    fileBuffer: Buffer, 
    fileName: string,
    userId: string
  ): Promise<CatalogImportResult> {
    const startTime = Date.now();
    logInfo(this.requestId, `Starting catalog import: ${fileName}`);

    // Utiliser une transaction pour garantir l'atomicité
    const client = supabaseAdmin;
    if (!client) {
      throw new Error('Admin client not available');
    }

    try {
      // 1. Traitement du fichier Excel
      const processedData = await this.processExcelFile(fileBuffer, fileName);
      
      // 2. Validation des données
      const validationResult = await this.validateProductData(processedData);
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      // 3. Début de la transaction atomique
      logInfo(this.requestId, 'Starting atomic transaction for catalog import');
      
      // Créer une sauvegarde de l'état actuel
      const backupResult = await this.createCatalogBackup();
      
      let importResult: CatalogImportResult;
      
      try {
        // 4. Import des données
        importResult = await this.performAtomicImport(processedData, userId);
        
        // 5. Validation post-import
        const postValidation = await this.validateImportResult(importResult);
        if (!postValidation.isValid) {
          throw new Error(`Post-import validation failed: ${postValidation.errors.join(', ')}`);
        }

        // 6. Succès - nettoyer la sauvegarde
        await this.cleanupBackup(backupResult.backupId);
        
        logBusinessMetric(this.requestId, 'catalog_import_success', importResult.importedProducts, {
          fileName,
          userId,
          duration: (Date.now() - startTime).toString()
        });

        logInfo(this.requestId, `Catalog import completed successfully: ${importResult.importedProducts} products`);
        
        return importResult;

      } catch (importError) {
        // Rollback en cas d'erreur
        logError(this.requestId, importError as Error, { fileName, userId });
        await this.rollbackFromBackup(backupResult.backupId);
        throw importError;
      }

    } catch (error) {
      logError(this.requestId, error as Error, { fileName, userId });
      logBusinessMetric(this.requestId, 'catalog_import_failure', 1, {
        fileName,
        userId,
        error: (error as Error).message
      });
      
      throw new Error(`Catalog import failed: ${(error as Error).message}`);
    }
  }

  /**
   * Recherche paginée dans le catalogue
   */
  async searchCatalog(
    filter: CatalogFilter,
    sort: CatalogSortOptions,
    page: number = 1,
    pageSize: number = 50
  ): Promise<PaginatedCatalogResponse> {
    try {
      logInfo(this.requestId, 'Searching catalog', { filter, sort, page, pageSize });

      let query = supabase
        .from('products')
        .select('*', { count: 'exact' });

      // Appliquer les filtres
      if (filter.search) {
        query = query.ilike('product_name', `%${filter.search}%`);
      }
      
      if (filter.category) {
        query = query.eq('item_group', filter.category);
      }
      
      if (filter.appearance) {
        query = query.eq('appearance', filter.appearance);
      }
      
      if (filter.functionality) {
        query = query.eq('functionality', filter.functionality);
      }
      
      if (filter.boxed) {
        query = query.eq('boxed', filter.boxed);
      }
      
      if (filter.color) {
        query = query.eq('color', filter.color);
      }
      
      if (filter.priceMin !== undefined) {
        query = query.gte('price_dbc', filter.priceMin);
      }
      
      if (filter.priceMax !== undefined) {
        query = query.lte('price_dbc', filter.priceMax);
      }
      
      if (filter.isActive !== undefined) {
        query = query.eq('is_active', filter.isActive);
      }
      
      if (filter.inStock) {
        query = query.gt('quantity', 0);
      }

      // Appliquer le tri
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });

      // Appliquer la pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      const totalPages = Math.ceil((count || 0) / pageSize);

      return {
        products: data || [],
        total: count || 0,
        page,
        pageSize,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      };

    } catch (error) {
      logError(this.requestId, error as Error, { filter, sort, page, pageSize });
      throw new Error(`Catalog search failed: ${(error as Error).message}`);
    }
  }

  /**
   * Traite le fichier Excel et extrait les données
   */
  private async processExcelFile(fileBuffer: Buffer, fileName: string): Promise<any[]> {
    // TODO: Implémenter le traitement Excel avec la logique existante
    // Réutiliser la logique de backend/scripts/catalog_processor.py
    logInfo(this.requestId, `Processing Excel file: ${fileName}`);
    
    // Pour l'instant, retourner un tableau vide
    return [];
  }

  /**
   * Valide les données du produit
   */
  private async validateProductData(data: any[]): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    for (let index = 0; index < data.length; index++) {
      const product = data[index];
      if (!product.sku) {
        errors.push(`Line ${index + 1}: SKU is required`);
      }
      
      if (!product.product_name) {
        errors.push(`Line ${index + 1}: Product name is required`);
      }
      
      if (typeof product.price !== 'number' || product.price < 0) {
        errors.push(`Line ${index + 1}: Invalid price`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Crée une sauvegarde du catalogue actuel
   */
  private async createCatalogBackup(): Promise<{ backupId: string }> {
    const backupId = `backup_${Date.now()}`;
    logInfo(this.requestId, `Creating catalog backup: ${backupId}`);
    
    // TODO: Implémenter la sauvegarde
    return { backupId };
  }

  /**
   * Effectue l'import atomique
   */
  private async performAtomicImport(data: any[], userId: string): Promise<CatalogImportResult> {
    // TODO: Implémenter l'import atomique avec upsert
    return {
      success: true,
      importedProducts: data.length,
      updatedProducts: 0,
      newProducts: data.length,
      errors: [],
      warnings: [],
      stats: {
        total_processed: data.length,
        marginal: 0,
        non_marginal: data.length,
        active_products: data.length,
        out_of_stock: 0
      },
      processedAt: new Date().toISOString(),
      requestId: this.requestId
    };
  }

  /**
   * Valide le résultat de l'import
   */
  private async validateImportResult(result: CatalogImportResult): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    if (result.importedProducts === 0) {
      errors.push('No products were imported');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Nettoie la sauvegarde après succès
   */
  private async cleanupBackup(backupId: string): Promise<void> {
    logInfo(this.requestId, `Cleaning up backup: ${backupId}`);
    // TODO: Implémenter le nettoyage
  }

  /**
   * Effectue un rollback depuis la sauvegarde
   */
  private async rollbackFromBackup(backupId: string): Promise<void> {
    logError(this.requestId, new Error('Rolling back catalog import'), { backupId });
    // TODO: Implémenter le rollback
  }
} 