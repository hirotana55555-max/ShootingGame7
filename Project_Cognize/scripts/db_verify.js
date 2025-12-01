#!/usr/bin/env node
/**
 * Database Verification Tool
 * Quick check of static_index.db state
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../database/static_index.db');

console.log('=== Database Verification Tool ===');
console.log(`Database: ${DB_PATH}\n`);

try {
  const db = new Database(DB_PATH, { readonly: true });
  
  // 1. List all tables
  console.log('📋 Tables:');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  tables.forEach(t => console.log(`  - ${t.name}`));
  
  // 2. Check symbols table
  console.log('\n🔍 Symbols Table Check:');
  const hasSymbols = tables.some(t => t.name === 'symbols');
  
  if (hasSymbols) {
    try {
      const symbolCount = db.prepare('SELECT COUNT(*) as count FROM symbols').get();
      console.log(`  ✓ Symbols table exists`);
      console.log(`  ✓ Symbol count: ${symbolCount.count}`);
      
      if (symbolCount.count > 0) {
        const sample = db.prepare('SELECT * FROM symbols LIMIT 3').all();
        console.log('\n  Sample symbols:');
        sample.forEach(s => {
          console.log(`    ${s.symbol_name} (${s.symbol_type}) in ${s.file_path}:${s.line_number}`);
        });
      }
    } catch (err) {
      console.log(`  ✗ Error querying symbols: ${err.message}`);
    }
  } else {
    console.log('  ✗ Symbols table NOT FOUND');
    console.log('  → Run migrate.js to create it');
  }
  
  // 3. Check file_index
  console.log('\n📊 File Index:');
  try {
    const fileCount = db.prepare('SELECT COUNT(*) as count FROM file_index').get();
    console.log(`  ✓ Files indexed: ${fileCount.count}`);
    
    const withSymbols = db.prepare('SELECT COUNT(*) as count FROM file_index WHERE symbols_json IS NOT NULL AND symbols_json != \'[]\'').get();
    console.log(`  ✓ Files with symbols_json: ${withSymbols.count}`);
  } catch (err) {
    console.log(`  ✗ Error: ${err.message}`);
  }
  
  // 4. Check migrations
  console.log('\n📜 Migrations:');
  try {
    const migrations = db.prepare('SELECT migration_name, applied_at FROM migration_history ORDER BY id').all();
    migrations.forEach(m => {
      console.log(`  ✓ ${m.migration_name} (${m.applied_at})`);
    });
  } catch (err) {
    console.log(`  ⚠ Migration history unavailable: ${err.message}`);
  }
  
  db.close();
  console.log('\n✓ Verification complete');
  
} catch (err) {
  console.error(`✗ Failed to open database: ${err.message}`);
  process.exit(1);
}