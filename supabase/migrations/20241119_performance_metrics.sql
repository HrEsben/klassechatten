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

-- Function to clean up old metrics (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_performance_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM performance_metrics
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Grant execute to authenticated users (will be called by cron or manually)
GRANT EXECUTE ON FUNCTION cleanup_old_performance_metrics() TO authenticated;

COMMENT ON TABLE performance_metrics IS 'Stores application performance metrics from all users';
COMMENT ON COLUMN performance_metrics.type IS 'Type of operation being measured';
COMMENT ON COLUMN performance_metrics.duration IS 'Duration in milliseconds';
COMMENT ON COLUMN performance_metrics.success IS 'Whether the operation completed successfully';
COMMENT ON COLUMN performance_metrics.metadata IS 'Additional context (file sizes, message length, etc)';
