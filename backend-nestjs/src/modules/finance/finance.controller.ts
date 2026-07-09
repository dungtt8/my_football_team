import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalService } from './approval.service';
import { FinanceClosingService } from './finance-closing.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentTeam } from '../../common/decorators/current-user.decorator';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../common/errors/business-errors';
import { bi, toNum } from '../../common/utils/helpers';
import logger from '../../common/utils/logger';

/**
 * Port of backend/src/handlers/financeHandler.js.
 * Routes mirror app.js exactly (auth + tenancy + rbac roles).
 */
@Controller('api')
export class FinanceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approval: ApprovalService,
    private readonly financeClosing: FinanceClosingService,
  ) {}

  @Post('finance/transactions')
  @Roles('member', 'co_manager', 'owner')
  async submitTransaction(
    @Body() body: any,
    @CurrentUser() user: any,
    @CurrentTeam() team: any,
  ) {
    const { amount, description, bill_image_url, transaction_date, transaction_type } =
      body;
    const userId = user.id;
    const teamId = team.id;

    if (!amount) throw new ValidationError('Amount is required');
    if (typeof amount !== 'number' || amount <= 0) {
      throw new ValidationError('Amount must be a positive number');
    }
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      throw new ValidationError('Description is required');
    }
    const resolvedType = transaction_type || 'expense';
    if (!['income', 'expense'].includes(resolvedType)) {
      throw new ValidationError('transaction_type must be income or expense');
    }

    logger.info('Submitting transaction for approval', {
      user_id: userId,
      team_id: teamId,
      amount,
      transaction_type: resolvedType,
      description: description.substring(0, 50),
    });

    const created = await this.prisma.fund_transactions.create({
      data: {
        team_id: bi(teamId),
        submitted_by: bi(userId),
        amount,
        description,
        transaction_type: resolvedType,
        status: 'pending',
        bill_image_url: bill_image_url || null,
        transaction_date: transaction_date ? new Date(transaction_date) : new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    const transaction = await this.prisma.fund_transactions.findUnique({
      where: { id: created.id },
    });

    await this.approval.submitForApproval(transaction, userId, 'transaction');

    logger.info('Transaction submitted successfully', {
      transaction_id: created.id,
      team_id: teamId,
      user_id: userId,
    });

    return { id: created.id, ...transaction };
  }

  @Get('finance/transactions')
  @Roles('member', 'co_manager', 'owner')
  async listTransactions(@Query() query: any, @CurrentTeam() team: any) {
    const { status } = query;
    const teamId = team.id;
    const parsedLimit = Math.min(parseInt(query.limit) || 10, 100);
    const parsedOffset = parseInt(query.offset) || 0;

    const where: any = { team_id: bi(teamId) };
    if (status) where.status = status;

    const total = await this.prisma.fund_transactions.count({ where });
    const transactions = await this.prisma.fund_transactions.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: parsedLimit,
      skip: parsedOffset,
    });

    return {
      data: transactions,
      pagination: { limit: parsedLimit, offset: parsedOffset, total },
    };
  }

  @Get('finance/transactions/:id')
  @Roles('member', 'co_manager', 'owner')
  async getTransaction(@Param('id') id: string, @CurrentTeam() team: any) {
    const teamId = team.id;
    const rows = await this.prisma.raw<any[]>(
      `SELECT ft.*, u.full_name AS submitted_by_name
       FROM fund_transactions ft
       LEFT JOIN users u ON u.id = ft.submitted_by
       WHERE ft.id = $1 AND ft.team_id = $2
       LIMIT 1`,
      bi(id),
      bi(teamId),
    );
    const transaction = rows[0];
    if (!transaction) throw new NotFoundError('Transaction', id);
    return transaction;
  }

  @Patch('finance/transactions/:id/approve')
  @Roles('co_manager', 'owner')
  async approveTransaction(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @CurrentTeam() team: any,
  ) {
    const { approval_notes } = body;
    const userId = user.id;
    const teamId = team.id;

    const transaction = await this.prisma.fund_transactions.findFirst({
      where: { id: bi(id), team_id: bi(teamId) },
    });
    if (!transaction) throw new NotFoundError('Transaction', id);
    if (transaction.status === 'approved') {
      throw new ConflictError('Transaction is already approved');
    }
    if (transaction.status === 'rejected') {
      throw new ConflictError('Cannot approve a rejected transaction');
    }

    await this.approval.approveEntity(id, 'transaction', userId, approval_notes);

    const updated = await this.prisma.fund_transactions.findUnique({
      where: { id: bi(id) },
    });
    logger.info('Transaction approved successfully', {
      transaction_id: id,
      team_id: teamId,
      approved_by: userId,
    });
    return updated;
  }

  @Patch('finance/transactions/:id/reject')
  @Roles('co_manager', 'owner')
  async rejectTransaction(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @CurrentTeam() team: any,
  ) {
    const { rejection_reason } = body;
    const userId = user.id;
    const teamId = team.id;

    if (
      !rejection_reason ||
      typeof rejection_reason !== 'string' ||
      rejection_reason.trim().length === 0
    ) {
      throw new ValidationError('Rejection reason is required');
    }

    const transaction = await this.prisma.fund_transactions.findFirst({
      where: { id: bi(id), team_id: bi(teamId) },
    });
    if (!transaction) throw new NotFoundError('Transaction', id);
    if (transaction.status === 'rejected') {
      throw new ConflictError('Transaction is already rejected');
    }
    if (transaction.status === 'approved') {
      throw new ConflictError('Cannot reject an approved transaction');
    }

    await this.approval.rejectEntity(id, 'transaction', userId, rejection_reason);

    const updated = await this.prisma.fund_transactions.findUnique({
      where: { id: bi(id) },
    });
    logger.info('Transaction rejected successfully', {
      transaction_id: id,
      team_id: teamId,
      rejected_by: userId,
    });
    return updated;
  }

  @Get('finance/approvals/pending')
  @Roles('co_manager', 'owner')
  async getPendingApprovals(@Query() query: any, @CurrentTeam() team: any) {
    const teamId = team.id;
    const parsedLimit = Math.min(parseInt(query.limit) || 20, 100);
    const parsedOffset = parseInt(query.offset) || 0;

    const total = await this.prisma.fund_transactions.count({
      where: { team_id: bi(teamId), status: 'pending' },
    });
    const transactions = await this.prisma.raw<any[]>(
      `SELECT ft.*, u.full_name AS submitted_by_name
       FROM fund_transactions ft
       LEFT JOIN users u ON u.id = ft.submitted_by
       WHERE ft.team_id = $1 AND ft.status = 'pending'
       ORDER BY ft.created_at DESC
       LIMIT $2 OFFSET $3`,
      bi(teamId),
      parsedLimit,
      parsedOffset,
    );

    return {
      data: transactions,
      pagination: { limit: parsedLimit, offset: parsedOffset, total },
    };
  }

  @Get('finance/balance')
  @Roles('member', 'co_manager', 'owner')
  async getBalance(@CurrentTeam() team: any) {
    const teamId = team.id;
    const rows = await this.prisma.raw<any[]>(
      `SELECT
         SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) AS total_income,
         SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) AS total_expense
       FROM fund_transactions
       WHERE team_id = $1 AND status = 'approved'`,
      bi(teamId),
    );
    const totalIncome = toNum(rows[0]?.total_income);
    const totalExpense = toNum(rows[0]?.total_expense);
    const balance = totalIncome - totalExpense;

    return {
      team_id: teamId,
      total_balance: balance,
      total_income: totalIncome,
      total_expense: totalExpense,
      currency: 'VND',
    };
  }

  @Get('team/finance/closing-period')
  @Roles('member', 'co_manager', 'owner')
  async getClosingPeriod(@CurrentUser() user: any) {
    const teamId = user.team_id;
    const paymentDeadline =
      await this.financeClosing.getActivePaymentDeadline(teamId);
    return {
      payment_deadline: paymentDeadline,
      is_active: paymentDeadline !== null,
    };
  }
}
