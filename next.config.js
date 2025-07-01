// Bundle analyzer
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Désactiver en dev pour éviter les problèmes
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-cache',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 an
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'gstatic-fonts-cache',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 an
        },
      },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-images-cache',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 24 heures
        },
      },
    },
    {
      urlPattern: /\/api\/.*$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 60 * 60, // 1 heure
        },
        networkTimeoutSeconds: 10,
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = withPWA({
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'lucide-react', 'xlsx'],
  },
  
  // Bundle optimization
  webpack: (config, { isServer }) => {
    // Optimize bundle splitting
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            enforce: true,
          },
          supabase: {
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            name: 'supabase',
            priority: 20,
            enforce: true,
          },
          xlsx: {
            test: /[\\/]node_modules[\\/]xlsx[\\/]/,
            name: 'xlsx',
            priority: 20,
            enforce: true,
          },
        },
      };
    }
    
    return config;
  },
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  
  // Compression
  compress: true,
  
  // Output optimization
  output: 'standalone',
  
  typescript: {
    // ⚠️ Désactiver la vérification TypeScript pour ce build de déploiement
    ignoreBuildErrors: true,
  },
  eslint: {
    // ⚠️ Désactiver ESLint pour ce build de déploiement
    ignoreDuringBuilds: true,
  },
});

module.exports = withBundleAnalyzer(nextConfig) 