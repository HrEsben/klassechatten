'use client';

import { useEffect } from 'react';
import { performanceMonitor } from '@/lib/performance';

/**
 * Client component that tracks page load performance
 * Uses Navigation Timing API to measure actual page load time
 */
export function PerformanceTracker() {
  useEffect(() => {
    // Track page load time using Navigation Timing API
    if (typeof window === 'undefined') return;

    const measurePageLoad = () => {
      try {
        // Use Performance API to get accurate page load timing
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (perfData) {
          // Total page load time: from navigation start to load complete
          const pageLoadTime = perfData.loadEventEnd - perfData.fetchStart;
          
          // Only record if we have valid data (sometimes loadEventEnd is 0 initially)
          if (pageLoadTime > 0) {
            performanceMonitor.recordMetric({
              type: 'page_load',
              duration: Math.round(pageLoadTime),
              timestamp: Date.now(),
              success: true,
              metadata: {
                domContentLoaded: Math.round(perfData.domContentLoadedEventEnd - perfData.fetchStart),
                domInteractive: Math.round(perfData.domInteractive - perfData.fetchStart),
                firstPaint: Math.round(perfData.responseEnd - perfData.fetchStart),
              }
            });
          }
        }
      } catch (error) {
        console.warn('[PerformanceTracker] Failed to measure page load:', error);
      }
    };

    // Wait for page to fully load
    if (document.readyState === 'complete') {
      measurePageLoad();
    } else {
      window.addEventListener('load', measurePageLoad);
      return () => window.removeEventListener('load', measurePageLoad);
    }
  }, []);

  return null; // This component doesn't render anything
}
