'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Lazy load the heavy OrderImportButton component
const OrderImportButton = dynamic(() => import('./OrderImportButton'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center space-x-2 px-4 py-2 bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-xl text-sm text-gray-700 font-medium shadow-md">
      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
      <span>Chargement...</span>
    </div>
  ),
});

interface LazyOrderImportButtonProps {
  onImportComplete?: (result: { success: boolean; error?: string; order?: any }) => void;
}

export default function LazyOrderImportButton(props: LazyOrderImportButtonProps) {
  return (
    <Suspense fallback={
      <div className="flex items-center space-x-2 px-4 py-2 bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-xl text-sm text-gray-700 font-medium shadow-md">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
        <span>Chargement...</span>
      </div>
    }>
      <OrderImportButton {...props} />
    </Suspense>
  );
}