import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { PerformanceTracker } from '@/components/PerformanceTracker';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'KlasseChatten',
  description: 'KlasseChatten - School communication platform',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover', // For iOS notch/safe area
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KlasseChatten',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const THEME_KEY = 'klassechatten-theme';
                  const savedTheme = localStorage.getItem(THEME_KEY);
                  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'funkyfred';
                  const theme = savedTheme || systemTheme;
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {
                  document.documentElement.setAttribute('data-theme', 'funkyfred');
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <PerformanceTracker />
        <Suspense fallback={null}>
          <AuthProvider>{children}</AuthProvider>
        </Suspense>
      </body>
    </html>
  );
}