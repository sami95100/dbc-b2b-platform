import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Créer une instance axios configurée
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Types
export interface Product {
  id: string;
  sku: string;
  name: string;
  appearance: string;
  functionality: string;
  boxed: string;
  color: string;
  price: number;
  priceDBC: number;
  stock: number;
  vatType: 'Marginal' | 'Standard';
  campaignPrice?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  clientId: string;
  items: CartItem[];
  total: number;
  status: 'draft' | 'pending' | 'confirmed' | 'shipped' | 'delivered';
  createdAt: string;
  updatedAt: string;
}

// API Functions
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
  },
  
  register: async (data: any) => {
    const response = await api.post('/api/auth/register', data);
    return response.data;
  },
  
  logout: async () => {
    localStorage.removeItem('token');
    // Appeler l'API si nécessaire
  },
  
  me: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  }
};

export const catalogAPI = {
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/api/catalog/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  transform: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/api/catalog/transform', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};

export const productsAPI = {
  getAll: async (filters?: any) => {
    const response = await api.get('/api/products', { params: filters });
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/api/products/${id}`);
    return response.data;
  },
  
  search: async (query: string) => {
    const response = await api.get('/api/products/search', { params: { q: query } });
    return response.data;
  }
};

export const ordersAPI = {
  create: async (items: CartItem[]) => {
    const response = await api.post('/api/orders', { items });
    return response.data;
  },
  
  getAll: async () => {
    const response = await api.get('/api/orders');
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/api/orders/${id}`);
    return response.data;
  },
  
  update: async (id: string, data: any) => {
    const response = await api.put(`/api/orders/${id}`, data);
    return response.data;
  },
  
  applyDBCPrices: async (orderId: string, mode: 'dbc' | 'client') => {
    const response = await api.post(`/api/orders/${orderId}/apply-dbc-prices`, { mode });
    return response.data;
  },
  
  processIMEI: async (orderId: string, mode: 'dbc' | 'client') => {
    const response = await api.post(`/api/orders/${orderId}/process-imei`, { mode });
    return response.data;
  }
};

// Foxway Integration (Future)
export const foxwayAPI = {
  checkStock: async (sku: string) => {
    const response = await api.get(`/api/foxway/stock/${sku}`);
    return response.data;
  },
  
  syncCatalog: async () => {
    const response = await api.post('/api/foxway/sync-catalog');
    return response.data;
  },
  
  getRealtimePrice: async (sku: string) => {
    const response = await api.get(`/api/foxway/price/${sku}`);
    return response.data;
  }
}; 