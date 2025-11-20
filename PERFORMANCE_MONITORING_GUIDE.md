# Performance Monitoring Guide

## Overview
KlasseChatten includes comprehensive performance monitoring to track user-perceived latency, Web Vitals, and application-specific metrics. This guide explains how to use the performance monitoring system effectively.

## Tracked Metrics

### Application Metrics
- **message_send**: Time from click send button → message appears (Budget: 3000ms)
- **message_realtime**: Time from another user sends → message appears on screen (Budget: 2000ms)
- **image_upload**: Time from select image → upload complete (Budget: 15000ms)
- **image_compression**: Image compression duration (Budget: 5000ms)
- **realtime_reconnect**: Time from connection lost → reconnected (Budget: 5000ms)
- **page_load**: Initial page load time (Budget: 5000ms)
- **room_switch**: Time from switch rooms → messages loaded (Budget: 2000ms)
- **navigation**: Client-side navigation duration (Budget: 1000ms - should be instant)
- **component_render**: Component re-render duration (Budget: 16ms for 60fps)

### Web Vitals (automatically tracked)
- **TTI**: Time to Interactive (Budget: 3500ms, Good < 3.8s)
- **FCP**: First Contentful Paint (Budget: 1800ms, Good < 1.8s)
- **LCP**: Largest Contentful Paint (Budget: 2500ms, Good < 2.5s)
- **CLS**: Cumulative Layout Shift (Budget: 0.1, Good < 0.1)
- **FID**: First Input Delay (Budget: 100ms, Good < 100ms)

## Using Performance Monitoring

### 1. Manual Timer Tracking
```typescript
import { performanceMonitor } from '@/lib/performance';

// Start a timer
performanceMonitor.startTimer('unique-operation-id');

// ... perform operation ...

// End timer and record metric
performanceMonitor.endTimer('unique-operation-id', 'message_send', {
  metadata: { roomId: '123', messageLength: 50 },
  success: true
});
```

### 2. React Hook
```typescript
import { usePerformanceTimer } from '@/lib/performance';

function MyComponent() {
  const { start, end } = usePerformanceTimer();
  
  const handleSend = async () => {
    start('send-message');
    
    try {
      await sendMessage();
      end('send-message', 'message_send', { success: true });
    } catch (error) {
      end('send-message', 'message_send', { success: false });
    }
  };
}
```

### 3. Component Re-render Tracking
```typescript
import { PerformanceProfiler } from '@/components/PerformanceProfiler';

export default function ChatRoom() {
  return (
    <PerformanceProfiler id="ChatRoom">
      {/* Your component content */}
    </PerformanceProfiler>
  );
}
```

The PerformanceProfiler will:
- Track mount and update phases
- Only log renders > 16ms (60fps threshold)
- Send data to the performance dashboard
- Provide detailed timing information

### 4. Web Vitals (Automatic)
Web Vitals are tracked automatically when the page loads:
- No code changes needed
- All metrics sent to Supabase
- Available in `/admin/performance` dashboard
- Tracked per page URL

### 5. Navigation Tracking (Automatic)
Client-side navigation is tracked automatically:
- Intercepts history.pushState/replaceState
- Tracks back/forward navigation
- Measures time to DOM ready
- Includes URL in metadata

## Viewing Performance Data

### Admin Dashboard
Visit `/admin/performance` to see:
- Statistics for all metric types (count, avg, min, max, p50, p95, p99)
- Flagged vs non-flagged message performance comparison
- Real-time auto-refresh (every 10 seconds)
- Export metrics as JSON
- Clear all metrics

### Browser Console
All metrics are logged to console:
```
[Performance] message_send: 245ms (total: 42)
[Performance] navigation: 87ms (total: 43)
```

### Supabase Database
Metrics are stored in the `performance_metrics` table:
```sql
SELECT type, AVG(duration), COUNT(*)
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY type;
```

## Bundle Analysis

### Analyze Bundle Sizes
```bash
npm run build:analyze
```

This will:
1. Build the production bundle
2. Generate interactive HTML reports
3. Open reports in your browser
4. Show:
   - Client bundle sizes
   - Server bundle sizes
   - Shared code between routes
   - Largest dependencies

### Interpreting Results
- **Red**: Large bundles (> budget)
- **Yellow**: Near budget limit
- **Green**: Within budget

