'use client';

import { useState, useEffect } from 'react';
import { User, Search, Building } from 'lucide-react';

interface Client {
  id: string;
  email: string;
  contact_name: string;
  company_name: string;
  phone?: string;
}

interface ClientSelectorProps {
  selectedClientId?: string | null;
  onChange: (clientId: string | null) => void;
  isAdmin: boolean;
  currentUserId?: string;
}

export default function ClientSelector({
  selectedClientId,
  onChange,
  isAdmin,
  currentUserId
}: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchClients();
    }
  }, [isAdmin]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users/clients');
      const data = await response.json();

      if (response.ok) {
        setClients(data.clients || []);
      } else {
        console.error('❌ Erreur récupération clients:', data.error);
      }
    } catch (error) {
      console.error('❌ Erreur réseau:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client => {
    const searchLower = searchTerm.toLowerCase();
    return (
      client.company_name.toLowerCase().includes(searchLower) ||
      client.email.toLowerCase().includes(searchLower) ||
      client.contact_name.toLowerCase().includes(searchLower)
    );
  });

  const selectedClient = clients.find(c => c.id === selectedClientId);

  // Si pas admin, retourner un affichage simple
  if (!isAdmin) {
    return (
      <div className="text-sm text-gray-600 flex items-center">
        <User className="h-4 w-4 mr-2" />
        <span>Attribué à votre compte</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Client *
      </label>

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-dbc-light-green focus:border-transparent"
        >
          <div className="flex items-center">
            <Building className="h-4 w-4 text-gray-400 mr-2" />
            {selectedClient ? (
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">{selectedClient.company_name}</div>
                <div className="text-xs text-gray-500">{selectedClient.contact_name}</div>
              </div>
            ) : (
              <span className="text-gray-500">Sélectionner un client</span>
            )}
          </div>
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDropdown && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher un client..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-dbc-light-green"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            <div className="py-1">
              {loading ? (
                <div className="px-4 py-2 text-sm text-gray-500">Chargement...</div>
              ) : filteredClients.length === 0 ? (
                <div className="px-4 py-2 text-sm text-gray-500">Aucun client trouvé</div>
              ) : (
                filteredClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => {
                      onChange(client.id);
                      setShowDropdown(false);
                      setSearchTerm('');
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${client.id === selectedClientId ? 'bg-gray-50' : ''
                      }`}
                  >
                    <div className="text-sm font-medium text-gray-900">{client.company_name}</div>
                    <div className="text-xs text-gray-500">
                      {client.contact_name} • {client.email}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 