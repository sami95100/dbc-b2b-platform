/** @type {import('next').NextConfig} */
const nextConfig = {
  // Supprimé appDir: true car obsolète dans Next.js 14+
  typescript: {
    // ⚠️ Désactiver la vérification TypeScript pour ce build de déploiement
    ignoreBuildErrors: true,
  },
  eslint: {
    // ⚠️ Désactiver ESLint pour ce build de déploiement
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig 