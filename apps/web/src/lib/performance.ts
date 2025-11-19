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
  | 'room_switch';           // Switch rooms → messages loaded

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
};

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, number> = new Map();
  private isClient: boolean;

  constructor() {
    this.isClient = typeof globalThis !== 'undefined' && 'window' in globalThis;
    if (this.isClient) {
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

    // Always log metrics for debugging
    console.log(
      `[Performance] ${metric.type}: ${metric.duration}ms (total: ${this.metrics.length})`,
      metric.metadata || ''
    );
  }

  /**
   * Get statistics for a specific metric type
   */
  getStats(type: PerformanceMetricType): PerformanceStats | null {
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

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.metrics = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[Performance] Failed to load metrics:', error);
      this.metrics = [];
    }
  }

  /**
   * Save metrics to localStorage
   */
  private saveMetrics(): void {
    if (!this.isClient) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.metrics));
      console.log(`[Performance] Saved ${this.metrics.length} metrics to localStorage`);
    } catch (error) {
      console.error('[Performance] Failed to save metrics:', error);
    }
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
