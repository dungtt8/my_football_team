const db = require('../../config/database');
const inngest = require('../../config/inngest');
const notificationService = require('../../services/notificationService');
const logger = require('../../utils/logger');

// ============================================================================
// onApprovalPending Handler
// Triggered when: approval.pending event is emitted
// Action: Fetch co-managers and notify them of pending transaction approval
// ============================================================================
const onApprovalPendingLogic = async ({ event, step }) => {
  const { approval_id, team_id, entity_type, entity_id, submitted_by, amount } = event.data;

  logger.info('Processing approval.pending event', {
    approval_id,
    team_id,
    entity_type,
    entity_id,
    submitted_by
  });

  // Only process transaction approvals, ignore campaign_confirmation
  if (entity_type !== 'transaction') {
    logger.info('Skipping non-transaction approval', {
      approval_id,
      entity_type
    });
    return { status: 'skipped', reason: 'not_transaction' };
  }

  // Step 1: Fetch transaction details
  const transaction = await step.run('fetch-transaction', async () => {
    return db('fund_transactions')
      .where('id', entity_id)
      .where('team_id', team_id)
      .first();
  });

  if (!transaction) {
    logger.warn('Transaction not found', { transaction_id: entity_id, team_id });
    throw new Error(`Transaction ${entity_id} not found`);
  }

  // Step 2: Fetch submitter user info
  const submitter = await step.run('fetch-submitter', async () => {
    return db('users')
      .where('id', submitted_by)
      .first();
  });

  if (!submitter) {
    logger.warn('Submitter not found', { user_id: submitted_by });
    throw new Error(`Submitter ${submitted_by} not found`);
  }

  // Step 3: Fetch all co-managers for the team
  const coManagers = await step.run('fetch-co-managers', async () => {
    return db('users')
      .where('team_id', team_id)
      .where('role', 'co_manager')
      .where('status', 'active')
      .select('id', 'zalo_user_id', 'full_name');
  });

  logger.info('Found co-managers for notification', {
    team_id,
    count: coManagers.length
  });

  // Step 4: Send Zalo notifications to each co-manager
  let notificationsSent = 0;
  let notificationsFailed = 0;

  for (const coManager of coManagers) {
    await step.run(`send-notification-to-${coManager.id}`, async () => {
      try {
        await notificationService.sendZaloMessage(
          coManager.zalo_user_id,
          'TRANSACTION_PENDING_APPROVAL',
          {
            submitter_name: submitter.full_name,
            amount: transaction.amount.toString(),
            transaction_id: transaction.id.toString()
          }
        );
        notificationsSent++;
        logger.info('Notification sent to co-manager', {
          co_manager_id: coManager.id,
          team_id
        });
      } catch (error) {
        notificationsFailed++;
        logger.error('Failed to send notification to co-manager', {
          co_manager_id: coManager.id,
          team_id,
          error: error.message
        });
        // Continue with next co-manager on error
      }
    });
  }

  // Step 5: Log the action
  await step.run('log-action', async () => {
    logger.info('Approval pending notifications completed', {
      approval_id,
      team_id,
      entity_type,
      transaction_id: entity_id,
      submitter_id: submitted_by,
      notificationsSent,
      notificationsFailed
    });
  });

  return {
    status: 'completed',
    approval_id,
    notificationsSent,
    notificationsFailed
  };
};

const onApprovalPendingHandler = inngest.createFunction(
  {
    id: 'finance.approval-pending',
    retryOptions: { maxRetries: 3, initialDelayMs: 5000 }
  },
  { event: 'approval.pending' },
  onApprovalPendingLogic
);

