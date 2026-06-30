const db = require('../../config/database');
const inngest = require('../../config/inngest');
const notificationService = require('../../services/notificationService');
const logger = require('../../utils/logger');

// ============================================================================
// onCampaignCreated Handler
// Triggered when: campaign.created event is emitted
// Action: Notify all team members of new campaign
// ============================================================================
const onCampaignCreatedLogic = async ({ event, step }) => {
  const { campaign_id, team_id, campaign_name, amount_per_member, deadline, created_by } = event.data;

  logger.info('Processing campaign.created event', {
    campaign_id,
    team_id,
    campaign_name,
    amount_per_member,
    created_by
  });

  // Step 1: Fetch campaign details
  const campaign = await step.run('fetch-campaign', async () => {
    return db('campaigns')
      .where('id', campaign_id)
      .where('team_id', team_id)
      .first();
  });

  if (!campaign) {
    logger.warn('Campaign not found', { campaign_id, team_id });
    throw new Error(`Campaign ${campaign_id} not found`);
  }

  // Step 2: Fetch creator user info
  const creator = await step.run('fetch-creator', async () => {
    return db('users')
      .where('id', created_by)
      .first();
  });

  if (!creator) {
    logger.warn('Creator not found', { user_id: created_by });
    throw new Error(`Creator ${created_by} not found`);
  }

  // Step 3: Fetch all active team members
  const teamMembers = await step.run('fetch-team-members', async () => {
    return db('users')
      .where('team_id', team_id)
      .where('status', 'active')
      .select('id', 'zalo_user_id', 'full_name');
  });

  logger.info('Found team members for notification', {
    team_id,
    count: teamMembers.length
  });

  // Step 4: Send Zalo notifications to each team member
  let notificationsSent = 0;
  let notificationsFailed = 0;

  for (const member of teamMembers) {
    await step.run(`send-notification-to-${member.id}`, async () => {
      try {
        await notificationService.sendZaloMessage(
          member.zalo_user_id,
          'CAMPAIGN_CREATED',
          {
            campaign_name: campaign.name,
            amount_per_member: campaign.amount_per_member.toString(),
            deadline: deadline ? new Date(deadline).toLocaleDateString('vi-VN') : 'No deadline',
            created_by: creator.full_name
          }
        );
        notificationsSent++;
        logger.info('Notification sent to team member', {
          member_id: member.id,
          team_id
        });
      } catch (error) {
        notificationsFailed++;
        logger.error('Failed to send notification to team member', {
          member_id: member.id,
          team_id,
          error: error.message
        });
        // Continue with next member on error
      }
    });
  }

  // Step 5: Log the action
  await step.run('log-action', async () => {
    logger.info('Campaign creation notifications completed', {
      campaign_id,
      team_id,
      campaign_name,
      created_by,
      notificationsSent,
      notificationsFailed
    });
  });

  return {
    status: 'completed',
    campaign_id,
    notificationsSent,
    notificationsFailed
  };
};

const onCampaignCreatedHandler = inngest.createFunction(
  {
    id: 'campaign.created',
    retryOptions: { maxRetries: 3, initialDelayMs: 5000 }
  },
  { event: 'campaign.created' },
  onCampaignCreatedLogic
);