Look for:
- Duplicate dependencies
- Large unused libraries
- Opportunities for code splitting
- Heavy third-party packages

## Lighthouse CI

### Local Testing
```bash
# Install Lighthouse CI globally
npm install -g @lhci/cli

# Build project
npm run build

# Start production server
npm run start

# Run Lighthouse CI (in another terminal)
lhci autorun
```

### GitHub Actions
Lighthouse CI runs automatically on every PR:
- Tests 4 key pages (home, admin, classes, profile)
- Runs 3 times per page (median of 3)
- Enforces performance budgets
- Posts results as PR comment
- Fails if budgets are exceeded

### Performance Scores
- **90-100**: Excellent (green)
- **50-89**: Needs improvement (orange)
- **0-49**: Poor (red)

Target: All pages > 90 score

## Performance Budgets

Budgets are defined in `performance-budgets.json`:

### Web Vitals Budgets
- TTI: 3500ms
- FCP: 1800ms
- LCP: 2500ms
- CLS: 0.1
- FID: 100ms

### Resource Budgets
- Scripts: 400KB (500KB for admin)
- Stylesheets: 50KB
- Images: 200KB
- Fonts: 100KB
- Total: 1000KB (1200KB for admin)

### Exceeding Budgets
When a metric exceeds its budget:
1. **Console warning** (development)
2. **Lighthouse CI fails** (PR checks)
3. **Alert threshold triggered** (production)

## Optimization Tips

### 1. Navigation Performance
- Use `<Link>` components (not `<a>` tags)
- Shared layouts prevent re-renders
- Prefetch critical routes
- Minimize layout shifts

### 2. Component Renders
- Wrap expensive components in `React.memo()`
- Use `useCallback` for event handlers
- Use `useMemo` for expensive calculations
- Profile with PerformanceProfiler

### 3. Bundle Size
- Dynamic imports for heavy components
- Code split by route
- Tree-shake unused code
- Analyze with `npm run build:analyze`

### 4. Web Vitals
- Optimize images (compression, lazy loading)
- Minimize layout shifts (reserve space)
- Reduce JavaScript execution time
- Use font-display: swap

## Troubleshooting

### Metrics Not Saving
Check:
1. localStorage available? (private browsing blocks it)
2. Supabase connection working?
3. User authenticated? (only saves for logged-in users)
4. Browser console for errors

### High Metric Values
If metrics are consistently high:
1. Check network conditions (slow connection?)
2. Profile with React DevTools
3. Analyze bundle with webpack analyzer
4. Check Supabase dashboard for DB query times

### Missing Web Vitals
Web Vitals require:
- Modern browser (Chrome, Firefox, Safari latest)
- PerformanceObserver API support
- Page fully loaded (LCP especially)
- User interaction (FID requires input)

## Best Practices

### DO:
- ✅ Track all user-perceived operations
- ✅ Include metadata for context
- ✅ Set realistic budgets
- ✅ Monitor trends over time
- ✅ Optimize based on P95/P99 (not averages)

### DON'T:
- ❌ Track every function call (overhead!)
- ❌ Ignore failed operations (track success: false)
- ❌ Set budgets too tight (allow headroom)
- ❌ Only look at averages (check P95/P99)
- ❌ Forget to clean up old metrics (auto-cleaned after 30 days)

## Example: Tracking a New Feature

```typescript
// 1. Define the operation
const sendMessage = async (content: string) => {
  const timerId = `send-${Date.now()}`;
  
  // 2. Start timer
  performanceMonitor.startTimer(timerId);
  
  try {
    // 3. Perform operation
    const response = await supabase
      .from('messages')
      .insert({ content });
    
    // 4. End timer with success
    performanceMonitor.endTimer(timerId, 'message_send', {
      metadata: { 
        messageLength: content.length,
        wasFlagged: response.data?.flagged 
      },
      success: true
    });
    
    return response;
  } catch (error) {
    // 5. End timer with failure
    performanceMonitor.endTimer(timerId, 'message_send', {
      metadata: { error: error.message },
      success: false
    });
    
    throw error;
  }
};
```

## Resources
- [Web Vitals Documentation](https://web.dev/vitals/)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [React Profiler API](https://react.dev/reference/react/Profiler)