// ============================================================================
// onApprovalApproved Handler
// Triggered when: approval.approved event is emitted
// Action: Update fund_balance_logs, notify submitter and all team members
// ============================================================================
const onApprovalApprovedLogic = async ({ event, step }) => {
  const { approval_id, team_id, entity_type, entity_id, submitted_by, approved_by } = event.data;

  logger.info('Processing approval.approved event', {
    approval_id,
    team_id,
    entity_type,
    entity_id,
    submitted_by,
    approved_by
  });

  // Only process transaction approvals, ignore campaign_confirmation
  if (entity_type !== 'transaction') {
    logger.info('Skipping non-transaction approval', {
      approval_id,
      entity_type
    });
    return { status: 'skipped', reason: 'not_transaction' };
  }

  // Step 1: Fetch transaction details
  const transaction = await step.run('fetch-transaction', async () => {
    return db('fund_transactions')
      .where('id', entity_id)
      .where('team_id', team_id)
      .first();
  });

  if (!transaction) {
    logger.warn('Transaction not found', { transaction_id: entity_id, team_id });
    throw new Error(`Transaction ${entity_id} not found`);
  }

  // Step 2: Fetch submitter and approver info
  const submitter = await step.run('fetch-submitter', async () => {
    return db('users')
      .where('id', submitted_by)
      .first();
  });

  const approver = await step.run('fetch-approver', async () => {
    return db('users')
      .where('id', approved_by)
      .first();
  });

  if (!submitter) {
    throw new Error(`Submitter ${submitted_by} not found`);
  }

  if (!approver) {
    throw new Error(`Approver ${approved_by} not found`);
  }

  // Step 3: Calculate previous and new balance
  const balances = await step.run('calculate-balances', async () => {
    const previousBalance = await db('fund_transactions')
      .where('team_id', team_id)
      .where('status', 'approved')
      .sum({ total: 'amount' })
      .first();

    const newBalance = (previousBalance.total || 0) + transaction.amount;

    return {
      previousBalance: previousBalance.total || 0,
      newBalance,
      changeAmount: transaction.amount
    };
  });

  // Step 4: Insert fund_balance_logs entry
  const logId = await step.run('insert-balance-log', async () => {
    const [id] = await db('fund_balance_logs').insert({
      team_id,
      transaction_id: entity_id,
      previous_balance: balances.previousBalance,
      new_balance: balances.newBalance,
      change_amount: balances.changeAmount,
      description: `Transaction #${entity_id} approved by ${approver.full_name}`,
      created_at: new Date()
    });
    return id;
  });

  logger.info('Fund balance log created', {
    log_id: logId,
    team_id,
    previous_balance: balances.previousBalance,
    new_balance: balances.newBalance
  });

  // Step 5: Send Zalo notification to submitter
  await step.run('notify-submitter', async () => {
    try {
      await notificationService.sendZaloMessage(
        submitter.zalo_user_id,
        'TRANSACTION_APPROVED',
        {
          amount: transaction.amount.toString(),
          transaction_id: transaction.id.toString(),
          approved_by: approver.full_name
        }
      );
      logger.info('Submitter notified of approval', {
        submitter_id: submitter.id,
        team_id
      });
    } catch (error) {
      logger.error('Failed to notify submitter', {
        submitter_id: submitter.id,
        error: error.message
      });
      // Continue even if notification fails
    }
  });

  // Step 6: Fetch all team members (except submitter)
  const teamMembers = await step.run('fetch-team-members', async () => {
    return db('users')
      .where('team_id', team_id)
      .where('status', 'active')
      .whereNot('id', submitted_by)
      .select('id', 'zalo_user_id', 'full_name');
  });

  // Step 7: Send FUND_UPDATED notification to all team members
  let fundUpdateNotificationsSent = 0;
  let fundUpdateNotificationsFailed = 0;

  for (const member of teamMembers) {
    await step.run(`send-fund-update-to-${member.id}`, async () => {
      try {
        await notificationService.sendZaloMessage(
          member.zalo_user_id,
          'FUND_UPDATED',
          {
            new_balance: balances.newBalance.toString(),
            change_amount: balances.changeAmount.toString(),
            transaction_id: transaction.id.toString()
          }
        );
        fundUpdateNotificationsSent++;
        logger.info('Fund update notification sent', {
          member_id: member.id,
          team_id
        });
      } catch (error) {
        fundUpdateNotificationsFailed++;
        logger.error('Failed to send fund update notification', {
          member_id: member.id,
          error: error.message
        });
        // Continue with next member on error
      }
    });
  }

  // Step 8: Log the action
  await step.run('log-action', async () => {
    logger.info('Approval accepted - notifications completed', {
      approval_id,
      team_id,
      entity_type,
      transaction_id: entity_id,
      log_id: logId,
      submitterNotified: true,
      fundUpdateNotificationsSent,
      fundUpdateNotificationsFailed
    });
  });

  return {
    status: 'completed',
    approval_id,
    log_id: logId,
    fundUpdateNotificationsSent,
    fundUpdateNotificationsFailed
  };
};

