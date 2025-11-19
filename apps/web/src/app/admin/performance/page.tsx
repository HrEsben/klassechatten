'use client';

import { useEffect, useState } from 'react';
import { PerformanceStats, PerformanceMetricType } from '@/lib/performance';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { Pause, Play, Download, Trash2, BarChart3, Target, Database, Timer, AlertTriangle, RefreshCw } from 'lucide-react';

interface MetricRow {
  type: PerformanceMetricType;
  duration: number;
  success: boolean;
  metadata: any;
  created_at: string;
}

export default function PerformanceDashboard() {
  const [stats, setStats] = useState<Record<PerformanceMetricType, PerformanceStats | null>>({
    message_send: null,
    message_realtime: null,
    image_upload: null,
    image_compression: null,
    realtime_reconnect: null,
    page_load: null,
    room_switch: null,
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const calculateStats = (metrics: number[]): PerformanceStats | null => {
    if (metrics.length === 0) return null;

    const sorted = [...metrics].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    
    const getPercentile = (p: number) => {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, index)];
    };

    return {
      count: sorted.length,
      avg: Math.round(sum / sorted.length),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: getPercentile(50),
      p95: getPercentile(95),
      p99: getPercentile(99),
    };
  };

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      
      // Fetch last 7 days of metrics
      const { data, error } = await supabase
        .from('performance_metrics')
        .select('type, duration, success, metadata, created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Performance Dashboard] Failed to fetch metrics:', error);
        return;
      }

      // Group metrics by type
      const metricsByType: Record<string, number[]> = {};
      
      (data as MetricRow[]).forEach(metric => {
        if (!metricsByType[metric.type]) {
          metricsByType[metric.type] = [];
        }
        metricsByType[metric.type].push(metric.duration);
      });

      // Calculate stats for each type
      const newStats: Record<PerformanceMetricType, PerformanceStats | null> = {
        message_send: calculateStats(metricsByType['message_send'] || []),
        message_realtime: calculateStats(metricsByType['message_realtime'] || []),
        image_upload: calculateStats(metricsByType['image_upload'] || []),
        image_compression: calculateStats(metricsByType['image_compression'] || []),
        realtime_reconnect: calculateStats(metricsByType['realtime_reconnect'] || []),
        page_load: calculateStats(metricsByType['page_load'] || []),
        room_switch: calculateStats(metricsByType['room_switch'] || []),
      };

      setStats(newStats);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('[Performance Dashboard] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const handleClearMetrics = async () => {
    if (!confirm('Er du sikker på, at du vil rydde alle metrics fra de sidste 7 dage?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('performance_metrics')
        .delete()
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        alert('Fejl ved sletning af metrics: ' + error.message);
      } else {
        await fetchMetrics();
        alert('Metrics ryddet!');
      }
    } catch (error) {
      console.error('[Performance Dashboard] Clear error:', error);
      alert('Fejl ved sletning af metrics');
    }
  };

  const handleExport = async () => {
    try {
      const { data, error } = await supabase
        .from('performance_metrics')
        .select('*')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        alert('Fejl ved eksport: ' + error.message);
        return;
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance-metrics-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[Performance Dashboard] Export error:', error);
      alert('Fejl ved eksport');
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getStatusColor = (type: PerformanceMetricType, value: number) => {
    const thresholds: Record<PerformanceMetricType, number> = {
      message_send: 3000,
      message_realtime: 2000,
      image_upload: 15000,
      image_compression: 5000,
      realtime_reconnect: 5000,
      page_load: 5000,
      room_switch: 2000,
    };

    const threshold = thresholds[type];
    if (value < threshold * 0.5) return 'badge-success';
    if (value < threshold) return 'badge-warning';
    return 'badge-error';
  };

  const metricLabels: Record<PerformanceMetricType, string> = {
    message_send: 'Besked sendt',
    message_realtime: 'Real-time besked',
    image_upload: 'Billed upload',
    image_compression: 'Billed komprimering',
    realtime_reconnect: 'Real-time genopretning',
    page_load: 'Side indlæsning',
    room_switch: 'Rum skift',
  };

  return (
    <AdminLayout>
      <div className="w-full max-w-7xl mx-auto px-12 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-base-content">
              Performance Dashboard
            </h1>
            <div className="h-1 w-24 bg-primary mt-2"></div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-base-content/60">
                Sidst opdateret: {lastUpdated.toLocaleTimeString('da-DK')}
              </span>
            )}
            <button
              className="btn btn-ghost btn-sm"
              onClick={fetchMetrics}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={2} />
              Opdater
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? (
                <><Pause className="w-4 h-4" strokeWidth={2} /> Pause</>
              ) : (
                <><Play className="w-4 h-4" strokeWidth={2} /> Start</>
              )}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleExport}>
              <Download className="w-4 h-4" strokeWidth={2} /> Eksporter
            </button>
            <button className="btn btn-error btn-ghost btn-sm" onClick={handleClearMetrics}>
              <Trash2 className="w-4 h-4" strokeWidth={2} /> Ryd (7 dage)
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
              <span className="loading loading-ball loading-lg text-primary"></span>
              <p className="text-base-content/60 font-medium">Indlæser metrics...</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(Object.entries(stats) as [PerformanceMetricType, PerformanceStats | null][]).map(
              ([type, stat]) => (
                <div
                  key={type}
                  className="bg-base-100 border-2 border-base-content/10 shadow-lg p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-black uppercase tracking-tight text-base-content">
                      {metricLabels[type]}
                    </h3>
                    {stat && (
                      <span className={`badge ${getStatusColor(type, stat.p95)} font-bold`}>
                        {stat.count}
                      </span>
                    )}
                  </div>

                {stat ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-base-content/60">Gennemsnit:</span>
                      <span className="font-mono font-bold">
                        {formatDuration(stat.avg)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/60">Median (p50):</span>
                      <span className="font-mono font-bold">
                        {formatDuration(stat.p50)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/60">95% percentil:</span>
                      <span className={`font-mono font-bold badge ${getStatusColor(type, stat.p95)}`}>
                        {formatDuration(stat.p95)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/60">Min / Max:</span>
                      <span className="font-mono text-xs text-base-content/80">
                        {formatDuration(stat.min)} / {formatDuration(stat.max)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-base-content/50">Ingen data tilgængelig</p>
                )}
              </div>
            )
          )}
          </div>
        )}

        {/* Info */}
        <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-6">
          <h2 className="text-xl font-black uppercase tracking-tight text-base-content mb-4">
            Om Performance Monitoring
          </h2>
          <div className="space-y-2 text-sm text-base-content/80">
            <p className="flex items-start gap-2">
              <BarChart3 className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2} />
              <span><strong>Hvad tracker vi:</strong> Brugeroplevede latens - tiden fra handling til synligt resultat</span>
            </p>
            <p className="flex items-start gap-2">
              <Target className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2} />
              <span><strong>Komplementerer:</strong> Vercel (Web Vitals) og Supabase (DB queries)</span>
            </p>
            <p className="flex items-start gap-2">
              <Database className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2} />
              <span><strong>Dataopbevaring:</strong> Metrics gemmes i Supabase database fra alle brugere</span>
            </p>
            <p className="flex items-start gap-2">
              <Timer className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2} />
              <span><strong>Auto-refresh:</strong> Dashboard opdateres hvert 30. sekund når aktiveret</span>
            </p>
            <p className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2} />
              <span><strong>Advarsler:</strong> Langsomme operationer logges i konsollen</span>
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
