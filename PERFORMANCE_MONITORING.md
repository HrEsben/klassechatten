# Application Performance Monitoring 📊

## Overview

KlasseChatten now includes comprehensive application performance monitoring that tracks **user-perceived latency** - the time from user action to visible result. This complements Vercel's Web Vitals monitoring and Supabase's database query monitoring.

## What We Track

### 1. **Message Send Latency** (`message_send`)
- **Measures**: User clicks "Send" → Message appears in chat
- **Threshold**: 3 seconds
- **Includes**: Network latency + Edge Function processing + Realtime broadcast + UI update
- **Metadata**: Has image, has reply, body length

### 2. **Real-time Message Latency** (`message_realtime`)
- **Measures**: Other user sends message → Appears on your screen
- **Threshold**: 2 seconds
- **Includes**: Realtime broadcast latency + UI rendering

### 3. **Image Upload** (`image_upload`)
- **Measures**: Select image → Upload complete (public URL available)
- **Threshold**: 15 seconds
- **Includes**: Network upload time for compressed image + thumbnail
- **Metadata**: File size, has thumbnail

### 4. **Image Compression** (`image_compression`)
- **Measures**: Raw image → Compressed + thumbnail generated
- **Threshold**: 5 seconds
- **Includes**: Worker thread compression + thumbnail generation
- **Metadata**: Original size, compressed size, thumbnail size, compression ratio

### 5. **Realtime Reconnection** (`realtime_reconnect`)
- **Measures**: Connection lost → Reconnected and subscribed
- **Threshold**: 5 seconds
- **Future implementation**

### 6. **Page Load** (`page_load`)
- **Measures**: Initial page load time
- **Threshold**: 5 seconds
- **Future implementation**

### 7. **Room Switch** (`room_switch`)
- **Measures**: Switch rooms → Messages loaded and displayed
- **Threshold**: 2 seconds
- **Future implementation**

## Architecture

### Data Storage
- **Location**: Browser `localStorage`
- **Key**: `klassechatten_performance_metrics`
- **Capacity**: Last 1000 metrics (auto-trimmed)
- **Format**: JSON array of `PerformanceMetric` objects

### Performance Monitor Class
```typescript
class PerformanceMonitor {
  startTimer(id: string): void
  endTimer(id: string, type: PerformanceMetricType, options?): number | null
  recordMetric(metric: PerformanceMetric): void
  getStats(type: PerformanceMetricType): PerformanceStats | null
  getAllStats(): Record<PerformanceMetricType, PerformanceStats | null>
  clearMetrics(): void
  exportMetrics(): PerformanceMetric[]
  sendToAnalytics(endpoint: string): Promise<void>
}
```

## Integration Examples

### Message Send (Already Integrated)
```typescript
import { performanceMonitor } from '@/lib/performance';

const sendMessage = async (roomId: string, body?: string) => {
  const perfId = `message_send_${Date.now()}`;
  performanceMonitor.startTimer(perfId);
  
  try {
    // ... send message logic ...
    
    performanceMonitor.endTimer(perfId, 'message_send', {
      success: true,
      metadata: { bodyLength: body?.length || 0 }
    });
  } catch (error) {
    performanceMonitor.endTimer(perfId, 'message_send', { success: false });
  }
};
```

### Custom Metric Tracking
```typescript
// Start timer
performanceMonitor.startTimer('my-operation');

// ... do work ...

// End timer
const duration = performanceMonitor.endTimer('my-operation', 'message_send', {
  success: true,
  metadata: { customData: 'value' }
});

console.log(`Operation took ${duration}ms`);
```

### Using React Hook
```typescript
import { usePerformanceTimer } from '@/lib/performance';

function MyComponent() {
  const { start, end } = usePerformanceTimer();
  
  const handleClick = () => {
    start('button-click');
    // ... do work ...
    end('button-click', 'page_load', { success: true });
  };
}
```

## Dashboard

Access the performance dashboard at **`/admin/performance`**

### Features:
- **Real-time stats**: Average, median (p50), 95th percentile, min/max
- **Auto-refresh**: Updates every 5 seconds (toggle on/off)
- **Color-coded badges**: Green (fast), yellow (moderate), red (slow)
- **Export**: Download metrics as JSON
- **Clear**: Reset all metrics
- **Metric count**: Shows number of samples collected

### Statistics Displayed:
- **Count**: Number of samples
- **Average**: Mean duration
- **Median (p50)**: 50th percentile (middle value)
- **p95**: 95th percentile (worst-case for most users)
- **Min/Max**: Fastest and slowest measurements

