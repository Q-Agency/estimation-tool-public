import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output configuration for AWS Amplify
  output: 'standalone',
  
  // Public runtime config for client-side access
  publicRuntimeConfig: {
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    sseBaseUrl: process.env.NEXT_PUBLIC_SSE_BASE_URL,
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_SSE_BASE_URL: process.env.NEXT_PUBLIC_SSE_BASE_URL,
  },
  
  // Headers for CORS and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Images configuration for optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Disable TypeScript strict errors for development builds
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Experimental features
  experimental: {
    optimizePackageImports: ['react-hot-toast'],
  },
  
  // Lambda-specific optimizations (moved from experimental)
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
};

export default nextConfig;
