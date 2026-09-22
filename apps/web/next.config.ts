import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@fikri-idp/types', '@fikri-idp/sdk', '@fikri-idp/ui'],
};

export default nextConfig;
