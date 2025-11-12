import { Suspense } from 'react';
import CachedWrapper from '@/components/CachedWrapper';

/**
 * Cached component demonstrating data fetching with cache
 */
async function CachedDataComponent() {
  'use cache';
  
  // Simulate expensive data fetch
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const timestamp = new Date().toISOString();
  
  return (
    <div className="card bg-base-100 shadow-lg">
      <div className="card-body">
        <h3 className="card-title text-success">Cached Server Component</h3>
        <p className="text-base-content/70">
          This component is cached on the server. The timestamp below shows when this cache entry was created.
        </p>
        <div className="bg-base-200 p-3 rounded-lg font-mono text-sm">
          <strong>Cache created:</strong> {timestamp}
        </div>
        <div className="badge badge-success">Cache Hit</div>
      </div>
    </div>
  );
}

/**
 * Dynamic component that changes on each request
 */
function DynamicComponent() {
  const timestamp = new Date().toISOString();
  
  return (
    <div className="card bg-base-100 shadow-lg">
      <div className="card-body">
        <h3 className="card-title text-warning">Dynamic Client Component</h3>
        <p className="text-base-content/70">
          This component is not cached and renders fresh data on each request.
        </p>
        <div className="bg-base-200 p-3 rounded-lg font-mono text-sm">
          <strong>Rendered:</strong> {timestamp}
        </div>
        <div className="badge badge-warning">No Cache</div>
      </div>
    </div>
  );
}

/**
 * Demo page showing Next.js cache components in action
 */
export default async function CacheDemo() {
  return (
    <CachedWrapper>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-4">
            Next.js Cache Components Demo
          </h1>
          <p className="text-lg text-base-content/70 max-w-2xl mx-auto">
            This page demonstrates how Next.js cache components work. The cached component 
            will show the same timestamp until the cache expires or is revalidated.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <Suspense fallback={
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <div className="flex items-center gap-4">
                  <div className="loading loading-spinner loading-md"></div>
                  <span>Loading cached component...</span>
                </div>
              </div>
            </div>
          }>
            <CachedDataComponent />
          </Suspense>

          <DynamicComponent />
        </div>

        <div className="mt-12 bg-base-200 p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">How it works</h2>
          <div className="space-y-4 text-base-content/80">
            <div className="flex items-start gap-3">
              <div className="badge badge-primary">1</div>
              <p>
                The <strong>Cached Server Component</strong> uses the <code className="bg-base-300 px-2 py-1 rounded text-sm">&apos;use cache&apos;</code> directive
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="badge badge-primary">2</div>
              <p>
                Next.js caches the component&apos;s rendered output and reuses it for subsequent requests
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="badge badge-primary">3</div>
              <p>
                The <strong>Dynamic Component</strong> renders fresh data on every request
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="badge badge-primary">4</div>
              <p>
                The page layout itself is also cached using <code className="bg-base-300 px-2 py-1 rounded text-sm">CachedWrapper</code>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button 
            onClick={() => window.location.reload()} 
            className="btn btn-primary"
          >
            Refresh Page
          </button>
          <p className="text-sm text-base-content/60 mt-2">
            Notice how the cached component keeps the same timestamp
          </p>
        </div>
      </div>
    </CachedWrapper>
  );
}