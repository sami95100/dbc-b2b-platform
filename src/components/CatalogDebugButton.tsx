'use client';

import React, { useState } from 'react';

export default function CatalogDebugButton() {
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugResult, setDebugResult] = useState<any>(null);

  const handleDebug = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsDebugging(true);
    setDebugResult(null);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch('/api/debug-catalog', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      setDebugResult(result);
    } catch (error) {
      setDebugResult({
        success: false,
        error: 'Erreur réseau',
        details: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsDebugging(false);
    }
  };

  return (
    <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="text-lg font-semibold text-yellow-800 mb-4">
        🔧 Debug Import Catalogue
      </h3>
      
      <form onSubmit={handleDebug} className="space-y-4">
        <div>
          <label htmlFor="catalog" className="block text-sm font-medium text-gray-700">
            Fichier catalogue Excel (.xlsx)
          </label>
          <input
            type="file"
            id="catalog"
            name="catalog"
            accept=".xlsx,.xls"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <button
          type="submit"
          disabled={isDebugging}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
        >
          {isDebugging ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Diagnostic en cours...
            </>
          ) : (
            'Lancer le diagnostic'
          )}
        </button>
      </form>

      {debugResult && (
        <div className="mt-6 p-4 bg-white rounded-lg border">
          <h4 className="text-lg font-medium mb-3">
            {debugResult.success ? '✅ Résultat du diagnostic' : '❌ Diagnostic échoué'}
          </h4>
          
          {debugResult.debug && (
            <div className="space-y-4 text-sm">
              <div>
                <strong>📁 Fichier:</strong>
                <pre className="mt-1 p-2 bg-gray-100 rounded text-xs">
                  {JSON.stringify(debugResult.debug.file, null, 2)}
                </pre>
              </div>
              
              <div>
                <strong>🔧 Variables d'environnement:</strong>
                <pre className="mt-1 p-2 bg-gray-100 rounded text-xs">
                  {JSON.stringify(debugResult.debug.environment, null, 2)}
                </pre>
              </div>
              
              <div>
                <strong>🐍 Python:</strong>
                <pre className="mt-1 p-2 bg-gray-100 rounded text-xs">
                  {JSON.stringify(debugResult.debug.python, null, 2)}
                </pre>
              </div>
              
              <div>
                <strong>📦 Dépendances:</strong>
                <pre className="mt-1 p-2 bg-gray-100 rounded text-xs">
                  {JSON.stringify(debugResult.debug.dependencies, null, 2)}
                </pre>
              </div>
              
              <div>
                <strong>🏃 Exécution:</strong>
                <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  Exit Code: {debugResult.debug.execution.exitCode}
                  {'\n\n'}STDOUT:{'\n'}{debugResult.debug.execution.output}
                  {'\n\n'}STDERR:{'\n'}{debugResult.debug.execution.errorOutput}
                </pre>
              </div>
            </div>
          )}
          
          {!debugResult.success && (
            <div className="mt-4 p-3 bg-red-50 rounded text-red-800">
              <strong>Erreur:</strong> {debugResult.error}
              {debugResult.details && (
                <div className="mt-2 text-sm">
                  <strong>Détails:</strong> {debugResult.details}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 