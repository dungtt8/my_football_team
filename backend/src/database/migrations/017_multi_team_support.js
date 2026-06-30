/**
 * Migration 015: Multi-Team Support
 * 
 * Changes:
 * 1. Add deprecated comment to users.role - Role should be determined by team_members.role
 * 2. Ensure team_members is the source of truth for per-team roles
 * 3. Add indexes to optimize multi-team queries
 * 
 * Note: users.role is kept for backward compatibility but should not be used
 * in new code. Always use team_members.role which is team-specific.
 */

exports.up = async (knex) => {
    // Add indexes to optimize multi-team queries
    await knex.raw('CREATE INDEX IF NOT EXISTS team_members_user_id_status_index ON team_members(user_id, status)');
    await knex.raw('CREATE INDEX IF NOT EXISTS team_members_team_id_user_id_status_index ON team_members(team_id, user_id, status)');

    // Comment on users table about role deprecation
    // Note: This is just documentation in the migration, actual change is in code
    console.log(`
    ⚠️  DEPRECATION NOTICE:
    The 'users.role' column is deprecated and should NOT be used.
    
    REASON: With multi-team support, users can have different roles in different teams.
    
    REPLACE ALL:
    - users.role → team_members.role (per-team authority)
    
    MIGRATION PATH:
    1. All new features use team_members.role only
    2. team_members.role is source of truth for permissions
    3. users.role will be removed in future version
    
    CURRENT STATUS: Kept for backward compatibility during transition
    `);
};

exports.down = async (knex) => {
    // Remove the indexes we added
    await knex.raw('DROP INDEX IF EXISTS team_members_user_id_status_index');
    await knex.raw('DROP INDEX IF EXISTS team_members_team_id_user_id_status_index');
};
