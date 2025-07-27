import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Remove pages that require authentication for landing page deployment
  async redirects() {
    return [
      {
        source: '/auth/:path*',
        destination: '/',
        permanent: false,
      },
      {
        source: '/dashboard/:path*',
        destination: '/',
        permanent: false,
      },
      {
        source: '/onboarding/:path*',
        destination: '/',
        permanent: false,
      }
    ];
  }
};

export default nextConfig;
