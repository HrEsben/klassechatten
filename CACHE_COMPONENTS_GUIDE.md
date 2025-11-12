# Cache Components Migration Guide

This document outlines the migration of KlasseChatten to Next.js Cache Components for improved performance through selective server-side caching.

## Overview

Next.js Cache Components allow you to cache parts of your application on the server side while keeping other parts dynamic. This is particularly useful for:

- **Static content** that doesn't change often (layouts, navigation)
- **Initial data loads** that can be pre-rendered
- **Expensive computations** that can be cached and reused

## What Was Implemented

### 1. Next.js Configuration
- Enabled `cacheComponents: true` in `next.config.js`
- This activates the cache components functionality

### 2. Cached Data Functions (`/lib/cached-queries.ts`)
- `getUserClasses()` - Caches user class memberships and rooms (5 minutes)
- `getRoomMessages()` - Caches initial message load (30 seconds) 
- `getRoomInfo()` - Caches room metadata (1 hour)
- `getUserProfile()` - Caches user profile data (5 minutes)

### 3. Cached Server Components
- `CachedWrapper` - Provides a cached layout shell
- `CachedClassRoomBrowser` - Server-rendered class browser
- `CachedChatRoom` - Server-rendered initial chat state

### 4. Cache Revalidation API (`/api/revalidate`)
- Endpoint to programmatically invalidate cached data
- Triggered when data changes (new messages, class updates, etc.)

## How It Works

### Cache Layers
1. **React `cache()`** - Deduplicates function calls within a single request
2. **`unstable_cache()`** - Caches function results across requests
3. **`'use cache'` directive** - Caches entire component output

### Cache Strategy
```typescript
// Function-level caching with React cache + unstable_cache
export const getUserClasses = cache(async (userId: string) => {
  const cachedFn = unstable_cache(
    async (uid: string) => {
      // Actual data fetching logic
    },
    [`user-classes-${userId}`], // Cache key
    { revalidate: 300 } // 5 minutes
  );
  return cachedFn(userId);
});

// Component-level caching
async function CachedComponent() {
  'use cache'; // Cache entire component output
  const data = await fetchData();
  return <div>{data}</div>;
}
```

### Hybrid Architecture
- **Server-rendered shell** (cached): Navigation, layout, initial data
- **Client-side real-time** (dynamic): Live chat, user interactions
- **Progressive enhancement**: Static → Interactive

## Performance Benefits

### Before (Client-only)
```
Page Load → Loading spinner → Client fetch → Render content
Total: ~2-3 seconds
```

### After (Cached + Client)
```
Page Load → Cached content visible → Client hydration → Real-time updates
Time to content: ~200-500ms
```

### Cache Hit Rates
- **Class data**: High (changes infrequently)
- **Initial messages**: Medium (updates every 30s)
- **Room info**: Very high (rarely changes)
- **User profiles**: High (updates occasionally)

## File Structure

```
apps/web/src/
├── lib/
│   └── cached-queries.ts      # Server-side cached data functions
├── components/
│   ├── CachedWrapper.tsx      # Cached layout component
│   ├── CachedClassRoomBrowser.tsx  # Cached class browser
│   └── CachedChatRoom.tsx     # Cached chat room
├── app/
│   ├── api/revalidate/        # Cache invalidation endpoint
│   └── cache-demo/            # Demo page showing caching
└── next.config.js             # Enable cacheComponents
```

## Usage Examples

### 1. Using Cached Data Functions
```typescript
// In a server component
import { getUserClasses } from '@/lib/cached-queries';

export default async function ServerComponent({ userId }: { userId: string }) {
  const classes = await getUserClasses(userId); // Cached!
  return <div>{/* render classes */}</div>;
}
```

### 2. Cached Component with Dynamic Children
```typescript
// Cached shell with dynamic content
export default async function Page() {
  return (
    <CachedWrapper>
      {/* This content is dynamic and not cached */}
      <ClientComponent />
    </CachedWrapper>
  );
}
```

### 3. Cache Invalidation
```typescript
// Trigger cache refresh when data changes
const revalidateCache = async (type: string, userId?: string) => {
  await fetch('/api/revalidate', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ type, userId })
  });
};
```

## Migration Strategy

### Phase 1: Layout Caching ✅
- Cached wrapper components
- Static navigation and footer
- Basic cache infrastructure

### Phase 2: Data Caching ✅  
- Server-side data fetching functions
- Initial page loads with cached data
- Cache revalidation API

### Phase 3: Hybrid Components (Next)
- Server components for static content
- Client components for interactions
- Progressive enhancement

### Phase 4: Advanced Caching (Future)
- Edge function caching
- Personalized cache segments
- Advanced invalidation strategies

## Best Practices

### ✅ Do
- Cache expensive data fetches
- Use React `cache()` for deduplication
- Set appropriate cache durations
- Implement cache invalidation
- Monitor cache hit rates

### ❌ Don't  
- Cache user-specific real-time data
- Set cache durations too long
- Cache without invalidation strategy
- Cache sensitive data
- Over-engineer cache keys

## Monitoring

### Cache Performance Metrics
```typescript
// Track cache effectiveness
const cacheMetrics = {
  hitRate: hits / (hits + misses),
  avgResponseTime: totalTime / requests,
  cacheSize: Object.keys(cache).length
};
```

### Debug Cache Status
- Visit `/cache-demo` to see caching in action
- Check browser dev tools for cache headers
- Monitor server logs for cache misses

## Troubleshooting

### Cache Not Working
1. Check `cacheComponents: true` in config
2. Verify `'use cache'` directive placement
3. Ensure server-only execution
4. Check cache key uniqueness

### Stale Data Issues
1. Implement proper cache invalidation
2. Reduce cache duration for frequently changing data
3. Use real-time updates for critical data
4. Monitor cache revalidation logs

### Performance Issues
1. Profile cache hit rates
2. Optimize cache key strategies
3. Balance cache duration vs freshness
4. Consider cache size limits

## Future Enhancements

1. **Cache Analytics Dashboard**
   - Hit/miss ratios
   - Performance metrics
   - Cache usage patterns

2. **Smart Cache Invalidation**
   - Dependency-based invalidation
   - Real-time cache updates
   - Selective cache refresh

3. **Edge Caching**
   - CDN integration
   - Geographic cache distribution
   - Edge function caching

4. **Personalized Caching**
   - User-specific cache segments
   - Role-based caching
   - Dynamic cache keys