const onApprovalApprovedHandler = inngest.createFunction(
  {
    id: 'finance.approval-approved',
    retryOptions: { maxRetries: 3, initialDelayMs: 5000 }
  },
  { event: 'approval.approved' },
  onApprovalApprovedLogic
);

// ============================================================================
// onApprovalRejected Handler
// Triggered when: approval.rejected event is emitted
// Action: Notify submitter with rejection reason
// ============================================================================
const onApprovalRejectedLogic = async ({ event, step }) => {
  const { approval_id, team_id, entity_type, entity_id, submitted_by, rejected_by, rejection_reason } = event.data;

  logger.info('Processing approval.rejected event', {
    approval_id,
    team_id,
    entity_type,
    entity_id,
    submitted_by,
    rejected_by
  });

  // Only process transaction rejections, ignore campaign_confirmation
  if (entity_type !== 'transaction') {
    logger.info('Skipping non-transaction rejection', {
      approval_id,
      entity_type
    });
    return { status: 'skipped', reason: 'not_transaction' };
  }

  // Step 1: Fetch transaction details
  const transaction = await step.run('fetch-transaction', async () => {
    return db('fund_transactions')
      .where('id', entity_id)
      .where('team_id', team_id)
      .first();
  });

  if (!transaction) {
    logger.warn('Transaction not found', { transaction_id: entity_id, team_id });
    throw new Error(`Transaction ${entity_id} not found`);
  }

  // Step 2: Fetch submitter user info
  const submitter = await step.run('fetch-submitter', async () => {
    return db('users')
      .where('id', submitted_by)
      .first();
  });

  if (!submitter) {
    logger.warn('Submitter not found', { user_id: submitted_by });
    throw new Error(`Submitter ${submitted_by} not found`);
  }

  // Step 3: Fetch rejector user info
  const rejector = await step.run('fetch-rejector', async () => {
    return db('users')
      .where('id', rejected_by)
      .first();
  });

  if (!rejector) {
    logger.warn('Rejector not found', { user_id: rejected_by });
    throw new Error(`Rejector ${rejected_by} not found`);
  }

  // Step 4: Send Zalo notification to submitter with rejection reason
  await step.run('notify-submitter', async () => {
    try {
      await notificationService.sendZaloMessage(
        submitter.zalo_user_id,
        'TRANSACTION_REJECTED',
        {
          amount: transaction.amount.toString(),
          transaction_id: transaction.id.toString(),
          rejected_by: rejector.full_name,
          reason: rejection_reason || 'No reason provided'
        }
      );
      logger.info('Submitter notified of rejection', {
        submitter_id: submitter.id,
        team_id,
        transaction_id: entity_id
      });
    } catch (error) {
      logger.error('Failed to notify submitter of rejection', {
        submitter_id: submitter.id,
        error: error.message
      });
      // Continue even if notification fails
    }
  });

  // Step 5: Log the action
  await step.run('log-action', async () => {
    logger.info('Approval rejection - notification completed', {
      approval_id,
      team_id,
      entity_type,
      transaction_id: entity_id,
      submitted_by,
      rejected_by,
      rejection_reason
    });
  });

  return {
    status: 'completed',
    approval_id,
    submitterNotified: true
  };
};

const onApprovalRejectedHandler = inngest.createFunction(
  {
    id: 'finance.approval-rejected',
    retryOptions: { maxRetries: 3, initialDelayMs: 5000 }
  },
  { event: 'approval.rejected' },
  onApprovalRejectedLogic
);

// Export handlers and logic for testing
module.exports = {
  onApprovalPendingHandler,
  onApprovalApprovedHandler,
  onApprovalRejectedHandler,
  logic: {
    onApprovalPending: onApprovalPendingLogic,
    onApprovalApproved: onApprovalApprovedLogic,
    onApprovalRejected: onApprovalRejectedLogic
  }
};
