/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
      // Supabase Storage
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: [
      '@prisma/client',
      'prisma',
      'firebase-admin',
    ],
  },
  webpack: (config) => {
    // firebase/auth internally re-exports from @firebase/auth's node-esm bundle,
    // which in turn imports `undici`. Next.js 14's SWC cannot parse undici's
    // private-class-field syntax.  Intercept ALL undici files before SWC runs
    // and replace them with an empty stub.  This applies to every webpack
    // compilation pass (RSC server, client, edge).
    config.module.rules.unshift({
      test: /[\\/]node_modules[\\/]undici[\\/]/,
      loader: path.resolve(__dirname, 'empty-loader.js'),
      // enforce:'pre' runs before other loaders including next-swc-loader
      enforce: 'pre',
    });

    return config;
  },
};

module.exports = nextConfig;
