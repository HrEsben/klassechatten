/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@klassechatten/lib', '@klassechatten/types', '@klassechatten/validation'],
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
