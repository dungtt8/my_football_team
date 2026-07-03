const db = require('../config/database');

/**
 * Fetch users belonging to a team.
 *
 * IMPORTANT: `users` has no `team_id` or `role` column — those live on
 * `team_members`. Several notification handlers used to query
 * `db('users').where('team_id', ...)` / `.where('role', ...)` directly,
 * which throws "column does not exist" at runtime. Always go through
 * `team_members` to scope users to a team.
 *
 * @param {number|string} teamId
 * @param {object} [opts]
 * @param {string} [opts.role] - filter by team_members.role (e.g. 'co_manager')
 * @param {string} [opts.status='active'] - filter by team_members.status (pass null to skip)
 * @param {number|string} [opts.excludeUserId] - exclude this user id
 * @param {string[]} [opts.columns] - columns to select, prefixed with `u.` by default
 */
const getTeamUsers = async (teamId, opts = {}) => {
    const {
        role,
        status = 'active',
        excludeUserId,
        columns = ['u.id', 'u.zalo_user_id', 'u.full_name', 'u.email'],
    } = opts;

    let query = db('users as u')
        .join('team_members as tm', 'tm.user_id', 'u.id')
        .where('tm.team_id', teamId)
        .select(columns);

    if (status) query = query.where('tm.status', status);
    if (role) query = query.where('tm.role', role);
    if (excludeUserId) query = query.whereNot('u.id', excludeUserId);

    return query;
};

/**
 * Fetch a single user, scoped to a team (via team_members).
 * @param {number|string} userId
 * @param {number|string} teamId
 */
const getTeamUser = async (userId, teamId) => {
    return db('users as u')
        .join('team_members as tm', 'tm.user_id', 'u.id')
        .where('u.id', userId)
        .where('tm.team_id', teamId)
        .select('u.*')
        .first();
};

module.exports = { getTeamUsers, getTeamUser };
