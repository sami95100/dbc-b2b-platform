import CatalogDebugButton from '../../components/CatalogDebugButton';

export default function DebugCatalogPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900">
            🔧 Diagnostic Import Catalogue
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Cette page permet de diagnostiquer les problèmes d'import du catalogue en production
          </p>
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              📋 Instructions
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Utilisez le même fichier Excel qui échoue en production</li>
              <li>Cliquez sur "Lancer le diagnostic"</li>
              <li>Analysez les résultats pour identifier le problème</li>
              <li>Partagez les résultats si vous avez besoin d'aide</li>
            </ol>
          </div>

          <CatalogDebugButton />

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              💡 Problèmes fréquents
            </h3>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li><strong>Variables d'environnement manquantes</strong> - Vérifiez dans Vercel</li>
              <li><strong>Python non disponible</strong> - Problème d'environnement Vercel</li>
              <li><strong>Dépendances manquantes</strong> - pandas, supabase, python-dotenv</li>
              <li><strong>Timeout</strong> - Fichier trop volumineux ou traitement trop long</li>
            </ul>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              🗑️ Note temporaire
            </h3>
            <p className="text-gray-600">
              Cette page est temporaire et sera supprimée une fois le problème résolu.
              Elle n'est accessible qu'en mode développement pour diagnostiquer les erreurs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 