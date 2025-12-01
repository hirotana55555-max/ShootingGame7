/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ESM compatibility
  experimental: {
    esmExternals: true,
  },
  webpack: (config, { isServer }) => {
    // Add any custom webpack config here if needed
    return config;
  },
};

export default nextConfig;