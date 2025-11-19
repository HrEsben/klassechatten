'use client';

import { useEffect, useState } from 'react';
import { performanceMonitor, PerformanceStats, PerformanceMetricType } from '@/lib/performance';
import AdminLayout from '@/components/AdminLayout';
import { Pause, Play, Download, Trash2, BarChart3, Target, Database, Timer, AlertTriangle } from 'lucide-react';

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

  useEffect(() => {
    const updateStats = () => {
      setStats(performanceMonitor.getAllStats());
    };

    updateStats();

    if (autoRefresh) {
      const interval = setInterval(updateStats, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const handleClearMetrics = () => {
    if (confirm('Er du sikker på, at du vil rydde alle metrics?')) {
      performanceMonitor.clearMetrics();
      setStats(performanceMonitor.getAllStats());
    }
  };

  const handleExport = () => {
    const metrics = performanceMonitor.exportMetrics();
    const blob = new Blob([JSON.stringify(metrics, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
          
          <div className="flex gap-2">
            <button
              className="btn btn-ghost"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? (
                <><Pause className="w-4 h-4" strokeWidth={2} /> Pause</>
              ) : (
                <><Play className="w-4 h-4" strokeWidth={2} /> Start</>
              )} Auto-refresh
            </button>
            <button className="btn btn-ghost" onClick={handleExport}>
              <Download className="w-4 h-4" strokeWidth={2} /> Eksporter
            </button>
            <button className="btn btn-error btn-ghost" onClick={handleClearMetrics}>
              <Trash2 className="w-4 h-4" strokeWidth={2} /> Ryd
            </button>
          </div>
        </div>

        {/* Stats Grid */}
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
              <span><strong>Dataopbevaring:</strong> Sidste 1000 metrics gemmes i localStorage</span>
            </p>
            <p className="flex items-start gap-2">
              <Timer className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2} />
              <span><strong>Auto-refresh:</strong> Dashboard opdateres hvert 5. sekund når aktiveret</span>
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
