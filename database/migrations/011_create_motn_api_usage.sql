CREATE TABLE IF NOT EXISTS motn_api_usage (
  usage_id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL,
  status_code INTEGER,
  success_flag INTEGER NOT NULL DEFAULT 0 CHECK (success_flag IN (0, 1)),
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_motn_api_usage_created_at
ON motn_api_usage (created_at);

CREATE INDEX IF NOT EXISTS idx_motn_api_usage_endpoint
ON motn_api_usage (endpoint);