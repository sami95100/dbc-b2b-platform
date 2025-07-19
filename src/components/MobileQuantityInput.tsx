'use client';

import React, { useRef, useEffect, useState, useCallback, memo } from 'react';

interface MobileQuantityInputProps {
  value: number | string;
  onChange: (value: string) => void;
  max: number;
  sku: string;
}

const MobileQuantityInput = memo(function MobileQuantityInput({ value, onChange, max, sku }: MobileQuantityInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localValue, setLocalValue] = useState(value.toString());
  const [isFocused, setIsFocused] = useState(false);
  const changeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalValue(value.toString());
  }, [value]);

  const forceKeyboard = useCallback(() => {
    if (inputRef.current) {
      // Technique optimisée pour iOS/Safari
      inputRef.current.style.fontSize = '16px';
      inputRef.current.readOnly = false;
      inputRef.current.focus();
      inputRef.current.click();
      
      // Sélectionner tout le texte pour faciliter la saisie
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.select();
        }
      }, 10);
    }
  }, []);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    
    // Sélectionner tout le texte au focus
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.select();
      }
    }, 10);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Forcer le focus et sélectionner le texte
    forceKeyboard();
  }, [forceKeyboard]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Permettre uniquement les chiffres
    if (!/^\d*$/.test(newValue)) return;
    
    const numValue = parseInt(newValue) || 0;
    
    // Vérifier la limite max
    if (numValue > max) {
      const maxValue = max.toString();
      setLocalValue(maxValue);
      
      // Débounce les appels à onChange pour éviter les re-renders excessifs
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }
      changeTimeoutRef.current = setTimeout(() => {
        onChange(maxValue);
      }, 100);
      return;
    }
    
    setLocalValue(newValue);
    
    // Débounce les appels à onChange pour éviter les re-renders excessifs
    if (changeTimeoutRef.current) {
      clearTimeout(changeTimeoutRef.current);
    }
    changeTimeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, 100);
  }, [max, onChange]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    
    // Nettoyer le timeout de debounce si il y en a un en attente
    if (changeTimeoutRef.current) {
      clearTimeout(changeTimeoutRef.current);
      changeTimeoutRef.current = null;
    }
    
    // S'assurer que la valeur finale est envoyée
    const numValue = parseInt(localValue) || 0;
    if (numValue > max) {
      const maxValue = max.toString();
      setLocalValue(maxValue);
      onChange(maxValue);
    } else {
      onChange(numValue.toString());
    }
  }, [localValue, max, onChange]);

  // Nettoyer les timeouts au démontage
  useEffect(() => {
    return () => {
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      className="relative inline-block"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        value={localValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={handleClick}
        className={`
          w-14 h-10 px-2 text-center text-base font-medium
          border-2 rounded-lg transition-all duration-150
          ${isFocused 
            ? 'border-dbc-light-green bg-green-50 ring-2 ring-dbc-light-green ring-opacity-30' 
            : 'border-gray-300 bg-white hover:border-gray-400'
          }
          focus:outline-none
          text-gray-900
          touch-manipulation
          cursor-text
        `}
        style={{
          fontSize: '16px', // Empêche le zoom sur iOS
          WebkitAppearance: 'none',
          MozAppearance: 'textfield',
          touchAction: 'manipulation'
        }}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder="0"
        data-lpignore="true"
        data-form-type="other"
        title={`Quantité (max: ${max})`}
      />
    </div>
  );
});

export default MobileQuantityInput; 