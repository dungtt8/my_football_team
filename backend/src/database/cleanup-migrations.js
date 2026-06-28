#!/usr/bin/env node
/**
 * Cleanup old migration records from knex_migrations table
 * This script removes old migration entries that were renamed from 003-019 to 004-021
 * 
 * Usage: node cleanup-migrations.js
 * Make sure DATABASE_URL is set in .env or environment
 */

require('dotenv').config();
const { Pool } = require('pg');

async function cleanup() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Connecting to database...');
    const conn = await pool.connect();
    
    console.log('📋 Checking current migrations in database...');
    
    const currentMigrations = await conn.query(
      'SELECT migration FROM knex_migrations ORDER BY id;'
    );
    
    console.log(`Found ${currentMigrations.rows.length} migrations:`);
    currentMigrations.rows.forEach(m => {
      console.log(`  - ${m.migration}`);
    });
    
    const OLD_MIGRATIONS = [
      '003_notifications_table.js',
      '004_campaigns_schema.js',
      '005_attendance_schema.js',
      '006_attendance_deadline.js',
      '007_teams_invite_code.js',
      '008_team_settings.js',
      '009_session_scheduling.js',
      '009_team_member_management.js',
      '010_finance_closing_period.js',
      '011_team_fund_info.js',
      '012_auto_session_creation_time.js',
      '013_checkin_settings.js',
      '014_attendance_checkins.js',
      '015_multi_team_support.js',
      '016_user_points_gamification.js',
      '017_remove_session_unique_constraint.js',
      '018_attendance_records.js',
      '019_teams_updated_at.js'
    ];
    
    const toDelete = currentMigrations.rows.filter(m => OLD_MIGRATIONS.includes(m.migration));
    
    if (toDelete.length === 0) {
      console.log('\n✅ No old migrations to clean up');
      conn.release();
      process.exit(0);
    }
    
    console.log(`\n⚠️  Found ${toDelete.length} old migration records to remove:`);
    toDelete.forEach(m => {
      console.log(`  - ${m.migration}`);
    });
    
    // Build DELETE query
    const placeholders = OLD_MIGRATIONS.map((_, i) => `$${i + 1}`).join(',');
    const deleteQuery = `DELETE FROM knex_migrations WHERE migration IN (${placeholders});`;
    
    console.log('\n🧹 Deleting old migration records...');
    const result = await conn.query(deleteQuery, OLD_MIGRATIONS);
    console.log(`✅ Deleted ${result.rowCount} old migration records`);
    
    // Show remaining migrations
    const remaining = await conn.query(
      'SELECT migration FROM knex_migrations ORDER BY id;'
    );
    
    console.log(`\n📋 Remaining migrations (${remaining.rows.length}):`);
    remaining.rows.forEach(m => {
      console.log(`  ✓ ${m.migration}`);
    });
    
    console.log('\n✅ Cleanup complete! Now you can run: pnpm migrate');
    conn.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

cleanup();
