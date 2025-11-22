import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@klassechatten/lib', '@klassechatten/types', '@klassechatten/validation'],
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  // Performance optimizations for development
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['@supabase/supabase-js', 'date-fns'],
  },
  // DISABLED: cacheComponents causes UUID redaction bug in dynamic route params
  // This is a known issue in Next.js 16 where dynamic [id] params get redacted as %%drp:id:XXX%%
  // Re-enable when Next.js fixes this or provides a way to exclude routes from redaction
  // See: https://github.com/vercel/next.js/issues/XXXXX (file bug report)
  // cacheComponents: true,
};

export default withBundleAnalyzer(nextConfig);
