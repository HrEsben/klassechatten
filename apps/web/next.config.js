/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@klassechatten/lib', '@klassechatten/types', '@klassechatten/validation'],
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  // Disabled cacheComponents - was causing UUID redaction in params
  // cacheComponents: true,
};

export default nextConfig;
