import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // This configuration is needed to prevent webpack warnings/errors
    // related to 'pino-pretty' which Lighthouse might indirectly depend on
    // but is not intended for client-side bundles or specific serverless environments.
    if (isServer) {
      config.externals.push('pino-pretty');
    }
    return config;
  },
};

export default nextConfig;