// ============================================================================
// onCampaignMemberConfirmed Handler
// Triggered when: campaign.member_confirmed event is emitted
// Action: Notify co-managers that member confirmed
// ============================================================================
const onCampaignMemberConfirmedLogic = async ({ event, step }) => {
  const { campaign_id, team_id, user_id, member_name, campaign_name } = event.data;

  logger.info('Processing campaign.member_confirmed event', {
    campaign_id,
    team_id,
    user_id,
    member_name,
    campaign_name
  });

  // Step 1: Fetch campaign details
  const campaign = await step.run('fetch-campaign', async () => {
    return db('campaigns')
      .where('id', campaign_id)
      .where('team_id', team_id)
      .first();
  });

  if (!campaign) {
    logger.warn('Campaign not found', { campaign_id, team_id });
    throw new Error(`Campaign ${campaign_id} not found`);
  }

  // Step 2: Fetch all co-managers for the team
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

  // Step 3: Send Zalo notifications to each co-manager
  let notificationsSent = 0;
  let notificationsFailed = 0;

  for (const coManager of coManagers) {
    await step.run(`send-notification-to-${coManager.id}`, async () => {
      try {
        await notificationService.sendZaloMessage(
          coManager.zalo_user_id,
          'MEMBER_CONFIRMED_CAMPAIGN',
          {
            member_name,
            campaign_name: campaign.name
          }
        );
        notificationsSent++;
        logger.info('Notification sent to co-manager', {
          co_manager_id: coManager.id,
          team_id,
          member_id: user_id
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

  // Step 4: Log the action
  await step.run('log-action', async () => {
    logger.info('Campaign member confirmation notifications completed', {
      campaign_id,
      team_id,
      user_id,
      member_name,
      notificationsSent,
      notificationsFailed
    });
  });

  return {
    status: 'completed',
    campaign_id,
    user_id,
    notificationsSent,
    notificationsFailed
  };
};

const onCampaignMemberConfirmedHandler = inngest.createFunction(
  {
    id: 'campaign.member-confirmed',
    retryOptions: { maxRetries: 3, initialDelayMs: 5000 }
  },
  { event: 'campaign.member_confirmed' },
  onCampaignMemberConfirmedLogic
);

// ============================================================================
// onCampaignCharged Handler
// Triggered when: campaign.charged event is emitted
// Action: Create fund_balance_logs entry, send notifications
// ============================================================================
const onCampaignChargedLogic = async ({ event, step }) => {
  const { campaign_id, team_id, user_id, member_name, transaction_id, amount } = event.data;

  logger.info('Processing campaign.charged event', {
    campaign_id,
    team_id,
    user_id,
    transaction_id,
    amount
  });

  // Step 1: Fetch campaign details
  const campaign = await step.run('fetch-campaign', async () => {
    return db('campaigns')
      .where('id', campaign_id)
      .where('team_id', team_id)
      .first();
  });

  if (!campaign) {
    logger.warn('Campaign not found', { campaign_id, team_id });
    throw new Error(`Campaign ${campaign_id} not found`);
  }

  // Step 2: Fetch member user info
  const member = await step.run('fetch-member', async () => {
    return db('users')
      .where('id', user_id)
      .first();
  });

  if (!member) {
    logger.warn('Member not found', { user_id });
    throw new Error(`Member ${user_id} not found`);
  }

  // Step 3: Calculate previous and new balance (income - expense)
  const balances = await step.run('calculate-balances', async () => {
    const result = await db('fund_transactions')
      .where('team_id', team_id)
      .where('status', 'approved')
      .whereNot('id', transaction_id) // exclude current transaction
      .select(
        db.raw(`SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as total_income`),
        db.raw(`SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as total_expense`)
      )
      .first();

    const previousBalance = (parseFloat(result.total_income) || 0) - (parseFloat(result.total_expense) || 0);
    const changeAmount = parseFloat(amount); // campaign luôn là income
    const newBalance = previousBalance + changeAmount;

    return { previousBalance, newBalance, changeAmount };
  });

  // Step 4: Create fund_balance_logs entry
  const logId = await step.run('create-balance-log', async () => {
    const id = await db('fund_balance_logs')
      .insert({
        team_id,
        transaction_id,
        previous_balance: balances.previousBalance,
        new_balance: balances.newBalance,
        change_amount: balances.changeAmount,
        description: `Campaign charge from ${member_name} for "${campaign.name}"`
      })
      .returning('id');
    return id[0];
  });

  logger.info('Fund balance log created', {
    log_id: logId,
    team_id,
    previous_balance: balances.previousBalance,
    new_balance: balances.newBalance
  });

  // Step 5: Send Zalo notification to member about charge
  await step.run('notify-member-charged', async () => {
    try {
      await notificationService.sendZaloMessage(
        member.zalo_user_id,
        'CAMPAIGN_CHARGED',
        {
          campaign_name: campaign.name,
          amount: amount.toString(),
          transaction_id: transaction_id.toString()
        }
      );
      logger.info('Member notified of charge', {
        member_id: member.id,
        team_id
      });
    } catch (error) {
      logger.error('Failed to notify member of charge', {
        member_id: member.id,
        error: error.message
      });
      // Continue even if notification fails
    }
  });

  // Step 6: Fetch all team members (except member)
  const teamMembers = await step.run('fetch-team-members', async () => {
    return db('users')
      .where('team_id', team_id)
      .where('status', 'active')
      .whereNot('id', user_id)
      .select('id', 'zalo_user_id', 'full_name');
  });

  // Step 7: Send FUND_UPDATED notification to all team members
  let fundUpdateNotificationsSent = 0;
  let fundUpdateNotificationsFailed = 0;

  for (const teamMember of teamMembers) {
    await step.run(`send-fund-update-to-${teamMember.id}`, async () => {
      try {
        await notificationService.sendZaloMessage(
          teamMember.zalo_user_id,
          'FUND_UPDATED',
          {
            member_name,
            new_balance: balances.newBalance.toString(),
            change_amount: balances.changeAmount.toString(),
            transaction_id: transaction_id.toString()
          }
        );
        fundUpdateNotificationsSent++;
        logger.info('Fund update notification sent to team member', {
          team_member_id: teamMember.id,
          team_id
        });
      } catch (error) {
        fundUpdateNotificationsFailed++;
        logger.error('Failed to send fund update notification', {
          team_member_id: teamMember.id,
          error: error.message
        });
        // Continue with next team member on error
      }
    });
  }

  // Step 8: Log the action
  await step.run('log-action', async () => {
    logger.info('Campaign charged notifications and logs completed', {
      campaign_id,
      team_id,
      user_id,
      transaction_id,
      log_id: logId,
      memberNotified: true,
      fundUpdateNotificationsSent,
      fundUpdateNotificationsFailed
    });
  });

  return {
    status: 'completed',
    campaign_id,
    log_id: logId,
    memberNotified: true,
    fundUpdateNotificationsSent,
    fundUpdateNotificationsFailed
  };
};

const onCampaignChargedHandler = inngest.createFunction(
  {
    id: 'campaign.charged',
    retryOptions: { maxRetries: 3, initialDelayMs: 5000 }
  },
  { event: 'campaign.charged' },
  onCampaignChargedLogic
);

// ============================================================================
// onCampaignClosed Handler
// Triggered when: campaign.closed event is emitted
// Action: Calculate statistics and send campaign summary
// ============================================================================
const onCampaignClosedLogic = async ({ event, step }) => {
  const { campaign_id, team_id } = event.data;

  logger.info('Processing campaign.closed event', {
    campaign_id,
    team_id
  });

  // Step 1: Fetch campaign details
  const campaign = await step.run('fetch-campaign', async () => {
    return db('campaigns')
      .where('id', campaign_id)
      .where('team_id', team_id)
      .first();
  });

  if (!campaign) {
    logger.warn('Campaign not found', { campaign_id, team_id });
    throw new Error(`Campaign ${campaign_id} not found`);
  }

  // Step 2: Fetch all campaign assignments for statistics
  const assignments = await step.run('fetch-assignments', async () => {
    return db('campaign_assignments_v2')
      .where('campaign_id', campaign_id)
      .select('status', 'user_id', 'transaction_id');
  });

  // Step 3: Calculate statistics
  const statistics = await step.run('calculate-statistics', async () => {
    let totalCharged = 0;
    let membersConfirmed = 0;
    let membersRejected = 0;
    let membersExempt = 0;

    for (const assignment of assignments) {
      if (assignment.status === 'approved' && assignment.transaction_id) {
        // Fetch transaction to get amount
        const transaction = await db('fund_transactions')
          .where('id', assignment.transaction_id)
          .first();

        if (transaction) {
          totalCharged += parseFloat(transaction.amount);
        }
      } else if (assignment.status === 'approved') {
        membersConfirmed++;
      } else if (assignment.status === 'rejected') {
        membersRejected++;
      } else if (assignment.status === 'exempt') {
        membersExempt++;
      }
    }

    return {
      totalCharged,
      membersConfirmed,
      membersRejected,
      membersExempt,
      totalMembers: assignments.length
    };
  });

  logger.info('Campaign statistics calculated', {
    campaign_id,
    team_id,
    statistics
  });

  // Step 4: Fetch all team members
  const teamMembers = await step.run('fetch-team-members', async () => {
    return db('users')
      .where('team_id', team_id)
      .where('status', 'active')
      .select('id', 'zalo_user_id', 'full_name');
  });

  // Step 5: Send Zalo notifications to each team member
  let notificationsSent = 0;
  let notificationsFailed = 0;

  for (const member of teamMembers) {
    await step.run(`send-summary-to-${member.id}`, async () => {
      try {
        await notificationService.sendZaloMessage(
          member.zalo_user_id,
          'CAMPAIGN_CLOSED_SUMMARY',
          {
            campaign_name: campaign.name,
            total_charged: statistics.totalCharged.toString(),
            members_confirmed: statistics.membersConfirmed.toString(),
            members_rejected: statistics.membersRejected.toString(),
            members_exempt: statistics.membersExempt.toString(),
            total_members: statistics.totalMembers.toString()
          }
        );
        notificationsSent++;
        logger.info('Campaign summary sent to team member', {
          member_id: member.id,
          team_id
        });
      } catch (error) {
        notificationsFailed++;
        logger.error('Failed to send campaign summary to team member', {
          member_id: member.id,
          team_id,
          error: error.message
        });
        // Continue with next member on error
      }
    });
  }

  // Step 6: Log the action
  await step.run('log-action', async () => {
    logger.info('Campaign closed notifications completed', {
      campaign_id,
      team_id,
      campaign_name: campaign.name,
      statistics,
      notificationsSent,
      notificationsFailed
    });
  });

  return {
    status: 'completed',
    campaign_id,
    statistics,
    notificationsSent,
    notificationsFailed
  };
};

const onCampaignClosedHandler = inngest.createFunction(
  {
    id: 'campaign.closed',
    retryOptions: { maxRetries: 3, initialDelayMs: 5000 }
  },
  { event: 'campaign.closed' },
  onCampaignClosedLogic
);

// Export handlers and logic for testing
module.exports = {
  onCampaignCreatedHandler,
  onCampaignMemberConfirmedHandler,
  onCampaignChargedHandler,
  onCampaignClosedHandler,
  logic: {
    onCampaignCreated: onCampaignCreatedLogic,
    onCampaignMemberConfirmed: onCampaignMemberConfirmedLogic,
    onCampaignCharged: onCampaignChargedLogic,
    onCampaignClosed: onCampaignClosedLogic
  }
};
