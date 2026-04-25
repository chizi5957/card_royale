-- Create the key-value store table for game state
CREATE TABLE IF NOT EXISTS kv_store_01880f2a (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);

-- Add index for faster prefix searches
CREATE INDEX IF NOT EXISTS idx_kv_store_key_prefix ON kv_store_01880f2a (key text_pattern_ops);

-- Grant permissions to authenticated users (via service role)
GRANT ALL ON TABLE kv_store_01880f2a TO postgres;
GRANT ALL ON TABLE kv_store_01880f2a TO service_role;
