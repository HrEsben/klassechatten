/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@klassechatten/lib', '@klassechatten/types', '@klassechatten/validation'],
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  // DISABLED: cacheComponents causes UUID redaction bug in dynamic route params
  // This is a known issue in Next.js 16 where dynamic [id] params get redacted as %%drp:id:XXX%%
  // Re-enable when Next.js fixes this or provides a way to exclude routes from redaction
  // See: https://github.com/vercel/next.js/issues/XXXXX (file bug report)
  // cacheComponents: true,
};

export default nextConfig;
