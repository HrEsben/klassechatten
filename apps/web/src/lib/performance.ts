/**
 * Application Performance Monitoring
 * Tracks user-perceived latency for key operations
 * Complements Vercel (Web Vitals) and Supabase (DB queries) monitoring
 */

export type PerformanceMetricType =
  | 'message_send'           // User clicks send → message appears
  | 'message_realtime'       // Other user sends → appears on screen
  | 'image_upload'           // Select image → upload complete
  | 'image_compression'      // Image compression time
  | 'realtime_reconnect'     // Realtime connection lost → reconnected
  | 'page_load'              // Initial page load time
  | 'room_switch'            // Switch rooms → messages loaded
  | 'navigation'             // Client-side navigation duration
  | 'tti'                    // Time to Interactive
  | 'fcp'                    // First Contentful Paint
  | 'lcp'                    // Largest Contentful Paint
  | 'cls'                    // Cumulative Layout Shift
  | 'fid'                    // First Input Delay
  | 'component_render';      // Component re-render duration

export interface PerformanceMetric {
  type: PerformanceMetricType;
  duration: number;           // milliseconds
  timestamp: number;          // Unix timestamp
  metadata?: Record<string, any>; // Additional context
  success: boolean;           // Did operation complete successfully?
}

export interface PerformanceStats {
  count: number;
  avg: number;
  min: number;
  max: number;
  p50: number;  // median
  p95: number;
  p99: number;
}

