'use client';

import { useState, useEffect } from 'react';
import { Filter, X, CalendarIcon, Package, Euro, Users, ChevronDown, ChevronUp } from 'lucide-react';

interface OrderFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onFiltersChange: (filters: {
    client: string;
    dateFrom: string;
    dateTo: string;
    quantityMin: string;
    quantityMax: string;
    amountMin: string;
    amountMax: string;
  }) => void;
  onClearFilters: () => void;
  totalOrders: number;
  filteredCount: number;
  hideClientFilter?: boolean;
}

export default function OrderFilters({
  statusFilter,
  onStatusFilterChange,
  onFiltersChange,
  onClearFilters,
  totalOrders,
  filteredCount,
  hideClientFilter = false
}: OrderFiltersProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState({
    client: '',
    dateFrom: '',
    dateTo: '',
    quantityMin: '',
    quantityMax: '',
    amountMin: '',
    amountMax: ''
  });

  // Vérifier si des filtres avancés sont actifs
  const hasActiveAdvancedFilters = Object.values(filters).some(value => value !== '');

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      client: '',
      dateFrom: '',
      dateTo: '',
      quantityMin: '',
      quantityMax: '',
      amountMin: '',
      amountMax: ''
    });
    onStatusFilterChange('all');
    onClearFilters();
  };

  const hasAnyActiveFilter = statusFilter !== 'all' || hasActiveAdvancedFilters;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
      {/* Header avec titre et boutons principaux */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {hideClientFilter ? 'Mes commandes' : 'Commandes clients'}
        </h1>
        <div className="flex items-center space-x-4">
          {/* Bouton pour afficher/masquer les filtres avancés */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200 ${
              showAdvancedFilters || hasActiveAdvancedFilters
                ? 'bg-dbc-light-green text-dbc-dark-green border-dbc-light-green'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtres avancés
            {hasActiveAdvancedFilters && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                {Object.values(filters).filter(v => v !== '').length}
              </span>
            )}
            {showAdvancedFilters ? (
              <ChevronUp className="h-4 w-4 ml-1" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-1" />
            )}
          </button>

          {/* Bouton effacer tous les filtres */}
          {hasAnyActiveFilter && (
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-300 hover:border-red-400 rounded-lg hover:bg-red-50 transition-all duration-200"
            >
              <X className="h-4 w-4 mr-1" />
              Effacer filtres
            </button>
          )}
        </div>
      </div>

      {/* Filtres de base */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {/* Filtre par statut */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 font-medium">Statut:</span>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-dbc-light-green focus:border-transparent bg-white"
          >
            <option value="all">Toutes</option>
            <option value="draft">Brouillons</option>
            <option value="pending_payment">En attente de paiement</option>
            <option value="validated">Validées</option>
            <option value="shipping">En cours de livraison</option>
            <option value="completed">Terminées</option>
          </select>
        </div>
      </div>

      {/* Filtres avancés */}
      {showAdvancedFilters && (
        <div className="border-t pt-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Filtre par client - masqué pour les clients normaux */}
            {!hideClientFilter && (
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <Users className="h-4 w-4 mr-1" />
                  Client
                </label>
                <input
                  type="text"
                  placeholder="Nom d'entreprise, contact ou email..."
                  value={filters.client}
                  onChange={(e) => handleFilterChange('client', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-dbc-light-green focus:border-transparent"
                />
              </div>
            )}

            {/* Plage de dates */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <CalendarIcon className="h-4 w-4 mr-1" />
                Date de création (du)
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-dbc-light-green focus:border-transparent"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <CalendarIcon className="h-4 w-4 mr-1" />
                Date de création (au)
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-dbc-light-green focus:border-transparent"
              />
            </div>

            {/* Quantité de produits */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Package className="h-4 w-4 mr-1" />
                Quantité min
              </label>
              <input
                type="number"
                placeholder="Ex: 5"
                min="0"
                value={filters.quantityMin}
                onChange={(e) => handleFilterChange('quantityMin', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-dbc-light-green focus:border-transparent"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Package className="h-4 w-4 mr-1" />
                Quantité max
              </label>
              <input
                type="number"
                placeholder="Ex: 100"
                min="0"
                value={filters.quantityMax}
                onChange={(e) => handleFilterChange('quantityMax', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-dbc-light-green focus:border-transparent"
              />
            </div>

            {/* Montant */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Euro className="h-4 w-4 mr-1" />
                Montant min (€)
              </label>
              <input
                type="number"
                placeholder="Ex: 100.00"
                min="0"
                step="0.01"
                value={filters.amountMin}
                onChange={(e) => handleFilterChange('amountMin', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-dbc-light-green focus:border-transparent"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Euro className="h-4 w-4 mr-1" />
                Montant max (€)
              </label>
              <input
                type="number"
                placeholder="Ex: 5000.00"
                min="0"
                step="0.01"
                value={filters.amountMax}
                onChange={(e) => handleFilterChange('amountMax', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-dbc-light-green focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {/* Résumé des résultats */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t">
        <p className="text-sm text-gray-600">
          <span className="font-medium">{filteredCount}</span> commande{filteredCount > 1 ? 's' : ''} trouvée{filteredCount > 1 ? 's' : ''}
          {filteredCount !== totalOrders && (
            <span className="text-gray-500"> sur {totalOrders} au total</span>
          )}
        </p>
        
        {hasAnyActiveFilter && (
          <div className="flex items-center text-sm text-gray-500">
            <Filter className="h-4 w-4 mr-1" />
            Filtres actifs
          </div>
        )}
      </div>
    </div>
  );
} 