/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
  // Transpile the Farcaster Frame SDK
  transpilePackages: ['@farcaster/frame-sdk'],
  // Ensure we process the package as a client-side only module
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark the SDK as external on the server to prevent import issues
      config.externals = [...config.externals, '@farcaster/frame-sdk'];
    }
    return config;
  },
};

module.exports = nextConfig; 