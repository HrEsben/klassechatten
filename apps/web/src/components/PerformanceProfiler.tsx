'use client';

import { Profiler, ProfilerOnRenderCallback, ReactNode } from 'react';
import { performanceMonitor } from '@/lib/performance';

interface PerformanceProfilerProps {
  id: string;
  children: ReactNode;
  enabled?: boolean;
}

/**
 * Wrapper component for React Profiler that tracks component render performance
 * 
 * Usage:
 * <PerformanceProfiler id="ChatRoom">
 *   <ChatRoom />
 * </PerformanceProfiler>
 */
export function PerformanceProfiler({ 
  id, 
  children, 
  enabled = process.env.NODE_ENV === 'development' 
}: PerformanceProfilerProps) {
  const onRender: ProfilerOnRenderCallback = (
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  ) => {
    // Only track if enabled and if render took more than 16ms (60fps threshold)
    if (enabled && actualDuration > 16) {
      performanceMonitor.trackComponentRender(
        id,
        phase,
        actualDuration
      );
      
      console.log(
        `[Profiler] ${id} (${phase}): ${actualDuration.toFixed(2)}ms` +
        ` (base: ${baseDuration.toFixed(2)}ms)`
      );
    }
  };

  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
}
