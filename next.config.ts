import type { NextConfig } from 'next'
// @ts-expect-error — next-pwa não tem tipos para CJS default export
import withPWA from 'next-pwa'

const nextConfig: NextConfig = {
  turbopack: {},
}

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api',
        expiration: { maxEntries: 50 },
      },
    },
  ],
})(nextConfig)
