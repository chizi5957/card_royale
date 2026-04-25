#!/usr/bin/env node
/**
 * Initialize database table for Card Battle game
 * This script helps set up the required kv_store table
 *
 * Run with: npx tsx scripts/init-database.ts
 */

console.log('🎮 Card Battle - Database Setup');
console.log('================================\n');

const SQL = `CREATE TABLE IF NOT EXISTS kv_store_01880f2a (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kv_store_key_prefix
  ON kv_store_01880f2a (key text_pattern_ops);

GRANT ALL ON TABLE kv_store_01880f2a TO postgres;
GRANT ALL ON TABLE kv_store_01880f2a TO service_role;`;

console.log('⚠️  Your game needs a database table to store game state.');
console.log('');
console.log('📋 Follow these steps to fix it:');
console.log('');
console.log('1. Open your Supabase SQL Editor:');
console.log('   https://supabase.com/dashboard/project/rfdehdikogvisujmduuo/sql/new');
console.log('');
console.log('2. Copy this SQL and click "Run":');
console.log('');
console.log('─'.repeat(70));
console.log(SQL);
console.log('─'.repeat(70));
console.log('');
console.log('3. Refresh your app - the game will work!');
console.log('');
console.log('✅ That\'s all! The setup takes just 30 seconds.');
console.log('');
