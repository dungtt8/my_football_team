const db = require('../config/database');
const approvalService = require('../services/approvalService');
const notificationService = require('../services/notificationService');
const {
  handleError,
  ValidationError,
  NotFoundError,
  ConflictError
} = require('../services/errorService');
const logger = require('../utils/logger');

/**
 * Submit a new transaction for approval
 * POST /finance/transactions
 * Body: { amount, description, campaign_id?, bill_image_url?, transaction_date? }
 */
const submitTransaction = async (req, res) => {
  try {
    const { amount, description, bill_image_url, transaction_date, transaction_type } = req.body;
    const userId = req.user.id;
    const teamId = req.team.id;

    // Validate input
    if (!amount) {
      throw new ValidationError('Amount is required');
    }
    if (typeof amount !== 'number' || amount <= 0) {
      throw new ValidationError('Amount must be a positive number');
    }
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      throw new ValidationError('Description is required');
    }
    const validTypes = ['income', 'expense'];
    const resolvedType = transaction_type || 'expense';
    if (!validTypes.includes(resolvedType)) {
      throw new ValidationError('transaction_type must be income or expense');
    }

    logger.info('Submitting transaction for approval', {
      user_id: userId,
      team_id: teamId,
      amount,
      transaction_type: resolvedType,
      description: description.substring(0, 50)
    });

    // Insert transaction with pending status
    const [transaction] = await db('fund_transactions').insert({
      team_id: teamId,
      submitted_by: userId,
      amount,
      description,
      transaction_type: resolvedType,
      status: 'pending',
      bill_image_url: bill_image_url || null,
      transaction_date: transaction_date ? new Date(transaction_date) : new Date(),
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');
    const transactionId = transaction.id;

    // Submit for approval
    await approvalService.submitForApproval(transaction, userId, 'transaction');

    logger.info('Transaction submitted successfully', {
      transaction_id: transactionId,
      team_id: teamId,
      user_id: userId
    });

    return res.status(201).json({
      id: transactionId,
      ...transaction
    });
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/finance/transactions',
      method: 'POST'
    });
  }
};

/**
 * List transactions with optional filters and pagination
 * GET /finance/transactions?status=pending&limit=10&offset=0
 */
const listTransactions = async (req, res) => {
  try {
    const { status, limit = 10, offset = 0 } = req.query;
    const teamId = req.team.id;

    const parsedLimit = Math.min(parseInt(limit) || 10, 100);
    const parsedOffset = parseInt(offset) || 0;

    logger.info('Fetching transactions', {
      team_id: teamId,
      status,
      limit: parsedLimit,
      offset: parsedOffset
    });

    let query = db('fund_transactions').where('team_id', teamId);

    if (status) {
      query = query.where('status', status);
    }

    const total = await query.clone().count('* as count').first();
    const transactions = await query
      .orderBy('created_at', 'desc')
      .limit(parsedLimit)
      .offset(parsedOffset);

    return res.json({
      data: transactions,
      pagination: {
        limit: parsedLimit,
        offset: parsedOffset,
        total: total.count
      }
    });
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/finance/transactions',
      method: 'GET'
    });
  }
};

/**
 * Get a single transaction
 * GET /finance/transactions/:id
 */
const getTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const teamId = req.team.id;

    logger.info('Fetching transaction', {
      transaction_id: id,
      team_id: teamId
    });

    const transaction = await db('fund_transactions as ft')
      .leftJoin('users as u', 'u.id', 'ft.submitted_by')
      .where('ft.id', id)
      .where('ft.team_id', teamId)
      .select('ft.*', 'u.full_name as submitted_by_name')
      .first();

    if (!transaction) {
      throw new NotFoundError('Transaction', id);
    }

    return res.json(transaction);
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/finance/transactions/:id',
      method: 'GET'
    });
  }
};

/**
 * Approve a transaction
 * PATCH /finance/transactions/:id/approve
 * Body: { approval_notes? }
 */
const approveTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { approval_notes } = req.body;
    const userId = req.user.id;
    const teamId = req.team.id;

    logger.info('Approving transaction', {
      transaction_id: id,
      user_id: userId,
      team_id: teamId
    });

    // Fetch transaction
    const transaction = await db('fund_transactions')
      .where('id', id)
      .where('team_id', teamId)
      .first();

    if (!transaction) {
      throw new NotFoundError('Transaction', id);
    }

    // Check if already approved
    if (transaction.status === 'approved') {
      throw new ConflictError('Transaction is already approved');
    }

    // Check if rejected
    if (transaction.status === 'rejected') {
      throw new ConflictError('Cannot approve a rejected transaction');
    }

    // Approve using ApprovalService
    await approvalService.approveEntity(id, 'transaction', userId, approval_notes);

    // Fetch updated transaction
    const updatedTransaction = await db('fund_transactions')
      .where('id', id)
      .first();

    logger.info('Transaction approved successfully', {
      transaction_id: id,
      team_id: teamId,
      approved_by: userId
    });

    return res.json(updatedTransaction);
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/finance/transactions/:id/approve',
      method: 'PATCH'
    });
  }
};

/**
 * Reject a transaction
 * PATCH /finance/transactions/:id/reject
 * Body: { rejection_reason }
 */
const rejectTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    const userId = req.user.id;
    const teamId = req.team.id;

    // Validate rejection reason
    if (!rejection_reason || typeof rejection_reason !== 'string' || rejection_reason.trim().length === 0) {
      throw new ValidationError('Rejection reason is required');
    }

    logger.info('Rejecting transaction', {
      transaction_id: id,
      user_id: userId,
      team_id: teamId
    });

    // Fetch transaction
    const transaction = await db('fund_transactions')
      .where('id', id)
      .where('team_id', teamId)
      .first();

    if (!transaction) {
      throw new NotFoundError('Transaction', id);
    }

    // Check if already rejected
    if (transaction.status === 'rejected') {
      throw new ConflictError('Transaction is already rejected');
    }

    // Check if already approved
    if (transaction.status === 'approved') {
      throw new ConflictError('Cannot reject an approved transaction');
    }

    // Reject using ApprovalService
    await approvalService.rejectEntity(id, 'transaction', userId, rejection_reason);

    // Fetch updated transaction
    const updatedTransaction = await db('fund_transactions')
      .where('id', id)
      .first();

    logger.info('Transaction rejected successfully', {
      transaction_id: id,
      team_id: teamId,
      rejected_by: userId
    });

    return res.json(updatedTransaction);
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/finance/transactions/:id/reject',
      method: 'PATCH'
    });
  }
};

/**
 * Get pending approvals for the team
 * GET /finance/pending-approvals
 */
const getPendingApprovals = async (req, res) => {
  try {
    const teamId = req.team.id;
    const { limit = 20, offset = 0 } = req.query;

    const parsedLimit = Math.min(parseInt(limit) || 20, 100);
    const parsedOffset = parseInt(offset) || 0;

    logger.info('Fetching pending approvals', {
      team_id: teamId,
      limit: parsedLimit,
      offset: parsedOffset
    });

    // NOTE: previously this queried the generic `approvals` table, but nothing
    // in the codebase ever inserts a row there (approvalService.submitForApproval
    // only updates fund_transactions.status) — so it always returned an empty
    // list. Query fund_transactions directly instead, which is the actual
    // source of truth for transaction status.
    const baseQuery = () => db('fund_transactions as ft')
      .leftJoin('users as u', 'u.id', 'ft.submitted_by')
      .where('ft.team_id', teamId)
      .where('ft.status', 'pending');

    const total = await baseQuery().count('ft.id as count').first();
    const transactions = await baseQuery()
      .select('ft.*', 'u.full_name as submitted_by_name')
      .orderBy('ft.created_at', 'desc')
      .limit(parsedLimit)
      .offset(parsedOffset);

    return res.json({
      data: transactions,
      pagination: {
        limit: parsedLimit,
        offset: parsedOffset,
        total: total.count
      }
    });
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/finance/pending-approvals',
      method: 'GET'
    });
  }
};

