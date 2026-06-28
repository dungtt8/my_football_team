#!/usr/bin/env node
/**
 * Cleanup old migration records from knex_migrations table
 * This script removes old migration entries that were renamed from 003-019 to 004-021
 * 
 * Usage: node cleanup-migrations.js
 * Make sure DATABASE_URL is set in .env or environment
 */

require('dotenv').config();
const knex = require('knex');

const knexInstance = knex({
  client: 'postgresql',
  connection: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
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

async function cleanup() {
  try {
    console.log('🔍 Checking current migrations in database...');
    
    const currentMigrations = await knexInstance('knex_migrations')
      .select('id', 'name', 'batch', 'migration_time')
      .orderBy('batch', 'asc');
    
    console.log('\n📋 Current migrations in database:');
    currentMigrations.forEach(m => {
      console.log(`  [${m.batch}] ${m.name}`);
    });
    
    const toDelete = currentMigrations.filter(m => OLD_MIGRATIONS.includes(m.name));
    
    if (toDelete.length === 0) {
      console.log('\n✅ No old migrations to clean up');
      process.exit(0);
    }
    
    console.log(`\n⚠️  Found ${toDelete.length} old migration records to remove:`);
    toDelete.forEach(m => {
      console.log(`  - ${m.name}`);
    });
    
    // DELETE old records
    const deletedCount = await knexInstance('knex_migrations')
      .whereIn('name', OLD_MIGRATIONS.map(m => m))
      .del();
    
    console.log(`\n✅ Deleted ${deletedCount} old migration records`);
    
    // Show remaining migrations
    const remaining = await knexInstance('knex_migrations')
      .select('name')
      .orderBy('batch', 'asc');
    
    console.log('\n📋 Remaining migrations:');
    remaining.forEach(m => {
      console.log(`  ✓ ${m.name}`);
    });
    
    console.log('\n✅ Cleanup complete! Now you can run: pnpm migrate');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await knexInstance.destroy();
  }
}

cleanup();