const STORAGE_KEY = 'klassechatten_performance_metrics';
const MAX_METRICS_STORED = 1000; // Keep last 1000 metrics
const ALERT_THRESHOLDS: Record<PerformanceMetricType, number> = {
  message_send: 3000,        // 3 seconds
  message_realtime: 2000,    // 2 seconds
  image_upload: 15000,       // 15 seconds
  image_compression: 5000,   // 5 seconds
  realtime_reconnect: 5000,  // 5 seconds
  page_load: 5000,           // 5 seconds
  room_switch: 2000,         // 2 seconds
  navigation: 1000,          // 1 second (should be instant)
  tti: 3500,                 // 3.5 seconds (Google recommends < 3.8s)
  fcp: 1800,                 // 1.8 seconds (Good: < 1.8s)
  lcp: 2500,                 // 2.5 seconds (Good: < 2.5s)
  cls: 0.1,                  // 0.1 (Good: < 0.1)
  fid: 100,                  // 100ms (Good: < 100ms)
  component_render: 16,      // 16ms (60fps target)
};

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, number> = new Map();
  private isClient: boolean;
  private metricsLoaded: boolean = false;

  constructor() {
    this.isClient = typeof globalThis !== 'undefined' && 'window' in globalThis;
    if (this.isClient) {
      this.loadMetrics();
      this.initWebVitals();
      this.initNavigationTracking();
    }
  }

  /**
   * Ensure metrics are loaded (lazy loading for client-side)
   */
  private ensureMetricsLoaded(): void {
    if (this.isClient && !this.metricsLoaded) {
      this.loadMetrics();
    }
  }

  /**
   * Start timing an operation
   */
  startTimer(id: string): void {
    console.log(`[Performance] startTimer called: ${id}, isClient: ${this.isClient}`);
    this.timers.set(id, Date.now());
  }

  /**
   * End timing and record metric
   */
  endTimer(
    id: string,
    type: PerformanceMetricType,
    options?: {
      metadata?: Record<string, any>;
      success?: boolean;
    }
  ): number | null {
    console.log(`[Performance] endTimer called: ${id}, type: ${type}, isClient: ${this.isClient}`);
    const startTime = this.timers.get(id);
    if (!startTime) {
      console.warn(`[Performance] No start timer found for: ${id}`);
      return null;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(id);
    
    console.log(`[Performance] About to recordMetric: ${type}, duration: ${duration}ms`);

    this.recordMetric({
      type,
      duration,
      timestamp: Date.now(),
      metadata: options?.metadata,
      success: options?.success ?? true,
    });

    // Check alert threshold
    if (duration > ALERT_THRESHOLDS[type]) {
      this.handleSlowOperation(type, duration);
    }

    return duration;
  }

  /**
   * Record a metric directly (without timer)
   */
  recordMetric(metric: PerformanceMetric): void {
    if (!this.isClient) {
      console.warn('[Performance] Not on client, cannot record metric');
      return;
    }

    this.metrics.push(metric);

    // Trim old metrics
    if (this.metrics.length > MAX_METRICS_STORED) {
      this.metrics = this.metrics.slice(-MAX_METRICS_STORED);
    }

    this.saveMetrics();
    
    // Send to Supabase (fire and forget)
    this.sendMetricToSupabase(metric).catch(err => {
      console.warn('[Performance] Failed to send metric to Supabase:', err);
    });

    // Always log metrics for debugging
    console.log(
      `[Performance] ${metric.type}: ${metric.duration}ms (total: ${this.metrics.length})`,
      metric.metadata || ''
    );
  }

  /**
   * Send a single metric to Supabase
   */
  private async sendMetricToSupabase(metric: PerformanceMetric): Promise<void> {
    if (!this.isClient) return;
    
    try {
      // Dynamically import supabase to avoid SSR issues
      const { supabase } = await import('@/lib/supabase');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return; // Only send metrics for authenticated users
      
      const { error } = await supabase
        .from('performance_metrics')
        .insert({
          user_id: session.user.id,
          type: metric.type,
          duration: metric.duration,
          success: metric.success,
          metadata: metric.metadata || {}
        });
        
      if (error) {
        console.warn('[Performance] Supabase insert error:', error);
      }
    } catch (error) {
      // Silently fail - metrics are nice to have but shouldn't break the app
      console.warn('[Performance] Failed to send to Supabase:', error);
    }
  }

  /**
   * Get statistics for a specific metric type
   */
  getStats(type: PerformanceMetricType): PerformanceStats | null {
    this.ensureMetricsLoaded();
    const typeMetrics = this.metrics
      .filter((m) => m.type === type && m.success)
      .map((m) => m.duration)
      .sort((a, b) => a - b);

    if (typeMetrics.length === 0) return null;

    const sum = typeMetrics.reduce((acc, val) => acc + val, 0);
    const avg = sum / typeMetrics.length;
    const min = typeMetrics[0] ?? 0;
    const max = typeMetrics[typeMetrics.length - 1] ?? 0;

    const getPercentile = (p: number) => {
      const index = Math.ceil((p / 100) * typeMetrics.length) - 1;
      return typeMetrics[index] ?? 0;
    };

    return {
      count: typeMetrics.length,
      avg: Math.round(avg),
      min,
      max,
      p50: getPercentile(50),
      p95: getPercentile(95),
      p99: getPercentile(99),
    };
  }

  /**
   * Get all statistics grouped by type
   */
  getAllStats(): Record<PerformanceMetricType, PerformanceStats | null> {
    const types: PerformanceMetricType[] = [
      'message_send',
      'message_realtime',
      'image_upload',
      'image_compression',
      'realtime_reconnect',
      'page_load',
      'room_switch',
      'navigation',
      'tti',
      'fcp',
      'lcp',
      'cls',
      'fid',
      'component_render',
    ];

    return types.reduce((acc, type) => {
      acc[type] = this.getStats(type);
      return acc;
    }, {} as Record<PerformanceMetricType, PerformanceStats | null>);
  }

  /**
   * Get recent metrics for a type
   */
  getRecentMetrics(
    type: PerformanceMetricType,
    limit: number = 50
  ): PerformanceMetric[] {
    return this.metrics
      .filter((m) => m.type === type)
      .slice(-limit);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    if (this.isClient) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): PerformanceMetric[] {
    this.ensureMetricsLoaded();
    return [...this.metrics];
  }

  /**
   * Send metrics to analytics endpoint (optional)
   */
  async sendToAnalytics(endpoint: string): Promise<void> {
    if (!this.isClient || this.metrics.length === 0) return;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: this.metrics,
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
        }),
      });

      if (response.ok) {
        console.log('[Performance] Metrics sent to analytics');
      }
    } catch (error) {
      console.error('[Performance] Failed to send metrics:', error);
    }
  }

  /**
   * Handle slow operations (alerting)
   */
  private handleSlowOperation(
    type: PerformanceMetricType,
    duration: number
  ): void {
    const threshold = ALERT_THRESHOLDS[type];
    console.warn(
      `[Performance Alert] Slow ${type}: ${duration}ms (threshold: ${threshold}ms)`
    );

    // In production, you could send this to an error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Sentry, PostHog, etc.
      // window.analytics?.track('slow_operation', { type, duration, threshold });
    }
  }

  /**
   * Load metrics from localStorage
   */
  private loadMetrics(): void {
    if (!this.isClient) return;
    if (this.metricsLoaded) return; // Already loaded

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.metrics = JSON.parse(stored);
        console.log(`[Performance] Loaded ${this.metrics.length} metrics from localStorage`);
      }
      this.metricsLoaded = true;
    } catch (error) {
      console.error('[Performance] Failed to load metrics:', error);
      this.metrics = [];
      this.metricsLoaded = true;
    }
  }

  /**
   * Save metrics to localStorage
   */
  private saveMetrics(): void {
    if (!this.isClient) return;

    try {
      const data = JSON.stringify(this.metrics);
      localStorage.setItem(STORAGE_KEY, data);
      console.log(`[Performance] Saved ${this.metrics.length} metrics to localStorage`);
      
      // Verify it was saved
      const verification = localStorage.getItem(STORAGE_KEY);
      if (!verification) {
        console.error('[Performance] WARNING: Metrics were not saved to localStorage!');
      } else {
        console.log(`[Performance] Verification: ${verification.length} chars stored`);
      }
    } catch (error) {
      console.error('[Performance] Failed to save metrics:', error);
    }
  }

  /**
   * Initialize Web Vitals tracking using PerformanceObserver
   */
  private initWebVitals(): void {
    if (!this.isClient || typeof PerformanceObserver === 'undefined') return;

    try {
      // Track Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        if (lastEntry) {
          this.recordMetric({
            type: 'lcp',
            duration: lastEntry.renderTime || lastEntry.loadTime,
            timestamp: Date.now(),
            success: true,
          });
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // Track First Contentful Paint (FCP)
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.name === 'first-contentful-paint') {
            this.recordMetric({
              type: 'fcp',
              duration: entry.startTime,
              timestamp: Date.now(),
              success: true,
            });
          }
        });
      });
      fcpObserver.observe({ type: 'paint', buffered: true });

      // Track First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.recordMetric({
            type: 'fid',
            duration: entry.processingStart - entry.startTime,
            timestamp: Date.now(),
            success: true,
          });
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });

      // Track Cumulative Layout Shift (CLS)
      let clsScore = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsScore += entry.value;
          }
        });
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // Report CLS on page unload
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && clsScore > 0) {
          this.recordMetric({
            type: 'cls',
            duration: clsScore,
            timestamp: Date.now(),
            success: true,
          });
        }
      });

      // Track Time to Interactive (TTI) - approximate using load event
      window.addEventListener('load', () => {
        // TTI is approximately when the page is fully loaded and interactive
        const tti = performance.timing.domInteractive - performance.timing.navigationStart;
        this.recordMetric({
          type: 'tti',
          duration: tti,
          timestamp: Date.now(),
          success: true,
        });
      });

      console.log('[Performance] Web Vitals tracking initialized');
    } catch (error) {
      console.warn('[Performance] Failed to initialize Web Vitals:', error);
    }
  }

  /**
   * Initialize client-side navigation tracking
   */
  private initNavigationTracking(): void {
    if (!this.isClient) return;

    // Track route changes (works with Next.js App Router)
    let navigationStart: number | null = null;

    // Intercept navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      navigationStart = Date.now();
      return originalPushState.apply(history, args);
    };

    history.replaceState = function(...args) {
      navigationStart = Date.now();
      return originalReplaceState.apply(history, args);
    };

    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', () => {
      navigationStart = Date.now();
    });

    // Detect when navigation completes (DOM is ready)
    const checkNavigationComplete = () => {
      if (navigationStart && document.readyState === 'complete') {
        const duration = Date.now() - navigationStart;
        this.recordMetric({
          type: 'navigation',
          duration,
          timestamp: Date.now(),
          metadata: { url: window.location.pathname },
          success: true,
        });
        navigationStart = null;
      }
    };

    // Check on readystatechange
    document.addEventListener('readystatechange', checkNavigationComplete);

    // Also check periodically during navigation
    setInterval(() => {
      if (navigationStart && Date.now() - navigationStart > 50) {
        checkNavigationComplete();
      }
    }, 50);

    console.log('[Performance] Navigation tracking initialized');
  }

  /**
   * Track component re-renders (use with React.Profiler)
   */
  trackComponentRender(
    componentName: string,
    phase: 'mount' | 'update' | 'nested-update',
    actualDuration: number
  ): void {
    this.recordMetric({
      type: 'component_render',
      duration: actualDuration,
      timestamp: Date.now(),
      metadata: { componentName, phase },
      success: true,
    });
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for easy performance tracking
 */
export function usePerformanceTimer() {
  const start = (id: string) => performanceMonitor.startTimer(id);
  
  const end = (
    id: string,
    type: PerformanceMetricType,
    options?: {
      metadata?: Record<string, any>;
      success?: boolean;
    }
  ) => performanceMonitor.endTimer(id, type, options);

  return { start, end };
}
