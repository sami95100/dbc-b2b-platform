'use client';

import { useState } from 'react';
import { Product } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Plus, Minus, ShoppingCart } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [quantity, setQuantity] = useState(0);
  const { addToCart } = useStore();

  const handleAddToCart = () => {
    if (quantity > 0) {
      addToCart(product, quantity);
      setQuantity(0);
    }
  };

  const incrementQuantity = () => {
    if (quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 0) {
      setQuantity(quantity - 1);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-6">
        {/* Product Info */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {product.name}
          </h3>
          <p className="text-sm text-gray-500">SKU: {product.sku}</p>
        </div>

        {/* Product Details */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">État:</span>
            <span className={`font-medium ${
              product.appearance.includes('Grade A') ? 'text-green-600' : 
              product.appearance.includes('Grade B') ? 'text-yellow-600' : 
              'text-orange-600'
            }`}>
              {product.appearance}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Fonctionnalité:</span>
            <span className="font-medium">{product.functionality}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Couleur:</span>
            <span className="font-medium">{product.color}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Stock:</span>
            <span className={`font-medium ${
              product.stock > 10 ? 'text-green-600' : 
              product.stock > 0 ? 'text-yellow-600' : 
              'text-red-600'
            }`}>
              {product.stock > 0 ? `${product.stock} disponibles` : 'Rupture de stock'}
            </span>
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-4">
          {product.campaignPrice && (
            <p className="text-sm text-gray-500 line-through">
              {product.campaignPrice.toFixed(2)}€
            </p>
          )}
          <p className="text-2xl font-bold text-purple-600">
            {product.priceDBC.toFixed(2)}€
          </p>
          {product.vatType === 'Marginal' && (
            <span className="inline-block mt-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
              TVA Marginale
            </span>
          )}
        </div>

        {/* Quantity Selector */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={decrementQuantity}
              disabled={quantity === 0}
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Minus className="h-4 w-4" />
            </button>
            
            <input
              type="number"
              value={quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                setQuantity(Math.min(val, product.stock));
              }}
              className="w-16 text-center border border-gray-300 rounded px-2 py-1"
              min="0"
              max={product.stock}
            />
            
            <button
              onClick={incrementQuantity}
              disabled={quantity >= product.stock}
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          
          <button
            onClick={handleAddToCart}
            disabled={quantity === 0 || product.stock === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Ajouter</span>
          </button>
        </div>
      </div>
    </div>
  );
} 