'use client';

import React, { memo, useCallback, useRef } from 'react';
import { Plus, Minus, ShoppingCart, Check } from 'lucide-react';
import type { Product } from '../lib/supabase';

interface ProductTableRowProps {
  product: Product;
  quantity: string | number;
  isSelected: boolean;
  isClient: boolean;
  onQuantityChange: (sku: string, value: string) => void;
  onAddToCart: (sku: string) => void;
  onSelectFullQuantity: (sku: string, productQuantity: number) => void;
  onDecrementQuantity: (sku: string) => void;
  getColorClass: (color: string | null) => string;
}

const ProductTableRow = memo(function ProductTableRow({
  product,
  quantity,
  isSelected,
  isClient,
  onQuantityChange,
  onAddToCart,
  onSelectFullQuantity,
  onDecrementQuantity,
  getColorClass
}: ProductTableRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Memoize les handlers pour éviter les re-renders
  const handleQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onQuantityChange(product.sku, e.target.value);
  }, [product.sku, onQuantityChange]);

  const handleAddToCart = useCallback(() => {
    onAddToCart(product.sku);
  }, [product.sku, onAddToCart]);

  const handleSelectFullQuantity = useCallback(() => {
    onSelectFullQuantity(product.sku, product.quantity);
  }, [product.sku, product.quantity, onSelectFullQuantity]);

  const handleDecrementQuantity = useCallback(() => {
    onDecrementQuantity(product.sku);
  }, [product.sku, onDecrementQuantity]);

  // Gestionnaire spécifique pour mobile
  const handleInputFocus = useCallback(() => {
    if (inputRef.current) {
      // Sélectionner tout le texte pour faciliter la saisie
      inputRef.current.select();
      // Forcer le focus sur mobile
      inputRef.current.focus();
    }
  }, []);

  // Gestionnaire tactile amélioré
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (inputRef.current) {
      // Force l'ouverture du clavier numérique
      inputRef.current.focus();
      inputRef.current.click();
      inputRef.current.select();
      
      // Déclencher l'événement input pour forcer l'affichage du clavier
      const event = new Event('input', { bubbles: true });
      inputRef.current.dispatchEvent(event);
    }
  }, []);

  // Gestionnaire de clic optimisé
  const handleInputClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      
      // Pour iOS, forcer l'affichage du clavier
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, []);

  const quantityInCart = typeof quantity === 'string' ? parseInt(quantity) || 0 : quantity || 0;

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="px-2 py-3 text-sm font-mono font-medium text-gray-900">
        {product.sku}
      </td>
      <td className="px-2 py-3 text-sm text-gray-800 max-w-xs">
        <div className="line-clamp-3">
          {product.product_name}
        </div>
      </td>
      <td className="px-2 py-3 text-sm">
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          product.appearance === 'Brand New' ? 'bg-green-100 text-green-800' :
          product.appearance === 'Grade A+' ? 'bg-blue-100 text-blue-800' :
          product.appearance === 'Grade A' ? 'bg-indigo-100 text-indigo-800' :
          product.appearance === 'Grade AB' ? 'bg-purple-100 text-purple-800' :
          product.appearance === 'Grade B' ? 'bg-yellow-100 text-yellow-800' :
          product.appearance === 'Grade BC' ? 'bg-orange-100 text-orange-800' :
          product.appearance === 'Grade C' ? 'bg-red-100 text-red-800' :
          product.appearance === 'Grade C+' ? 'bg-pink-100 text-pink-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {product.appearance}
        </span>
      </td>
      <td className="px-2 py-3 text-sm">
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          product.functionality === 'Working' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {product.functionality}
        </span>
      </td>
      <td className="px-2 py-3 text-sm text-gray-700">
        <div className="max-w-32 truncate">
          {product.additional_info || '-'}
        </div>
      </td>
      <td className="px-2 py-3 text-sm">
        <span className={`inline-block w-4 h-4 rounded-full border-2 border-gray-300 ${getColorClass(product.color)}`}
              title={product.color || 'Couleur non spécifiée'}>
        </span>
        <span className="ml-2 text-xs text-gray-800 font-medium">{product.color || '-'}</span>
      </td>
      <td className="px-2 py-3 text-sm">
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          product.boxed === 'Original Box' ? 'bg-green-100 text-green-800' :
          product.boxed === 'Premium Unboxed' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {product.boxed}
        </span>
      </td>
      <td className="px-2 py-3 text-center">
        <span className={`text-sm font-semibold ${
          product.quantity > 10 ? 'text-green-600' :
          product.quantity > 5 ? 'text-yellow-600' :
          'text-red-600'
        }`}>
          {product.quantity}
        </span>
      </td>
      <td className="px-2 py-3 text-center">
        <div className="flex flex-col space-y-1">
          <span className="text-sm font-semibold text-gray-900">
            {product.price_dbc.toFixed(2)}€
          </span>
          {product.vat_type === 'Marginal' && (
            <span className="text-xs text-orange-600 font-medium">TVA M.</span>
          )}
        </div>
      </td>
      <td className="px-2 py-3 text-center">
        <div className="flex items-center justify-center space-x-1">
          {quantityInCart > 0 && (
            <button
              onClick={handleDecrementQuantity}
              className="p-2 text-gray-700 hover:text-gray-900 font-medium touch-manipulation active:scale-95 transition-transform"
            >
              <Minus className="h-4 w-4" />
            </button>
          )}
          <div 
            className="relative z-10" 
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              min="0"
              max={product.quantity}
              value={quantity}
              onChange={handleQuantityChange}
              onFocus={handleInputFocus}
              onTouchStart={handleTouchStart}
              onClick={handleInputClick}
              onPointerDown={(e) => e.stopPropagation()}
              className="quantity-input w-16 h-10 px-2 py-2 text-center text-sm touch-manipulation relative z-20"
              style={{ fontSize: '16px' }} // Empêche le zoom sur iOS
            />
          </div>
          <button
            onClick={handleAddToCart}
            className="p-2 text-gray-700 hover:text-gray-900 font-medium touch-manipulation active:scale-95 transition-transform"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </td>
      <td className="px-2 py-3 text-center">
        <div className="flex items-center justify-center space-x-1">
          <button
            onClick={handleSelectFullQuantity}
            className={`p-2 transition-all touch-manipulation active:scale-95 ${
              isSelected
                ? 'text-dbc-light-green bg-green-50 rounded-lg'
                : 'text-gray-700 hover:text-dbc-light-green font-medium'
            }`}
            title={isSelected ? 'Tout sélectionné' : 'Sélectionner tout le stock'}
          >
            {isSelected ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
          </button>
        </div>
      </td>
    </tr>
  );
});

export default ProductTableRow; 