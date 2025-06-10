'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { DEFAULT_ROUTES } from '../lib/routes-config';
import DBCLogo from './DBCLogo';
import { 
  ShoppingCart, 
  User, 
  LogOut 
} from 'lucide-react';

interface AppHeaderProps {
  cartItemsCount?: number;
  currentOrder?: {
    name: string;
    totalItems: number;
    totalAmount: number;
  };
  onCartClick?: () => void;
  onLogoClick?: () => void;
  onLogout?: () => void;
}

export default function AppHeader({ 
  cartItemsCount = 0, 
  currentOrder, 
  onCartClick, 
  onLogoClick,
  onLogout 
}: AppHeaderProps) {
  const router = useRouter();
  const { user, isAdmin, isClient, signOut } = useAuth();

  const handleLogoClick = () => {
    if (onLogoClick) {
      onLogoClick();
    } else {
      // Rediriger vers la page d'accueil selon le rôle
      if (isAdmin) {
        router.push(DEFAULT_ROUTES.admin);
      } else if (isClient) {
        router.push(DEFAULT_ROUTES.client);
      } else {
        router.push('/');
      }
    }
  };

  const handleCartClick = () => {
    if (onCartClick) {
      onCartClick();
    } else {
      // Rediriger vers les commandes selon le rôle
      if (isAdmin) {
        router.push('/admin/orders');
      } else if (isClient) {
        router.push('/orders');
      }
    }
  };

  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
    } else {
      if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        // Nettoyer le localStorage
        localStorage.removeItem('currentDraftOrder');
        localStorage.removeItem('draftOrders');
        
        // Utiliser la fonction signOut du contexte
        await signOut();
      }
    }
  };

  // Afficher le nom/rôle de l'utilisateur
  const displayName = user?.company_name || user?.contact_name || (isAdmin ? 'Admin' : 'Client');

  return (
    <header className="bg-dbc-dark-green shadow-sm">
      <div className="max-w-[2000px] mx-auto px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLogoClick}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <DBCLogo className="h-8 w-8" />
              <h1 className="text-xl font-semibold text-white">DBC B2B Platform</h1>
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleCartClick}
              className="relative p-2 bg-white bg-opacity-10 backdrop-blur-sm border border-white border-opacity-20 rounded-xl hover:bg-opacity-20 hover:shadow-lg transition-all duration-200"
            >
              <ShoppingCart className="h-5 w-5 text-white" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-gradient-to-r from-dbc-bright-green to-emerald-400 text-dbc-dark-green text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold shadow-lg">
                  {cartItemsCount}
                </span>
              )}
            </button>

            {currentOrder && (
              <div className="text-white text-sm">
                <span className="text-dbc-bright-green">Commande:</span> {currentOrder.name}
                <div className="text-xs text-dbc-bright-green">
                  {currentOrder.totalItems} article{currentOrder.totalItems > 1 ? 's' : ''} • {currentOrder.totalAmount.toFixed(2)}€
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-white" />
              <span className="text-sm text-white">{displayName}</span>
              {isAdmin && <span className="text-xs text-dbc-bright-green">(Admin)</span>}
            </div>
            
            <button 
              onClick={handleLogout}
              className="p-2 bg-white bg-opacity-10 backdrop-blur-sm border border-white border-opacity-20 rounded-xl hover:bg-opacity-20 hover:shadow-lg transition-all duration-200 text-white"
              title="Se déconnecter"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
} 