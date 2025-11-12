/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@klassechatten/lib', '@klassechatten/types', '@klassechatten/validation'],
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  // Enable Cache Components for Partial Pre-Rendering
  cacheComponents: true,
};

export default nextConfig;
