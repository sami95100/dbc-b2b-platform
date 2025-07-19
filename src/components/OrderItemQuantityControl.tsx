'use client';

import React, { useState, useCallback, memo } from 'react';
import { Minus, Plus } from 'lucide-react';
import MobileQuantityInput from './MobileQuantityInput';

interface OrderItemQuantityControlProps {
  orderItem: {
    sku: string;
    quantity: number;
    currentStock?: number;
  };
  orderStatus: string;
  orderId: string;
  userId: string;
  onQuantityUpdate: (sku: string, newQuantity: number) => Promise<void>;
  disabled?: boolean;
}

const OrderItemQuantityControl = memo(function OrderItemQuantityControl({
  orderItem,
  orderStatus,
  orderId,
  userId,
  onQuantityUpdate,
  disabled = false
}: OrderItemQuantityControlProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  
  const { sku, quantity, currentStock = 0 } = orderItem;
  
  // Seules les commandes brouillon peuvent être modifiées
  const canEdit = orderStatus === 'draft' && !disabled;
  
  const handleQuantityChange = useCallback(async (newQuantityStr: string) => {
    if (!canEdit || isUpdating) return;
    
    const newQuantity = parseInt(newQuantityStr) || 0;
    if (newQuantity === quantity) return;
    
    // Valider la quantité par rapport au stock disponible
    if (newQuantity > currentStock) {
      alert(`Stock insuffisant pour ${sku}. Stock disponible: ${currentStock}`);
      return;
    }
    
    setIsUpdating(true);
    try {
      await onQuantityUpdate(sku, newQuantity);
    } catch (error) {
      console.error('Erreur mise à jour quantité:', error);
      alert('Erreur lors de la mise à jour de la quantité');
    } finally {
      setIsUpdating(false);
    }
  }, [sku, quantity, currentStock, canEdit, isUpdating, onQuantityUpdate]);
  
  const handleIncrement = useCallback(() => {
    if (!canEdit || isUpdating || quantity >= currentStock) return;
    handleQuantityChange((quantity + 1).toString());
  }, [quantity, currentStock, canEdit, isUpdating, handleQuantityChange]);
  
  const handleDecrement = useCallback(() => {
    if (!canEdit || isUpdating || quantity <= 1) return;
    handleQuantityChange((quantity - 1).toString());
  }, [quantity, canEdit, isUpdating, handleQuantityChange]);
  
  // Déterminer la couleur de l'indicateur de stock
  const getStockIndicatorStyle = () => {
    if (quantity > currentStock) {
      return 'text-red-600 bg-red-50 border border-red-200';
    } else if (currentStock === 0) {
      return 'text-red-600 bg-red-50 border border-red-200';
    } else if (quantity === currentStock) {
      return 'text-orange-600 bg-orange-50 border border-orange-200';
    } else if (quantity > 0) {
      return 'text-green-600 bg-green-50 border border-green-200';
    } else {
      return 'text-gray-600 bg-gray-50 border border-gray-200';
    }
  };
  
  if (!canEdit) {
    // Affichage lecture seule pour les commandes non-draft
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="text-sm font-medium text-gray-900 bg-gray-50 px-2 py-1 rounded">
          {quantity}
        </div>
        {orderStatus === 'draft' && (
          <div className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${getStockIndicatorStyle()}`}>
            {quantity}/{currentStock}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {/* Version mobile responsive */}
      <div className="block sm:hidden">
        <div className="relative">
          <MobileQuantityInput
            value={isUpdating ? '...' : quantity}
            onChange={handleQuantityChange}
            max={currentStock}
            sku={sku}
          />
          {/* Indicateur de stock sous l'input sur mobile */}
          <div className="absolute -bottom-4 left-0 right-0 text-center">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${getStockIndicatorStyle()}`}>
              {quantity}/{currentStock}
            </span>
          </div>
        </div>
      </div>
      
      {/* Version desktop avec boutons + / - */}
      <div className="hidden sm:flex items-center gap-1">
        <button
          onClick={handleDecrement}
          disabled={quantity <= 1 || isUpdating}
          className="w-6 h-6 flex items-center justify-center bg-red-100 text-red-600 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs transition-all"
          title="Diminuer la quantité"
        >
          <Minus className="h-3 w-3" />
        </button>
        
        <span className={`text-sm font-medium px-2 py-1 rounded min-w-[2rem] text-center ${
          isUpdating ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-50 text-gray-900'
        }`}>
          {isUpdating ? '...' : quantity}
        </span>
        
        <button
          onClick={handleIncrement}
          disabled={quantity >= currentStock || isUpdating}
          className="w-6 h-6 flex items-center justify-center bg-green-100 text-green-600 rounded hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs transition-all"
          title="Augmenter la quantité"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      
      {/* Indicateur de stock pour desktop */}
      <div className="hidden sm:block">
        <div className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${getStockIndicatorStyle()}`}>
          {quantity}/{currentStock}
        </div>
      </div>
    </div>
  );
});

export default OrderItemQuantityControl; 