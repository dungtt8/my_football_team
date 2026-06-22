const db = require('../config/database');
const gamificationService = require('../services/gamificationService');
const notificationService = require('../services/notificationService');
const {
  handleError,
  ValidationError,
  NotFoundError,
  ConflictError
} = require('../services/errorService');
const logger = require('../utils/logger');

/**
 * Create a new attendance session
 * POST /api/attendance/sessions
 * Body: { session_date, location?, session_type?, description? }
 */
const createSession = async (req, res) => {
  try {
    const { session_date, location, session_type, description } = req.body;
    const userId = req.user.id;
    const teamId = req.team.id;

    // Validate input
    if (!session_date) {
      throw new ValidationError('Session date is required');
    }

    const sessionDate = new Date(session_date);
    if (isNaN(sessionDate.getTime())) {
      throw new ValidationError('Invalid session date format');
    }

    logger.info('Creating attendance session', {
      user_id: userId,
      team_id: teamId,
      session_date: sessionDate.toISOString(),
      session_type: session_type || 'training'
    });

    // Insert session
    const [sessionId] = await db('attendance_sessions').insert({
      team_id: teamId,
      created_by: userId,
      session_date: sessionDate,
      location: location || null,
      session_type: session_type || 'training',
      description: description || null,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Fetch created session
    const session = await db('attendance_sessions')
      .where('id', sessionId)
      .first();

    // Emit event
    await notificationService.emitEvent('attendance.session_created', {
      session_id: sessionId,
      team_id: teamId,
      session_date: session.session_date,
      session_type: session.session_type,
      created_by: userId
    });

    logger.info('Attendance session created successfully', {
      session_id: sessionId,
      team_id: teamId,
      user_id: userId
    });

    return res.status(201).json({
      id: sessionId,
      ...session
    });
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/api/attendance/sessions',
      method: 'POST'
    });
  }
};

/**
 * List attendance sessions with pagination and filtering
 * GET /api/attendance/sessions?page=1&limit=20&status=active
 */
const listSessions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const teamId = req.team.id;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    logger.info('Listing attendance sessions', {
      team_id: teamId,
      page: pageNum,
      limit: limitNum,
      status: status || 'all'
    });

    // Build query
    let query = db('attendance_sessions').where('team_id', teamId);

    if (status) {
      query = query.where('status', status);
    }

    // Get total count
    const [{ total }] = await db('attendance_sessions')
      .where('team_id', teamId)
      .modify((qb) => {
        if (status) qb.where('status', status);
      })
      .count('* as total');

    // Get paginated results
    const sessions = await query
      .orderBy('session_date', 'desc')
      .limit(limitNum)
      .offset(offset);

    logger.info('Sessions retrieved successfully', {
      team_id: teamId,
      count: sessions.length,
      total
    });

    return res.json({
      data: sessions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/api/attendance/sessions',
      method: 'GET'
    });
  }
};

/**
 * Get attendance session details with attendance records
 * GET /api/attendance/sessions/:id
 */
const getSession = async (req, res) => {
  try {
    const { id } = req.params;
    const teamId = req.team.id;

    logger.info('Fetching attendance session details', {
      session_id: id,
      team_id: teamId
    });

    // Get session
    const session = await db('attendance_sessions')
      .where('id', id)
      .where('team_id', teamId)
      .first();

    if (!session) {
      throw new NotFoundError('Attendance session not found');
    }

    // Get attendance records with user info
    const records = await db('attendance_records as ar')
      .select(
        'ar.id',
        'ar.user_id',
        'ar.status',
        'ar.checked_in_at',
        'ar.marked_by',
        'ar.created_at',
        'u.full_name',
        'u.email'
      )
      .leftJoin('users as u', 'ar.user_id', 'u.id')
      .where('ar.session_id', id)
      .orderBy('ar.checked_in_at', 'asc');

    logger.info('Session details retrieved successfully', {
      session_id: id,
      team_id: teamId,
      record_count: records.length
    });

    return res.json({
      session,
      records,
      total_records: records.length
    });
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/api/attendance/sessions/:id',
      method: 'GET'
    });
  }
};

/**
 * Member checks in to an attendance session
 * POST /api/attendance/sessions/:id/check-in
 */
