-- Performance Metrics Table
-- Stores application performance data from all users

CREATE TABLE IF NOT EXISTS performance_metrics (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN (
    'message_send',
    'message_realtime',
    'image_upload',
    'image_compression',
    'realtime_reconnect',
    'page_load',
    'room_switch'
  )),
  duration INTEGER NOT NULL, -- milliseconds
  success BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast queries by type and date
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type_created 
  ON performance_metrics(type, created_at DESC);

-- Index for user-specific queries
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user 
  ON performance_metrics(user_id, created_at DESC);

-- Index for metadata queries (e.g., filtering by hasImage)
CREATE INDEX IF NOT EXISTS idx_performance_metrics_metadata 
  ON performance_metrics USING gin(metadata);

-- RLS Policies
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Users can insert their own metrics
CREATE POLICY "Users can insert their own metrics"
  ON performance_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Only global admins can read metrics
CREATE POLICY "Admins can view all metrics"
  ON performance_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only global admins can delete old metrics
CREATE POLICY "Admins can delete metrics"
  ON performance_metrics
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Aggregated daily performance metrics (for historical trends)
CREATE TABLE IF NOT EXISTS performance_metrics_daily (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  type TEXT NOT NULL,
  count INTEGER NOT NULL,
  avg_duration INTEGER NOT NULL,
  p50_duration INTEGER NOT NULL,
  p95_duration INTEGER NOT NULL,
  p99_duration INTEGER NOT NULL,
  success_rate NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date, type)
);

-- Index for fast queries by date and type
CREATE INDEX IF NOT EXISTS idx_performance_metrics_daily_date_type 
  ON performance_metrics_daily(date DESC, type);

-- Function to aggregate old metrics into daily summaries
CREATE OR REPLACE FUNCTION aggregate_old_performance_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Aggregate metrics older than 7 days into daily summaries
  INSERT INTO performance_metrics_daily (date, type, count, avg_duration, p50_duration, p95_duration, p99_duration, success_rate)
  SELECT 
    DATE(created_at) as date,
    type,
    COUNT(*) as count,
    ROUND(AVG(duration))::INTEGER as avg_duration,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration)::INTEGER as p50_duration,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration)::INTEGER as p95_duration,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration)::INTEGER as p99_duration,
    ROUND(AVG(CASE WHEN success THEN 100 ELSE 0 END), 2) as success_rate
  FROM performance_metrics
  WHERE created_at < NOW() - INTERVAL '7 days'
    AND created_at >= NOW() - INTERVAL '90 days'
  GROUP BY DATE(created_at), type
  ON CONFLICT (date, type) DO UPDATE SET
    count = EXCLUDED.count,
    avg_duration = EXCLUDED.avg_duration,
    p50_duration = EXCLUDED.p50_duration,
    p95_duration = EXCLUDED.p95_duration,
    p99_duration = EXCLUDED.p99_duration,
    success_rate = EXCLUDED.success_rate;
  
  -- Delete raw metrics older than 7 days (now aggregated)
  DELETE FROM performance_metrics
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  -- Delete daily summaries older than 90 days
  DELETE FROM performance_metrics_daily
  WHERE date < CURRENT_DATE - INTERVAL '90 days';
END;
$$;

-- Grant execute to authenticated users (will be called by cron or manually)
GRANT EXECUTE ON FUNCTION aggregate_old_performance_metrics() TO authenticated;

-- Enable pg_cron extension if available (optional - requires superuser)
-- This will automatically run cleanup daily at 3 AM
-- To enable: Run this in Supabase SQL Editor as superuser
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('aggregate-performance-metrics', '0 3 * * *', 'SELECT aggregate_old_performance_metrics();');

COMMENT ON TABLE performance_metrics IS 'Stores application performance metrics from all users';
COMMENT ON COLUMN performance_metrics.type IS 'Type of operation being measured';
COMMENT ON COLUMN performance_metrics.duration IS 'Duration in milliseconds';
COMMENT ON COLUMN performance_metrics.success IS 'Whether the operation completed successfully';
COMMENT ON COLUMN performance_metrics.metadata IS 'Additional context (file sizes, message length, etc)';
