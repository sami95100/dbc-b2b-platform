import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem } from './api';

interface User {
  id: string;
  email: string;
  companyName: string;
  role: 'client' | 'admin';
}

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  
  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity: number) => void;
  updateQuantity: (sku: string, quantity: number) => void;
  removeFromCart: (sku: string) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
  
  // UI
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth State
      user: null,
      token: null,
      
      setUser: (user) => set({ user }),
      setToken: (token) => {
        set({ token });
        if (token) {
          localStorage.setItem('token', token);
        } else {
          localStorage.removeItem('token');
        }
      },
      
      logout: () => {
        set({ user: null, token: null, cart: [] });
        localStorage.removeItem('token');
      },
      
      // Cart State
      cart: [],
      
      addToCart: (product, quantity) => {
        set((state) => {
          const existingItem = state.cart.find(item => item.product.sku === product.sku);
          
          if (existingItem) {
            // Update quantity if product already in cart
            return {
              cart: state.cart.map(item =>
                item.product.sku === product.sku
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              )
            };
          }
          
          // Add new item to cart
          return {
            cart: [...state.cart, { product, quantity }]
          };
        });
      },
      
      updateQuantity: (sku, quantity) => {
        set((state) => ({
          cart: quantity === 0
            ? state.cart.filter(item => item.product.sku !== sku)
            : state.cart.map(item =>
                item.product.sku === sku
                  ? { ...item, quantity }
                  : item
              )
        }));
      },
      
      removeFromCart: (sku) => {
        set((state) => ({
          cart: state.cart.filter(item => item.product.sku !== sku)
        }));
      },
      
      clearCart: () => set({ cart: [] }),
      
      getCartTotal: () => {
        const { cart } = get();
        return cart.reduce((total, item) => total + (item.product.priceDBC * item.quantity), 0);
      },
      
      getCartCount: () => {
        const { cart } = get();
        return cart.reduce((count, item) => count + item.quantity, 0);
      },
      
      // UI State
      isLoading: false,
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'dbc-b2b-storage',
      partialize: (state) => ({
        cart: state.cart,
        user: state.user,
        token: state.token,
      }),
    }
  )
); 