const memberCheckIn = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const teamId = req.team.id;

    logger.info('Member checking in to session', {
      session_id: id,
      user_id: userId,
      team_id: teamId
    });

    // Verify session exists and is active
    const session = await db('attendance_sessions')
      .where('id', id)
      .where('team_id', teamId)
      .first();

    if (!session) {
      throw new NotFoundError('Attendance session not found');
    }

    if (session.status !== 'active') {
      throw new ValidationError('Session is not active');
    }

    // Check if already checked in
    const existingRecord = await db('attendance_records')
      .where('session_id', id)
      .where('user_id', userId)
      .first();

    if (existingRecord) {
      throw new ConflictError('User already checked in to this session');
    }

    // Insert attendance record
    const [recordId] = await db('attendance_records').insert({
      session_id: id,
      user_id: userId,
      status: 'attended',
      checked_in_at: new Date(),
      created_at: new Date()
    });

    // Add gamification points (+10 for check-in)
    await gamificationService.addPoints(userId, 10, 'check_in', teamId);

    // Emit event
    await notificationService.emitEvent('attendance.check_in', {
      session_id: id,
      user_id: userId,
      team_id: teamId,
      checked_in_at: new Date()
    });

    logger.info('Check-in successful', {
      session_id: id,
      user_id: userId,
      team_id: teamId,
      record_id: recordId
    });

    return res.status(201).json({
      id: recordId,
      session_id: id,
      user_id: userId,
      status: 'attended',
      checked_in_at: new Date(),
      points_awarded: 10
    });
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/api/attendance/sessions/:id/check-in',
      method: 'POST'
    });
  }
};

/**
 * Co-manager marks a member as absent
 * POST /api/attendance/sessions/:id/mark-absent
 * Body: { user_id }
 */
const coManagerMarkAbsent = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    const markerId = req.user.id;
    const teamId = req.team.id;

    if (!user_id) {
      throw new ValidationError('User ID is required');
    }

    logger.info('Co-manager marking member as absent', {
      session_id: id,
      user_id,
      marked_by: markerId,
      team_id: teamId
    });

    // Verify session exists and is active
    const session = await db('attendance_sessions')
      .where('id', id)
      .where('team_id', teamId)
      .first();

    if (!session) {
      throw new NotFoundError('Attendance session not found');
    }

    if (session.status !== 'active') {
      throw new ValidationError('Session is not active');
    }

    // Check if record already exists
    const existingRecord = await db('attendance_records')
      .where('session_id', id)
      .where('user_id', user_id)
      .first();

    if (existingRecord) {
      throw new ConflictError('Attendance record already exists for this user in this session');
    }

    // Insert attendance record with marked_absent status
    const [recordId] = await db('attendance_records').insert({
      session_id: id,
      user_id,
      status: 'marked_absent',
      marked_by: markerId,
      created_at: new Date()
    });

    // Add penalty points (-5 for absence)
    await gamificationService.addPoints(user_id, -5, 'absence_penalty', teamId);

    logger.info('Member marked absent successfully', {
      session_id: id,
      user_id,
      team_id: teamId,
      record_id: recordId
    });

    return res.status(201).json({
      id: recordId,
      session_id: id,
      user_id,
      status: 'marked_absent',
      marked_by: markerId,
      points_deducted: 5
    });
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/api/attendance/sessions/:id/mark-absent',
      method: 'POST'
    });
  }
};

/**
 * Close an attendance session
 * POST /api/attendance/sessions/:id/close
 */
const closeSession = async (req, res) => {
  try {
    const { id } = req.params;
    const teamId = req.team.id;

    logger.info('Closing attendance session', {
      session_id: id,
      team_id: teamId
    });

    // Verify session exists and is active
    const session = await db('attendance_sessions')
      .where('id', id)
      .where('team_id', teamId)
      .first();

    if (!session) {
      throw new NotFoundError('Attendance session not found');
    }

    if (session.status !== 'active') {
      throw new ValidationError('Session is already closed');
    }

    // Update session status
    const closedAt = new Date();
    await db('attendance_sessions')
      .where('id', id)
      .update({
        status: 'closed',
        closed_at: closedAt,
        updated_at: closedAt
      });

    // Emit event
    await notificationService.emitEvent('attendance.session_closed', {
      session_id: id,
      team_id: teamId,
      closed_at: closedAt
    });

    logger.info('Session closed successfully', {
      session_id: id,
      team_id: teamId,
      closed_at: closedAt.toISOString()
    });

    return res.json({
      id,
      status: 'closed',
      closed_at: closedAt
    });
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/api/attendance/sessions/:id/close',
      method: 'POST'
    });
  }
};