/**
 * Get team's fund balance (all-time) plus current-month income/expense.
 * GET /finance/balance
 */
const getBalance = async (req, res) => {
  try {
    const teamId = req.team.id;

    logger.info('Fetching fund balance', {
      team_id: teamId
    });

    // All-time balance = SUM(income) - SUM(expense) từ các transaction đã approved
    const allTime = await db('fund_transactions')
      .where('team_id', teamId)
      .where('status', 'approved')
      .select(
        db.raw(`SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as total_income`),
        db.raw(`SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as total_expense`)
      )
      .first();

    // "Thu/Chi tháng này" cards are scoped to the current calendar month only,
    // separate from the all-time balance above.
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const thisMonth = await db('fund_transactions')
      .where('team_id', teamId)
      .where('status', 'approved')
      .where('transaction_date', '>=', monthStart)
      .where('transaction_date', '<', monthEnd)
      .select(
        db.raw(`SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as total_income`),
        db.raw(`SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as total_expense`)
      )
      .first();

    const allTimeIncome = parseFloat(allTime.total_income) || 0;
    const allTimeExpense = parseFloat(allTime.total_expense) || 0;
    const balance = allTimeIncome - allTimeExpense;

    return res.json({
      team_id: teamId,
      total_balance: balance,
      total_income: parseFloat(thisMonth.total_income) || 0,
      total_expense: parseFloat(thisMonth.total_expense) || 0,
      currency: 'VND'
    });
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/finance/balance',
      method: 'GET'
    });
  }
};

/**
 * Monthly income/expense breakdown for the last N months (for the finance
 * dashboard chart), oldest first. Months with no approved transactions are
 * filled in with zeros so the chart always shows a full, evenly-spaced range.
 * GET /finance/monthly-summary?months=6
 */
const getMonthlySummary = async (req, res) => {
  try {
    const teamId = req.team.id;
    const months = Math.min(24, Math.max(1, parseInt(req.query.months, 10) || 6));

    const now = new Date();
    const rangeStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    const rows = await db('fund_transactions')
      .where('team_id', teamId)
      .where('status', 'approved')
      .where('transaction_date', '>=', rangeStart)
      .select(
        db.raw(`TO_CHAR(transaction_date, 'YYYY-MM') as month`),
        db.raw(`SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as income`),
        db.raw(`SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as expense`)
      )
      .groupBy('month');

    const byMonth = new Map(rows.map(r => [r.month, r]));

    const summary = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const row = byMonth.get(key);
      summary.push({
        month: key,
        income: parseFloat(row?.income) || 0,
        expense: parseFloat(row?.expense) || 0,
      });
    }

    return res.json({ team_id: teamId, months: summary });
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/finance/monthly-summary',
      method: 'GET'
    });
  }
};

/**
 * GET /api/team/finance/closing-period  (auth + tenancy, all members)
 * Get active payment deadline if exists (monthly recurring)
 */
const getClosingPeriod = async (req, res) => {
  try {
    const teamId = req.user.team_id;
    const financeClosingService = require('../services/financeClosingService');

    const paymentDeadline = await financeClosingService.getActivePaymentDeadline(teamId);

    return res.json({
      payment_deadline: paymentDeadline,
      is_active: paymentDeadline !== null
    });
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: 'GET /api/team/finance/closing-period'
    });
  }
};

module.exports = {
  submitTransaction,
  listTransactions,
  getTransaction,
  approveTransaction,
  rejectTransaction,
  getPendingApprovals,
  getBalance,
  getMonthlySummary,
  getClosingPeriod
};
