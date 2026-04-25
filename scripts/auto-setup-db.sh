#!/bin/bash
# Automated database table creation using Supabase Management API

set -e

echo "🔧 Attempting automated database setup..."

# Get service role key from environment
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SERVICE_KEY" ]; then
  echo "❌ SUPABASE_SERVICE_ROLE_KEY not found in environment"
  echo "📋 Manual setup required - see scripts/init-database.ts"
  exit 1
fi

# SQL to create table
SQL='CREATE TABLE IF NOT EXISTS kv_store_01880f2a (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kv_store_key_prefix
  ON kv_store_01880f2a (key text_pattern_ops);'

echo "  Checking table status..."

# Try to query the table to see if it exists
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  "https://rfdehdikogvisujmduuo.supabase.co/rest/v1/kv_store_01880f2a?select=key&limit=1")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Table already exists!"
  echo "🎮 Your game is ready!"
  exit 0
fi

echo "  Table not found (HTTP $HTTP_CODE)"
echo ""
echo "📋 Please create the table manually in Supabase:"
echo "   https://supabase.com/dashboard/project/rfdehdikogvisujmduuo/sql/new"
echo ""
echo "Copy and run this SQL:"
echo "────────────────────────────────────────────────────────────────"
echo "$SQL"
echo "────────────────────────────────────────────────────────────────"
echo ""
echo "✅ After running the SQL, refresh your app!"