/**
 * Get current month attendance leaderboard
 * GET /api/attendance/leaderboard
 */
const getLeaderboard = async (req, res) => {
  try {
    const teamId = req.team.id;
    const currentMonth = gamificationService.getCurrentMonth();

    logger.info('Fetching current month leaderboard', {
      team_id: teamId,
      month: currentMonth
    });

    const leaderboard = await gamificationService.getLeaderboard(teamId, currentMonth);

    logger.info('Leaderboard retrieved successfully', {
      team_id: teamId,
      month: currentMonth,
      count: leaderboard.length
    });

    return res.json({
      month: currentMonth,
      leaderboard
    });
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/api/attendance/leaderboard',
      method: 'GET'
    });
  }
};

/**
 * Get historical leaderboard for a specific month
 * GET /api/attendance/leaderboard/:month (format: YYYY-MM)
 */
const getHistoricalLeaderboard = async (req, res) => {
  try {
    const { month } = req.params;
    const teamId = req.team.id;

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new ValidationError('Month must be in YYYY-MM format');
    }

    logger.info('Fetching historical leaderboard', {
      team_id: teamId,
      month
    });

    const leaderboard = await gamificationService.getLeaderboard(teamId, month);

    logger.info('Historical leaderboard retrieved successfully', {
      team_id: teamId,
      month,
      count: leaderboard.length
    });

    return res.json({
      month,
      leaderboard
    });
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/api/attendance/leaderboard/:month',
      method: 'GET'
    });
  }
};

/**
 * Get user attendance statistics for a specific month
 * GET /api/attendance/stats/:userId?month=YYYY-MM
 */
const getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const { month } = req.query;
    const teamId = req.team.id;

    const targetMonth = month || gamificationService.getCurrentMonth();

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
      throw new ValidationError('Month must be in YYYY-MM format');
    }

    logger.info('Fetching user statistics', {
      user_id: userId,
      team_id: teamId,
      month: targetMonth
    });

    const stats = await gamificationService.getUserStats(userId, teamId, targetMonth);

    logger.info('User statistics retrieved successfully', {
      user_id: userId,
      team_id: teamId,
      month: targetMonth,
      total_points: stats.total_points,
      rank: stats.rank
    });

    return res.json(stats);
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/api/attendance/stats/:userId',
      method: 'GET'
    });
  }
};

/**
 * Get current user's attendance history for current month
 * GET /api/attendance/history?month=YYYY-MM
 */
const getAttendanceHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = req.team.id;
    const { month } = req.query;

    const targetMonth = month || gamificationService.getCurrentMonth();

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
      throw new ValidationError('Month must be in YYYY-MM format');
    }

    logger.info('Fetching user attendance history', {
      user_id: userId,
      team_id: teamId,
      month: targetMonth
    });

    // Get attendance records for current month
    const history = await db('attendance_records as ar')
      .select(
        'ar.id',
        'ar.session_id',
        'ar.status',
        'ar.checked_in_at',
        'as.session_date',
        'as.location',
        'as.session_type'
      )
      .leftJoin('attendance_sessions as as', 'ar.session_id', 'as.id')
      .where('ar.user_id', userId)
      .where('as.team_id', teamId)
      .whereRaw("TO_CHAR(as.session_date, 'YYYY-MM') = ?", [targetMonth])
      .orderBy('as.session_date', 'desc');

    logger.info('Attendance history retrieved successfully', {
      user_id: userId,
      team_id: teamId,
      month: targetMonth,
      count: history.length
    });

    return res.json({
      user_id: userId,
      month: targetMonth,
      history
    });
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/api/attendance/history',
      method: 'GET'
    });
  }
};

module.exports = {
  createSession,
  listSessions,
  getSession,
  memberCheckIn,
  coManagerMarkAbsent,
  closeSession,
  getLeaderboard,
  getHistoricalLeaderboard,
  getUserStats,
  getAttendanceHistory
};
