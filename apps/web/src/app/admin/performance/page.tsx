'use client';

import { useEffect, useState } from 'react';
import { PerformanceStats, PerformanceMetricType } from '@/lib/performance';
import { supabase } from '@/lib/supabase';
import { Pause, Play, Download, Trash2, BarChart3, Target, Database, Timer, AlertTriangle, RefreshCw } from 'lucide-react';
import { Modal, PerformanceChart } from '@/components/shared';

interface MetricRow {
  type: PerformanceMetricType;
  duration: number;
  success: boolean;
  metadata: any;
  created_at: string;
}

export default function PerformanceDashboard() {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [stats, setStats] = useState<Record<PerformanceMetricType, PerformanceStats | null>>({
    message_send: null,
    message_realtime: null,
    image_upload: null,
    image_compression: null,
    realtime_reconnect: null,
    page_load: null,
    room_switch: null,
    navigation: null,
    tti: null,
    fcp: null,
    lcp: null,
    cls: null,
    fid: null,
    component_render: null,
  });
  const [flaggedStats, setFlaggedStats] = useState<PerformanceStats | null>(null);
  const [nonFlaggedStats, setNonFlaggedStats] = useState<PerformanceStats | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<Record<string, { timestamp: Date; value: number }[]>>({});

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

      // Group metrics by type and separate flagged/non-flagged messages
      const metricsByType: Record<string, number[]> = {};
      const flaggedMessages: number[] = [];
      const nonFlaggedMessages: number[] = [];
      
      (data as MetricRow[]).forEach(metric => {
        if (!metricsByType[metric.type]) {
          metricsByType[metric.type] = [];
        }
        metricsByType[metric.type].push(metric.duration);
        
        // Separate message_send into flagged/non-flagged
        if (metric.type === 'message_send' && metric.metadata) {
          if (metric.metadata.wasFlagged) {
            flaggedMessages.push(metric.duration);
          } else {
            nonFlaggedMessages.push(metric.duration);
          }
        }
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
        navigation: calculateStats(metricsByType['navigation'] || []),
        tti: calculateStats(metricsByType['tti'] || []),
        fcp: calculateStats(metricsByType['fcp'] || []),
        lcp: calculateStats(metricsByType['lcp'] || []),
        cls: calculateStats(metricsByType['cls'] || []),
        fid: calculateStats(metricsByType['fid'] || []),
        component_render: calculateStats(metricsByType['component_render'] || []),
      };

      setStats(newStats);
      setFlaggedStats(calculateStats(flaggedMessages));
      setNonFlaggedStats(calculateStats(nonFlaggedMessages));
      setLastUpdated(new Date());

      // Fetch time-series data for charts
      await fetchTimeSeriesData(data as MetricRow[]);
    } catch (err) {
      console.error('[Performance Dashboard] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeSeriesData = async (metrics: MetricRow[]) => {
    try {
      // Group metrics by type and hour
      const timeSeriesByType: Record<string, Map<string, number[]>> = {};
      
      metrics.forEach(metric => {
        if (!timeSeriesByType[metric.type]) {
          timeSeriesByType[metric.type] = new Map();
        }
        
        // Round to nearest hour for grouping
        const date = new Date(metric.created_at);
        const hourKey = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).toISOString();
        
        if (!timeSeriesByType[metric.type].has(hourKey)) {
          timeSeriesByType[metric.type].set(hourKey, []);
        }
        
        timeSeriesByType[metric.type].get(hourKey)!.push(metric.duration);
      });

      // Calculate averages for each hour
      const timeSeriesFormatted: Record<string, { timestamp: Date; value: number }[]> = {};
      
      Object.entries(timeSeriesByType).forEach(([type, hourMap]) => {
        timeSeriesFormatted[type] = Array.from(hourMap.entries())
          .map(([hourKey, durations]) => ({
            timestamp: new Date(hourKey),
            value: Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length),
          }))
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      });

      setTimeSeriesData(timeSeriesFormatted);
    } catch (err) {
      console.error('[Performance Dashboard] Error fetching time-series data:', err);
    }
  };

  useEffect(() => {
    fetchMetrics();

    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const confirmClearMetrics = async () => {
    setShowClearConfirm(false);
    
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
      navigation: 1000,
      tti: 3500,
      fcp: 1800,
      lcp: 2500,
      cls: 0.1,
      fid: 100,
      component_render: 16,
    };

    const threshold = thresholds[type];
    if (value < threshold * 0.5) return 'badge-success';
    if (value < threshold) return 'badge-warning';
    return 'badge-error';
  };

  const metricLabels: Record<PerformanceMetricType, string> = {
    message_send: 'Besked sendt (udgående)',
    message_realtime: 'Besked modtaget (indgående)',
    image_upload: 'Billed upload',
    image_compression: 'Billed komprimering',
    realtime_reconnect: 'Real-time genopretning',
    page_load: 'Side indlæsning',
    room_switch: 'Rum skift',
    navigation: 'Navigation (klient-side)',
    tti: 'Time to Interactive',
    fcp: 'First Contentful Paint',
    lcp: 'Largest Contentful Paint',
    cls: 'Cumulative Layout Shift',
    fid: 'First Input Delay',
    component_render: 'Komponent rendering',
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-12 space-y-6">
        {/* Page Header - Below AdminLayout header */}
        <div className="pt-6 sm:pt-8 space-y-4">
          {/* Title */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-base-content">
              Performance Dashboard
            </h1>
            <div className="h-1 w-24 bg-primary mt-2"></div>
          </div>
          
          {/* Timestamp and Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            {lastUpdated && (
              <span className="text-xs text-base-content/60">
                Sidst opdateret: {lastUpdated.toLocaleTimeString('da-DK')}
              </span>
            )}
            <div className="flex flex-wrap items-center gap-2">
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
              <button className="btn btn-error btn-ghost btn-sm" onClick={() => setShowClearConfirm(true)}>
                <Trash2 className="w-4 h-4" strokeWidth={2} /> Ryd (7 dage)
              </button>
            </div>
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

        {/* Performance Over Time Charts */}
        {!loading && Object.keys(timeSeriesData).length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black uppercase tracking-tight text-base-content">
              Performance Over Tid
            </h2>
            <div className="h-1 w-24 bg-primary"></div>

            {/* Key User Actions Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              {timeSeriesData['message_send'] && timeSeriesData['message_send'].length > 0 && (
                <PerformanceChart
                  title="Besked Sendt"
                  data={timeSeriesData['message_send']}
                  yAxisLabel="Latens (ms)"
                  threshold={1000}
                  color="#ff3fa4"
                />
              )}
              
              {timeSeriesData['navigation'] && timeSeriesData['navigation'].length > 0 && (
                <PerformanceChart
                  title="Navigation"
                  data={timeSeriesData['navigation']}
                  yAxisLabel="Latens (ms)"
                  threshold={200}
                  color="#ffb347"
                />
              )}
            </div>

            {/* Web Vitals Charts */}
            <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-6">
              <h3 className="text-xl font-black uppercase tracking-tight text-base-content mb-4">
                Web Vitals
              </h3>
              <div className="grid gap-6 lg:grid-cols-2">
                {timeSeriesData['lcp'] && timeSeriesData['lcp'].length > 0 && (
                  <PerformanceChart
                    title="LCP (Largest Contentful Paint)"
                    data={timeSeriesData['lcp']}
                    yAxisLabel="Tid (ms)"
                    threshold={2500}
                    color="#7fdb8f"
                  />
                )}
                
                {timeSeriesData['fcp'] && timeSeriesData['fcp'].length > 0 && (
                  <PerformanceChart
                    title="FCP (First Contentful Paint)"
                    data={timeSeriesData['fcp']}
                    yAxisLabel="Tid (ms)"
                    threshold={1800}
                    color="#6b9bd1"
                  />
                )}

                {timeSeriesData['tti'] && timeSeriesData['tti'].length > 0 && (
                  <PerformanceChart
                    title="TTI (Time to Interactive)"
                    data={timeSeriesData['tti']}
                    yAxisLabel="Tid (ms)"
                    threshold={3800}
                    color="#6247f5"
                  />
                )}

                {timeSeriesData['fid'] && timeSeriesData['fid'].length > 0 && (
                  <PerformanceChart
                    title="FID (First Input Delay)"
                    data={timeSeriesData['fid']}
                    yAxisLabel="Forsinkelse (ms)"
                    threshold={100}
                    color="#e86b6b"
                  />
                )}
              </div>
            </div>

            {/* Backend Operations Charts */}
            <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-6">
              <h3 className="text-xl font-black uppercase tracking-tight text-base-content mb-4">
                Backend Operationer
              </h3>
              <div className="grid gap-6 lg:grid-cols-2">
                {timeSeriesData['image_upload'] && timeSeriesData['image_upload'].length > 0 && (
                  <PerformanceChart
                    title="Billede Upload"
                    data={timeSeriesData['image_upload']}
                    yAxisLabel="Latens (ms)"
                    threshold={2000}
                    color="#ffb347"
                  />
                )}

                {timeSeriesData['image_compression'] && timeSeriesData['image_compression'].length > 0 && (
                  <PerformanceChart
                    title="Billede Komprimering"
                    data={timeSeriesData['image_compression']}
                    yAxisLabel="Tid (ms)"
                    threshold={1500}
                    color="#ffd966"
                  />
                )}

                {timeSeriesData['realtime_reconnect'] && timeSeriesData['realtime_reconnect'].length > 0 && (
                  <PerformanceChart
                    title="Realtime Genforbindelse"
                    data={timeSeriesData['realtime_reconnect']}
                    yAxisLabel="Tid (ms)"
                    threshold={3000}
                    color="#6b9bd1"
                  />
                )}

                {timeSeriesData['room_switch'] && timeSeriesData['room_switch'].length > 0 && (
                  <PerformanceChart
                    title="Rum Skift"
                    data={timeSeriesData['room_switch']}
                    yAxisLabel="Latens (ms)"
                    threshold={500}
                    color="#7fdb8f"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Flagged vs Non-Flagged Message Stats */}
        {!loading && (flaggedStats || nonFlaggedStats) && (
          <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-6">
            <h2 className="text-xl font-black uppercase tracking-tight text-base-content mb-4">
              Besked sendt - AI Moderation opdeling
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Non-Flagged Messages */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-bold uppercase tracking-tight text-success">
                    Rene beskeder
                  </h3>
                  {nonFlaggedStats && (
                    <span className="badge badge-success font-bold">
                      {nonFlaggedStats.count}
                    </span>
                  )}
                </div>
                {nonFlaggedStats ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-base-content/60">Gennemsnit:</span>
                      <span className="font-mono font-bold text-success">
                        {formatDuration(nonFlaggedStats.avg)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/60">Median (p50):</span>
                      <span className="font-mono font-bold">
                        {formatDuration(nonFlaggedStats.p50)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/60">95% percentil:</span>
                      <span className="font-mono font-bold">
                        {formatDuration(nonFlaggedStats.p95)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-base-content/50">Ingen data endnu</p>
                )}
              </div>

              {/* Flagged Messages */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-bold uppercase tracking-tight text-warning">
                    Flaggede beskeder
                  </h3>
                  {flaggedStats && (
                    <span className="badge badge-warning font-bold">
                      {flaggedStats.count}
                    </span>
                  )}
                </div>
                {flaggedStats ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-base-content/60">Gennemsnit:</span>
                      <span className="font-mono font-bold text-warning">
                        {formatDuration(flaggedStats.avg)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/60">Median (p50):</span>
                      <span className="font-mono font-bold">
                        {formatDuration(flaggedStats.p50)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/60">95% percentil:</span>
                      <span className="font-mono font-bold">
                        {formatDuration(flaggedStats.p95)}
                      </span>
                    </div>
                    <div className="mt-3 p-3 bg-warning/10 border-2 border-warning/20">
                      <p className="text-xs text-base-content/70">
                        {(() => {
                          const percentDiff = Math.round((flaggedStats.avg / (nonFlaggedStats?.avg || 1)) * 100 - 100);
                          const isSlower = percentDiff > 0;
                          return (
                            <>
                              <strong>Forskel:</strong> Flaggede beskeder er {Math.abs(percentDiff)}% {isSlower ? 'langsommere' : 'hurtigere'}{isSlower ? ' pga. AI moderation' : ''}
                            </>
                          );
                        })()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-base-content/50">Ingen flaggede beskeder endnu</p>
                )}
              </div>
            </div>
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
              <Timer className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2} />
              <span><strong>Auto-refresh:</strong> Dashboard opdateres hvert 30. sekund når aktiveret</span>
            </p>
            <p className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2} />
              <span><strong>Advarsler:</strong> Langsomme operationer logges i konsollen</span>
            </p>
          </div>
        </div>
      
        {/* Clear Metrics Confirmation Modal */}
        <Modal
          id="clear-metrics-modal"
          open={showClearConfirm}
          onClose={() => setShowClearConfirm(false)}
          title="Ryd Performance Metrics"
          size="md"
          actions={
            <>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="btn btn-ghost"
              >
                Annuller
              </button>
              <button
                onClick={confirmClearMetrics}
                className="btn btn-error"
              >
                Ryd Metrics
              </button>
            </>
          }
        >
          <p className="text-base-content/80">
            Er du sikker på, at du vil rydde alle metrics fra de sidste 7 dage?
          </p>
          <p className="text-base-content/60 text-sm mt-2">
            Dette vil permanent slette alle performance data. Denne handling kan ikke fortrydes.
          </p>
        </Modal>
      </div>
  );
}