## Alert Thresholds

When an operation exceeds its threshold, a console warning is logged:

```
[Performance Alert] Slow message_send: 3200ms (threshold: 3000ms)
```

| Metric Type | Threshold | Status |
|-------------|-----------|--------|
| `message_send` | 3000ms | 🟢 Good if <1500ms, 🟡 OK if <3000ms, 🔴 Slow if >3000ms |
| `message_realtime` | 2000ms | 🟢 Good if <1000ms, 🟡 OK if <2000ms, 🔴 Slow if >2000ms |
| `image_upload` | 15000ms | 🟢 Good if <7500ms, 🟡 OK if <15000ms, 🔴 Slow if >15000ms |
| `image_compression` | 5000ms | 🟢 Good if <2500ms, 🟡 OK if <5000ms, 🔴 Slow if >5000ms |

## Analytics Integration (Optional)

To send metrics to an analytics service:

```typescript
// One-time export
await performanceMonitor.sendToAnalytics('https://your-analytics-endpoint.com/metrics');

// Periodic export (e.g., every 5 minutes)
setInterval(() => {
  performanceMonitor.sendToAnalytics('https://your-analytics-endpoint.com/metrics');
}, 5 * 60 * 1000);
```

### Supported Platforms:
- PostHog
- Mixpanel
- Custom endpoint
- Sentry Performance Monitoring (requires additional integration)

## Development vs Production

### Development Mode:
- All metrics logged to console: `[Performance] message_send: 1234ms`
- Detailed metadata displayed
- Slow operation warnings always shown

### Production Mode:
- Silent operation (no console logs except alerts)
- Metrics stored in localStorage
- Optional: Send to analytics endpoint

## Why This Matters

### What Vercel DOESN'T See:
- Message send latency (includes Edge Function + Realtime)
- Real-time broadcast delays
- Image compression time (happens client-side)
- Full end-to-end user experience

### What Supabase DOESN'T See:
- Client-side latency
- Network delays
- UI rendering time
- Image processing time

### What WE Track:
✅ **Complete user experience** from click to visible result
✅ **Real-world performance** including all network hops
✅ **Client-side operations** (compression, rendering)
✅ **End-to-end latency** that users actually experience

## Files Modified

### New Files:
1. `apps/web/src/lib/performance.ts` - Core monitoring class
2. `apps/web/src/app/admin/performance/page.tsx` - Dashboard UI
3. `packages/lib/src/performance.ts` - Shared library version

### Modified Files:
1. `apps/web/src/hooks/useSendMessage.ts` - Integrated message send tracking
2. `packages/lib/src/index.ts` - Exported performance module

## Future Enhancements

### Planned:
- [ ] Real-time message latency tracking
- [ ] Room switch performance
- [ ] Page load metrics
- [ ] Realtime reconnection tracking

### Optional:
- [ ] Server-side analytics endpoint
- [ ] Sentry integration for slow operations
- [ ] Historical trend analysis
- [ ] Performance regression detection
- [ ] User cohort analysis (mobile vs desktop)

## Best Practices

1. **Always wrap critical user operations** with performance timers
2. **Include relevant metadata** for debugging (file size, body length, etc.)
3. **Mark operations as success/failure** for accurate filtering
4. **Use unique timer IDs** to avoid conflicts (timestamp-based recommended)
5. **Monitor p95, not average** - represents worst-case for 95% of users
6. **Export metrics regularly** for long-term analysis

## Troubleshooting

### Metrics not showing up?
- Check browser console for errors
- Ensure localStorage is enabled
- Clear cache and reload

### Dashboard shows "Ingen data tilgængelig"?
- No metrics collected yet - perform some operations first
- Check if metrics were cleared recently

### Slow operations not alerting?
- Check console in development mode
- Verify threshold values in `performance.ts`
- Ensure operation completed (timer ended)

## Performance Impact

- **Memory**: ~100KB for 1000 metrics
- **CPU**: Negligible (simple timestamp arithmetic)
- **Storage**: ~50-100KB in localStorage
- **Network**: 0 (unless sending to analytics)

## Summary

✅ **Implemented**: Message send, image upload, image compression tracking
✅ **Dashboard**: Full-featured UI at `/admin/performance`
✅ **Alerting**: Console warnings for slow operations
✅ **Export**: JSON download for analysis
✅ **Auto-refresh**: Real-time dashboard updates

This monitoring system provides insights that **neither Vercel nor Supabase can offer** - the complete, end-to-end user experience timing that actually matters for UX.
