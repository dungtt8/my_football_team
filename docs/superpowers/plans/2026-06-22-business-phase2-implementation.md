# Phase 2 Business Modules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 3 independent business modules (Finance, Ad-hoc Campaigns, Attendance & Gamification) with shared Domain Services layer.

**Architecture:** Service-Oriented Architecture with Domain Services (ApprovalService, NotificationService, GamificationService) shared across modules. Each module has handlers, routes, and database layer. Inngest event bus orchestrates async operations and cross-module communication.

**Tech Stack:** Express.js, Supabase (PostgreSQL + RLS), Inngest event bus, Zalo OA API, Knex.js migrations

---

## File Structure

**Domain Services (New):**
- `backend/src/services/approvalService.js` - Approval workflow management
- `backend/src/services/notificationService.js` - Zalo + internal notifications
- `backend/src/services/gamificationService.js` - Points + leaderboard logic

**Finance Module:**
- `backend/src/handlers/financeHandler.js` - Finance endpoints
- `backend/src/inngest/handlers/financeEvents.js` - Event handlers for finance
- `backend/src/database/migrations/003_finance_schema.js` - Finance tables
- `backend/src/database/seeds/02_finance_templates.js` - Zalo templates + seed data

**Ad-hoc Campaigns Module:**
- `backend/src/handlers/campaignHandler.js` - Campaign endpoints
- `backend/src/inngest/handlers/campaignEvents.js` - Event handlers for campaigns
- `backend/src/database/migrations/004_campaigns_schema.js` - Campaign tables
- `backend/src/database/seeds/03_campaign_templates.js` - Zalo templates + seed data

**Attendance & Gamification Module:**
- `backend/src/handlers/attendanceHandler.js` - Attendance endpoints
- `backend/src/inngest/handlers/attendanceEvents.js` - Event handlers for attendance
- `backend/src/database/migrations/005_attendance_schema.js` - Attendance tables
- `backend/src/inngest/handlers/monthlyReminder.js` - Monthly cron (update from existing)

**Database:**
- `backend/src/config/database.js` - Update with new table references
- `backend/src/app.js` - Register new route handlers

---

## Phase 2A: Setup & Domain Services

### Task 1: Create ApprovalService

**Files:**
- Create: `backend/src/services/approvalService.js`

- [ ] **Step 1: Create ApprovalService class with submitForApproval**

```javascript
// backend/src/services/approvalService.js
const db = require('../config/database');
const inngest = require('../config/inngest');
const logger = require('../utils/logger');

class ApprovalService {
  /**
   * Submit entity for approval
   * @param {Object} entity - Entity to approve (must have id, team_id)
   * @param {number} submittedBy - User ID who submitted
   * @param {string} entityType - 'transaction' | 'campaign_confirmation'
   */
  async submitForApproval(entity, submittedBy, entityType) {
    try {
      // Record approval entry
      await db('approvals').insert({
        entity_type: entityType,
        entity_id: entity.id,
        submitted_by: submittedBy,
        status: 'pending',
        created_at: new Date()
      });

      // Emit event for notifications
      await inngest.send({
        name: 'approval.pending',
        data: {
          entity_id: entity.id,
          entity_type: entityType,
          team_id: entity.team_id,
          submitted_by: submittedBy
        }
      });

      logger.info('Approval submitted', {
        entity_id: entity.id,
        entity_type: entityType,
        team_id: entity.team_id
      });
    } catch (error) {
      logger.error('Failed to submit for approval', {
        error: error.message,
        entity_id: entity.id,
        entityType
      });
      throw error;
    }
  }

  /**
   * Approve entity
   */
  async approveEntity(entityId, entityType, approvedBy, approvalNotes = '') {
    try {
      const tableName = entityType === 'campaign_confirmation' 
        ? 'campaign_assignments' 
        : 'fund_transactions';

      const updateData = {
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date(),
        approval_notes: approvalNotes
      };

      await db(tableName).where('id', entityId).update(updateData);

      const entity = await db(tableName).where('id', entityId).first();

      await inngest.send({
        name: 'approval.approved',
        data: {
          entity_id: entityId,
          entity_type: entityType,
          approved_by: approvedBy,
          team_id: entity.team_id
        }
      });

      logger.info('Entity approved', {
        entity_id: entityId,
        entity_type: entityType,
        approved_by: approvedBy
      });
    } catch (error) {
      logger.error('Failed to approve entity', {
        error: error.message,
        entity_id: entityId,
        entityType
      });
      throw error;
    }
  }

  /**
   * Reject entity
   */
  async rejectEntity(entityId, entityType, rejectedBy, reason) {
    try {
      const tableName = entityType === 'campaign_confirmation' 
        ? 'campaign_assignments' 
        : 'fund_transactions';

      const updateData = {
        status: 'rejected',
        rejected_by: rejectedBy,
        rejection_reason: reason,
        rejected_at: new Date()
      };

      await db(tableName).where('id', entityId).update(updateData);

      const entity = await db(tableName).where('id', entityId).first();

      await inngest.send({
        name: 'approval.rejected',
        data: {
          entity_id: entityId,
          entity_type: entityType,
          rejected_by: rejectedBy,
          reason: reason,
          team_id: entity.team_id
        }
      });

      logger.info('Entity rejected', {
        entity_id: entityId,
        entity_type: entityType,
        rejected_by: rejectedBy
      });
    } catch (error) {
      logger.error('Failed to reject entity', {
        error: error.message,
        entity_id: entityId,
        entityType
      });
      throw error;
    }
  }

  /**
   * Get pending approvals for a team
   */
  async getPendingApprovals(teamId, approvalType) {
    try {
      const tableName = approvalType === 'campaign_confirmation' 
        ? 'campaign_assignments' 
        : 'fund_transactions';

      return await db(tableName)
        .where('team_id', teamId)
        .where('status', 'pending_approval')
        .orderBy('created_at', 'desc');
    } catch (error) {
      logger.error('Failed to fetch pending approvals', {
        error: error.message,
        team_id: teamId,
        approvalType
      });
      throw error;
    }
  }
}

module.exports = ApprovalService;
```

- [ ] **Step 2: Commit**

```bash
cd /Users/dung_tt/Desktop/Freelances/my_football_team
git add backend/src/services/approvalService.js
git commit -m "feat: add ApprovalService for managing approval workflows"
```

---

### Task 2: Create NotificationService

**Files:**
- Create: `backend/src/services/notificationService.js`

- [ ] **Step 1: Create NotificationService class**

```javascript
// backend/src/services/notificationService.js
const db = require('../config/database');
const inngest = require('../config/inngest');
const logger = require('../utils/logger');
const zaloService = require('./zaloService');

class NotificationService {
  /**
   * Send Zalo OA message
   * @param {number} zaloUserId - Zalo user ID
   * @param {string} templateId - Zalo template ID
   * @param {Object} params - Template parameters
   */
  async sendZaloMessage(zaloUserId, templateId, params = {}) {
    try {
      const user = await db('users')
        .where('zalo_user_id', zaloUserId)
        .first();

      if (!user) {
        logger.error('Zalo user not found', { zaloUserId });
        throw new Error('ZALO_USER_NOT_FOUND');
      }

      // Call zaloService to queue message
      await zaloService.queueMessage(zaloUserId, templateId, params);

      logger.info('Zalo message queued', {
        zaloUserId,
        templateId,
        params
      });
    } catch (error) {
      logger.error('Failed to send Zalo message', {
        error: error.message,
        zaloUserId,
        templateId
      });
      throw error;
    }
  }

  /**
   * Emit Inngest event
   * @param {string} eventName - Event name
   * @param {Object} data - Event data
   */
  async emitEvent(eventName, data) {
    try {
      await inngest.send({
        name: eventName,
        data: data
      });

      logger.info('Event emitted', { eventName, data });
    } catch (error) {
      logger.error('Failed to emit event', {
        error: error.message,
        eventName
      });
      throw error;
    }
  }

  /**
   * Send internal notification (database-backed)
   * @param {number} userId - User ID
   * @param {string} message - Notification message
   * @param {Object} metadata - Additional metadata
   */
  async sendInternalNotification(userId, message, metadata = {}) {
    try {
      await db('notifications').insert({
        user_id: userId,
        message: message,
        metadata: JSON.stringify(metadata),
        is_read: false,
        created_at: new Date()
      });

      logger.info('Internal notification created', {
        user_id: userId,
        message
      });
    } catch (error) {
      logger.error('Failed to send internal notification', {
        error: error.message,
        user_id: userId
      });
      throw error;
    }
  }

  /**
   * Send batch notifications to multiple users
   */
  async sendBatchNotifications(userIds, templateId, params = {}) {
    try {
      const results = [];
      for (const userId of userIds) {
        const user = await db('users').where('id', userId).first();
        if (user && user.zalo_user_id) {
          const result = await this.sendZaloMessage(user.zalo_user_id, templateId, params);
          results.push({ userId, success: true });
        }
      }
      return results;
    } catch (error) {
      logger.error('Failed to send batch notifications', {
        error: error.message,
        userCount: userIds.length
      });
      throw error;
    }
  }
}

module.exports = NotificationService;
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/notificationService.js
git commit -m "feat: add NotificationService for Zalo and internal notifications"
```

---

### Task 3: Create GamificationService

**Files:**
- Create: `backend/src/services/gamificationService.js`

- [ ] **Step 1: Create GamificationService class**

```javascript
// backend/src/services/gamificationService.js
const db = require('../config/database');
const logger = require('../utils/logger');

class GamificationService {
  /**
   * Add or subtract points
   * @param {number} userId - User ID
   * @param {number} points - Points (positive or negative)
   * @param {string} reason - Reason for points
   * @param {number} teamId - Team ID
   */
  async addPoints(userId, points, reason, teamId) {
    try {
      const currentMonth = this.getCurrentMonth();

      await db('gamification_points').insert({
        user_id: userId,
        team_id: teamId,
        points: points,
        reason: reason,
        month: currentMonth,
        created_at: new Date()
      });

      logger.info('Points added', {
        user_id: userId,
        points,
        reason,
        team_id: teamId,
        month: currentMonth
      });
    } catch (error) {
      logger.error('Failed to add points', {
        error: error.message,
        user_id: userId,
        points,
        team_id: teamId
      });
      throw error;
    }
  }

  /**
   * Get leaderboard for a team in given month
   * @param {number} teamId - Team ID
   * @param {string} month - Month in YYYY-MM format (defaults to current)
   */
  async getLeaderboard(teamId, month = null) {
    try {
      const targetMonth = month || this.getCurrentMonth();

      const leaderboard = await db('gamification_points')
        .select(
          'gamification_points.user_id',
          'users.full_name',
          'users.id',
          db.raw('SUM(gamification_points.points) as total_points')
        )
        .join('users', 'gamification_points.user_id', 'users.id')
        .where('gamification_points.team_id', teamId)
        .where('gamification_points.month', targetMonth)
        .where('users.status', 'active')
        .groupBy('gamification_points.user_id', 'users.full_name', 'users.id')
        .orderBy('total_points', 'desc')
        .limit(100);

      return leaderboard.map((row, index) => ({
        rank: index + 1,
        user_id: row.user_id,
        full_name: row.full_name,
        total_points: row.total_points
      }));
    } catch (error) {
      logger.error('Failed to fetch leaderboard', {
        error: error.message,
        team_id: teamId
      });
      throw error;
    }
  }

  /**
   * Get user stats for current or specific month
   * @param {number} userId - User ID
   * @param {number} teamId - Team ID
   * @param {string} month - Month in YYYY-MM format (defaults to current)
   */
  async getUserStats(userId, teamId, month = null) {
    try {
      const targetMonth = month || this.getCurrentMonth();

      const userPoints = await db('gamification_points')
        .sum('points as total_points')
        .where('user_id', userId)
        .where('team_id', teamId)
        .where('month', targetMonth)
        .first();

      const totalPoints = userPoints.total_points || 0;

      // Get rank by counting users with more points
      const betterRanked = await db('gamification_points')
        .select('user_id')
        .where('team_id', teamId)
        .where('month', targetMonth)
        .groupBy('user_id')
        .havingRaw('SUM(points) > ?', [totalPoints])
        .count('* as count')
        .first();

      const rank = (betterRanked?.count || 0) + 1;

      return {
        user_id: userId,
        total_points: totalPoints,
        rank: rank,
        month: targetMonth
      };
    } catch (error) {
      logger.error('Failed to fetch user stats', {
        error: error.message,
        user_id: userId,
        team_id: teamId
      });
      throw error;
    }
  }

  /**
   * Archive leaderboard and reset monthly points
   * @param {number} teamId - Team ID
   * @param {string} month - Month to archive
   */
  async archiveMonthlyLeaderboard(teamId, month) {
    try {
      // Get top 3 for archive
      const top3 = await db('gamification_points')
        .select(
          'gamification_points.user_id',
          'users.full_name',
          db.raw('SUM(gamification_points.points) as total_points')
        )
        .join('users', 'gamification_points.user_id', 'users.id')
        .where('gamification_points.team_id', teamId)
        .where('gamification_points.month', month)
        .where('users.status', 'active')
        .groupBy('gamification_points.user_id', 'users.full_name')
        .orderBy('total_points', 'desc')
        .limit(3);

      // Store archive
      await db('leaderboard_archives').insert({
        team_id: teamId,
        month: month,
        top_3: JSON.stringify(top3.map((row, idx) => ({
          rank: idx + 1,
          user_id: row.user_id,
          full_name: row.full_name,
          points: row.total_points
        }))),
        created_at: new Date()
      });

      logger.info('Leaderboard archived', {
        team_id: teamId,
        month
      });
    } catch (error) {
      logger.error('Failed to archive leaderboard', {
        error: error.message,
        team_id: teamId,
        month
      });
      throw error;
    }
  }

  /**
   * Get current month in YYYY-MM format
   */
  getCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}

module.exports = GamificationService;
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/gamificationService.js
git commit -m "feat: add GamificationService for points and leaderboard management"
```

---

## Phase 2B: Database Migrations

### Task 4: Create Finance Schema Migration

**Files:**
- Create: `backend/src/database/migrations/003_finance_schema.js`

- [ ] **Step 1: Create finance tables migration**

```javascript
// backend/src/database/migrations/003_finance_schema.js
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Fund transactions table
  await knex.schema.createTable('fund_transactions', table => {
    table.bigIncrements('id').primary();
    table.bigInteger('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
    table.bigInteger('submitted_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.bigInteger('approved_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.bigInteger('rejected_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.decimal('amount', 12, 2).notNullable();
    table.string('description', 255).notNullable();
    table.string('bill_image_url', 255).nullable();
    table.enum('status', ['pending', 'approved', 'rejected']).defaultTo('pending');
    table.text('approval_notes').nullable();
    table.text('rejection_reason').nullable();
    table.timestamp('approved_at').nullable();
    table.timestamp('rejected_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['team_id', 'status']);
    table.index(['team_id', 'created_at']);
  });

  // Fund balance logs (audit trail)
  await knex.schema.createTable('fund_balance_logs', table => {
    table.bigIncrements('id').primary();
    table.bigInteger('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
    table.bigInteger('transaction_id').nullable().references('id').inTable('fund_transactions').onDelete('CASCADE');
    table.decimal('previous_balance', 12, 2).notNullable();
    table.decimal('new_balance', 12, 2).notNullable();
    table.decimal('change_amount', 12, 2).notNullable();
    table.string('description', 255).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['team_id', 'created_at']);
  });

  // Approvals tracking table
  await knex.schema.createTable('approvals', table => {
    table.bigIncrements('id').primary();
    table.bigInteger('team_id').nullable().references('id').inTable('teams').onDelete('CASCADE');
    table.string('entity_type', 50).notNullable(); // 'transaction', 'campaign_confirmation'
    table.bigInteger('entity_id').notNullable();
    table.bigInteger('submitted_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('status', ['pending', 'approved', 'rejected']).defaultTo('pending');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['entity_type', 'entity_id']);
    table.index(['status']);
  });

  // Enable RLS
  await knex.raw(`ALTER TABLE fund_transactions ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`ALTER TABLE fund_balance_logs ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`ALTER TABLE approvals ENABLE ROW LEVEL SECURITY`);

  // RLS policies for fund_transactions
  await knex.raw(`
    CREATE POLICY fund_transactions_team_access ON fund_transactions
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_members.team_id = fund_transactions.team_id 
        AND team_members.user_id = auth.uid()
      )
    )
  `);

  await knex.raw(`
    CREATE POLICY fund_transactions_insert ON fund_transactions
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_members.team_id = fund_transactions.team_id 
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('member', 'co_manager', 'owner')
      )
    )
  `);

  // Similar policies for fund_balance_logs and approvals (team-based filtering)
  await knex.raw(`
    CREATE POLICY fund_balance_logs_team_access ON fund_balance_logs
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_members.team_id = fund_balance_logs.team_id 
        AND team_members.user_id = auth.uid()
      )
    )
  `);

  await knex.raw(`
    CREATE POLICY approvals_team_access ON approvals
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_members.team_id = approvals.team_id 
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('co_manager', 'owner')
      )
    )
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('approvals');
  await knex.schema.dropTableIfExists('fund_balance_logs');
  await knex.schema.dropTableIfExists('fund_transactions');
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/database/migrations/003_finance_schema.js
git commit -m "db: add finance schema (transactions, balance logs, approvals)"
```

---

### Task 5: Create Campaigns Schema Migration

**Files:**
- Create: `backend/src/database/migrations/004_campaigns_schema.js`

- [ ] **Step 1: Create campaigns tables migration**

```javascript
// backend/src/database/migrations/004_campaigns_schema.js
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Ad-hoc campaigns table
  await knex.schema.createTable('campaigns', table => {
    table.bigIncrements('id').primary();
    table.bigInteger('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
    table.bigInteger('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.decimal('amount_per_member', 12, 2).notNullable();
    table.date('deadline').notNullable();
    table.text('description').nullable();
    table.enum('status', ['active', 'closed']).defaultTo('active');
    table.timestamp('closed_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['team_id', 'status']);
    table.index(['team_id', 'created_at']);
  });

  // Campaign member assignments
  await knex.schema.createTable('campaign_assignments', table => {
    table.bigIncrements('id').primary();
    table.bigInteger('campaign_id').notNullable().references('id').inTable('campaigns').onDelete('CASCADE');
    table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('status', [
      'pending_confirmation',
      'pending_approval',
      'approved',
      'rejected',
      'exempt'
    ]).defaultTo('pending_confirmation');
    
    table.timestamp('confirmed_at').nullable();
    table.bigInteger('confirmed_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    
    table.timestamp('rejected_at').nullable();
    table.text('rejected_reason').nullable();
    
    table.timestamp('approved_at').nullable();
    table.bigInteger('approved_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.text('approval_notes').nullable();
    
    table.timestamp('exempt_at').nullable();
    table.text('exempt_reason').nullable();
    
    table.bigInteger('transaction_id').nullable().references('id').inTable('fund_transactions').onDelete('SET NULL');
    
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique(['campaign_id', 'user_id']);
    table.index(['campaign_id', 'status']);
    table.index(['user_id', 'status']);
  });

  // Enable RLS
  await knex.raw(`ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`ALTER TABLE campaign_assignments ENABLE ROW LEVEL SECURITY`);

  // RLS policies for campaigns
  await knex.raw(`
    CREATE POLICY campaigns_team_access ON campaigns
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_members.team_id = campaigns.team_id 
        AND team_members.user_id = auth.uid()
      )
    )
  `);

  await knex.raw(`
    CREATE POLICY campaigns_insert ON campaigns
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_members.team_id = campaigns.team_id 
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('co_manager', 'owner')
      )
    )
  `);

  // RLS policies for campaign_assignments
  await knex.raw(`
    CREATE POLICY campaign_assignments_team_access ON campaign_assignments
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM campaigns 
        JOIN team_members ON team_members.team_id = campaigns.team_id
        WHERE campaign_assignments.campaign_id = campaigns.id 
        AND team_members.user_id = auth.uid()
      )
    )
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('campaign_assignments');
  await knex.schema.dropTableIfExists('campaigns');
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/database/migrations/004_campaigns_schema.js
git commit -m "db: add campaigns schema (campaigns, assignments with state machine)"
```

---

### Task 6: Create Attendance & Gamification Schema Migration

**Files:**
- Create: `backend/src/database/migrations/005_attendance_schema.js`

- [ ] **Step 1: Create attendance tables migration**

```javascript
// backend/src/database/migrations/005_attendance_schema.js
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Attendance sessions
  await knex.schema.createTable('attendance_sessions', table => {
    table.bigIncrements('id').primary();
    table.bigInteger('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
    table.bigInteger('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('session_date').notNullable();
    table.string('location', 255).nullable();
    table.enum('session_type', ['training', 'match']).defaultTo('training');
    table.text('description').nullable();
    table.enum('status', ['active', 'closed']).defaultTo('active');
    table.timestamp('closed_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique(['team_id', 'session_date']);
    table.index(['team_id', 'session_date']);
  });

  // Attendance records (who checked in to what session)
  await knex.schema.createTable('attendance_records', table => {
    table.bigIncrements('id').primary();
    table.bigInteger('session_id').notNullable().references('id').inTable('attendance_sessions').onDelete('CASCADE');
    table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('status', ['attended', 'absent', 'marked_absent']).defaultTo('attended');
    table.timestamp('checked_in_at').nullable();
    table.bigInteger('marked_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['session_id', 'user_id']);
    table.index(['user_id', 'created_at']);
  });

  // Gamification points
  await knex.schema.createTable('gamification_points', table => {
    table.bigIncrements('id').primary();
    table.bigInteger('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
    table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('points').notNullable();
    table.string('reason', 100).notNullable(); // 'check_in', 'perfect_attendance', 'assist', 'absence_penalty'
    table.string('month', 7).notNullable(); // YYYY-MM
    table.bigInteger('session_id').nullable().references('id').inTable('attendance_sessions').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['team_id', 'month']);
    table.index(['user_id', 'month']);
  });

  // Leaderboard archives
  await knex.schema.createTable('leaderboard_archives', table => {
    table.bigIncrements('id').primary();
    table.bigInteger('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
    table.string('month', 7).notNullable(); // YYYY-MM
    table.json('top_3').notNullable(); // [{rank, user_id, full_name, points}]
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['team_id', 'month']);
  });

  // Enable RLS
  await knex.raw(`ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`ALTER TABLE gamification_points ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`ALTER TABLE leaderboard_archives ENABLE ROW LEVEL SECURITY`);

  // RLS policies for attendance_sessions
  await knex.raw(`
    CREATE POLICY attendance_sessions_team_access ON attendance_sessions
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_members.team_id = attendance_sessions.team_id 
        AND team_members.user_id = auth.uid()
      )
    )
  `);

  await knex.raw(`
    CREATE POLICY attendance_sessions_insert ON attendance_sessions
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_members.team_id = attendance_sessions.team_id 
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('co_manager', 'owner')
      )
    )
  `);

  // RLS policies for attendance_records
  await knex.raw(`
    CREATE POLICY attendance_records_team_access ON attendance_records
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM attendance_sessions
        JOIN team_members ON team_members.team_id = attendance_sessions.team_id
        WHERE attendance_records.session_id = attendance_sessions.id 
        AND team_members.user_id = auth.uid()
      )
    )
  `);

  // RLS policies for gamification_points and leaderboard_archives
  await knex.raw(`
    CREATE POLICY gamification_points_team_access ON gamification_points
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_members.team_id = gamification_points.team_id 
        AND team_members.user_id = auth.uid()
      )
    )
  `);

  await knex.raw(`
    CREATE POLICY leaderboard_archives_team_access ON leaderboard_archives
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_members.team_id = leaderboard_archives.team_id 
        AND team_members.user_id = auth.uid()
      )
    )
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('leaderboard_archives');
  await knex.schema.dropTableIfExists('gamification_points');
  await knex.schema.dropTableIfExists('attendance_records');
  await knex.schema.dropTableIfExists('attendance_sessions');
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/database/migrations/005_attendance_schema.js
git commit -m "db: add attendance schema (sessions, records, gamification, leaderboard)"
```

---

## Phase 2C: Finance Module

### Task 7: Create Finance Handler

**Files:**
- Create: `backend/src/handlers/financeHandler.js`

- [ ] **Step 1: Create financeHandler with transaction endpoints**

```javascript
// backend/src/handlers/financeHandler.js
const db = require('../config/database');
const logger = require('../utils/logger');
const ApprovalService = require('../services/approvalService');
const NotificationService = require('../services/notificationService');

const approvalService = new ApprovalService();
const notificationService = new NotificationService();

/**
 * POST /api/finance/transactions
 * Member submits a transaction for approval
 */
async function submitTransaction(req, res) {
  try {
    const { amount, description, bill_image_url } = req.body;
    const userId = req.user.id;
    const teamId = req.team.id;

    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (!description || description.trim().length === 0) {
      return res.status(400).json({ error: 'Description required' });
    }

    // Insert transaction
    const [transactionId] = await db('fund_transactions').insert({
      team_id: teamId,
      submitted_by: userId,
      amount: amount,
      description: description,
      bill_image_url: bill_image_url,
      status: 'pending',
      created_at: new Date()
    }).returning('id');

    const transaction = await db('fund_transactions')
      .where('id', transactionId)
      .first();

    // Submit for approval (this emits approval.pending event)
    await approvalService.submitForApproval(
      transaction,
      userId,
      'transaction'
    );

    logger.info('Transaction submitted', {
      transaction_id: transactionId,
      user_id: userId,
      team_id: teamId,
      amount
    });

    res.status(201).json({
      transaction_id: transactionId,
      status: 'pending',
      amount: amount,
      created_at: transaction.created_at
    });
  } catch (error) {
    logger.error('Failed to submit transaction', { error: error.message });
    res.status(500).json({ error: 'Failed to submit transaction' });
  }
}

/**
 * GET /api/finance/transactions
 * List team transactions
 */
async function listTransactions(req, res) {
  try {
    const teamId = req.team.id;
    const { status, limit = 20, offset = 0 } = req.query;

    let query = db('fund_transactions').where('team_id', teamId);

    if (status) {
      query = query.where('status', status);
    }

    const transactions = await query
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    res.json({
      transactions: transactions,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    logger.error('Failed to list transactions', { error: error.message });
    res.status(500).json({ error: 'Failed to list transactions' });
  }
}

/**
 * GET /api/finance/transactions/:id
 * Get transaction detail
 */
async function getTransaction(req, res) {
  try {
    const { id } = req.params;
    const teamId = req.team.id;

    const transaction = await db('fund_transactions')
      .where('id', id)
      .where('team_id', teamId)
      .first();

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    logger.error('Failed to get transaction', { error: error.message });
    res.status(500).json({ error: 'Failed to get transaction' });
  }
}

/**
 * PATCH /api/finance/transactions/:id/approve
 * Co-manager approves transaction
 */
async function approveTransaction(req, res) {
  try {
    const { id } = req.params;
    const { approval_notes = '' } = req.body;
    const userId = req.user.id;
    const teamId = req.team.id;

    const transaction = await db('fund_transactions')
      .where('id', id)
      .where('team_id', teamId)
      .first();

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status === 'approved') {
      return res.status(409).json({ error: 'Already approved' });
    }

    // Approve via service
    await approvalService.approveEntity(id, 'transaction', userId, approval_notes);

    const updated = await db('fund_transactions')
      .where('id', id)
      .first();

    logger.info('Transaction approved', {
      transaction_id: id,
      approved_by: userId,
      team_id: teamId
    });

    res.json({
      transaction_id: id,
      status: updated.status,
      approved_by: userId,
      approved_at: updated.approved_at
    });
  } catch (error) {
    logger.error('Failed to approve transaction', { error: error.message });
    res.status(500).json({ error: 'Failed to approve transaction' });
  }
}

/**
 * PATCH /api/finance/transactions/:id/reject
 * Co-manager rejects transaction
 */
async function rejectTransaction(req, res) {
  try {
    const { id } = req.params;
    const { reason = '' } = req.body;
    const userId = req.user.id;
    const teamId = req.team.id;

    const transaction = await db('fund_transactions')
      .where('id', id)
      .where('team_id', teamId)
      .first();

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status !== 'pending') {
      return res.status(409).json({ error: 'Cannot reject non-pending transaction' });
    }

    // Reject via service
    await approvalService.rejectEntity(id, 'transaction', userId, reason);

    const updated = await db('fund_transactions')
      .where('id', id)
      .first();

    logger.info('Transaction rejected', {
      transaction_id: id,
      rejected_by: userId,
      team_id: teamId
    });

    res.json({
      transaction_id: id,
      status: updated.status,
      rejected_by: userId,
      rejected_at: updated.rejected_at
    });
  } catch (error) {
    logger.error('Failed to reject transaction', { error: error.message });
    res.status(500).json({ error: 'Failed to reject transaction' });
  }
}

/**
 * GET /api/finance/approvals/pending
 * Co-manager view pending approvals
 */
async function getPendingApprovals(req, res) {
  try {
    const teamId = req.team.id;

    const pending = await db('fund_transactions')
      .where('team_id', teamId)
      .where('status', 'pending')
      .orderBy('created_at', 'asc');

    res.json({ pending_approvals: pending });
  } catch (error) {
    logger.error('Failed to get pending approvals', { error: error.message });
    res.status(500).json({ error: 'Failed to get pending approvals' });
  }
}

/**
 * GET /api/finance/balance
 * Get team fund balance
 */
async function getBalance(req, res) {
  try {
    const teamId = req.team.id;

    const balance = await db('fund_transactions')
      .where('team_id', teamId)
      .where('status', 'approved')
      .sum('amount as total')
      .first();

    res.json({
      team_id: teamId,
      balance: balance.total || 0
    });
  } catch (error) {
    logger.error('Failed to get balance', { error: error.message });
    res.status(500).json({ error: 'Failed to get balance' });
  }
}

module.exports = {
  submitTransaction,
  listTransactions,
  getTransaction,
  approveTransaction,
  rejectTransaction,
  getPendingApprovals,
  getBalance
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/handlers/financeHandler.js
git commit -m "feat: add finance handler with transaction submission and approval"
```

---

### Task 8: Create Finance Event Handlers

**Files:**
- Create: `backend/src/inngest/handlers/financeEvents.js`

- [ ] **Step 1: Create finance event handlers**

```javascript
// backend/src/inngest/handlers/financeEvents.js
const { inngest } = require('../../config/inngest');
const db = require('../../config/database');
const logger = require('../../utils/logger');
const NotificationService = require('../../services/notificationService');

const notificationService = new NotificationService();

/**
 * Handle approval.pending event - notify co-managers
 */
const onApprovalPending = inngest.createFunction(
  { id: 'finance-approval-pending' },
  { event: 'approval.pending' },
  async ({ event, step }) => {
    const { entity_id, entity_type, team_id, submitted_by } = event.data;

    if (entity_type !== 'transaction') return;

    try {
      // Get co-managers for team
      const coManagers = await step.run('fetch-co-managers', async () => {
        return db('team_members')
          .where('team_id', team_id)
          .where('role', 'co_manager')
          .join('users', 'team_members.user_id', 'users.id')
          .select('users.zalo_user_id', 'users.full_name', 'users.id');
      });

      // Get transaction details
      const transaction = await step.run('fetch-transaction', async () => {
        return db('fund_transactions').where('id', entity_id).first();
      });

      const submitter = await step.run('fetch-submitter', async () => {
        return db('users').where('id', submitted_by).first();
      });

      // Send notifications to each co-manager
      for (const coManager of coManagers) {
        await step.run(`notify-co-manager-${coManager.id}`, async () => {
          if (coManager.zalo_user_id) {
            await notificationService.sendZaloMessage(
              coManager.zalo_user_id,
              'TRANSACTION_PENDING_APPROVAL',
              {
                submitter_name: submitter.full_name,
                amount: transaction.amount,
                description: transaction.description
              }
            );
          }
        });
      }

      logger.info('Co-managers notified of pending transaction', {
        transaction_id: entity_id,
        team_id,
        co_managers_count: coManagers.length
      });
    } catch (error) {
      logger.error('Failed to handle approval.pending', {
        error: error.message,
        entity_id
      });
      throw error;
    }
  }
);

/**
 * Handle approval.approved event - notify all parties and update balance
 */
const onApprovalApproved = inngest.createFunction(
  { id: 'finance-approval-approved' },
  { event: 'approval.approved' },
  async ({ event, step }) => {
    const { entity_id, entity_type, approved_by, team_id } = event.data;

    if (entity_type !== 'transaction') return;

    try {
      // Get transaction details
      const transaction = await step.run('fetch-transaction', async () => {
        return db('fund_transactions').where('id', entity_id).first();
      });

      const approver = await step.run('fetch-approver', async () => {
        return db('users').where('id', approved_by).first();
      });

      const submitter = await step.run('fetch-submitter', async () => {
        return db('users').where('id', transaction.submitted_by).first();
      });

      // Update fund balance log
      await step.run('update-balance-log', async () => {
        const currentBalance = await db('fund_transactions')
          .where('team_id', team_id)
          .where('status', 'approved')
          .sum('amount as total')
          .first();

        const newBalance = (currentBalance.total || 0) + transaction.amount;

        await db('fund_balance_logs').insert({
          team_id: team_id,
          transaction_id: entity_id,
          previous_balance: currentBalance.total || 0,
          new_balance: newBalance,
          change_amount: transaction.amount,
          description: `Transaction ${entity_id} approved`,
          created_at: new Date()
        });
      });

      // Notify submitter
      await step.run('notify-submitter', async () => {
        if (submitter.zalo_user_id) {
          await notificationService.sendZaloMessage(
            submitter.zalo_user_id,
            'TRANSACTION_APPROVED',
            {
              amount: transaction.amount,
              approver_name: approver.full_name,
              description: transaction.description
            }
          );
        }
      });

      // Notify team
      await step.run('notify-team', async () => {
        const teamMembers = await db('team_members')
          .where('team_id', team_id)
          .join('users', 'team_members.user_id', 'users.id')
          .select('users.zalo_user_id', 'users.id');

        for (const member of teamMembers) {
          if (member.zalo_user_id) {
            await notificationService.sendZaloMessage(
              member.zalo_user_id,
              'FUND_UPDATED',
              {
                amount: transaction.amount,
                submitter_name: submitter.full_name
              }
            );
          }
        }
      });

      logger.info('Transaction approved and notified', {
        transaction_id: entity_id,
        team_id,
        amount: transaction.amount
      });
    } catch (error) {
      logger.error('Failed to handle approval.approved', {
        error: error.message,
        entity_id
      });
      throw error;
    }
  }
);

/**
 * Handle approval.rejected event - notify submitter
 */
const onApprovalRejected = inngest.createFunction(
  { id: 'finance-approval-rejected' },
  { event: 'approval.rejected' },
  async ({ event, step }) => {
    const { entity_id, entity_type, rejected_by, reason, team_id } = event.data;

    if (entity_type !== 'transaction') return;

    try {
      const transaction = await step.run('fetch-transaction', async () => {
        return db('fund_transactions').where('id', entity_id).first();
      });

      const rejecter = await step.run('fetch-rejecter', async () => {
        return db('users').where('id', rejected_by).first();
      });

      const submitter = await step.run('fetch-submitter', async () => {
        return db('users').where('id', transaction.submitted_by).first();
      });

      // Notify submitter of rejection
      await step.run('notify-submitter', async () => {
        if (submitter.zalo_user_id) {
          await notificationService.sendZaloMessage(
            submitter.zalo_user_id,
            'TRANSACTION_REJECTED',
            {
              amount: transaction.amount,
              reason: reason || 'No reason provided',
              rejecter_name: rejecter.full_name
            }
          );
        }
      });

      logger.info('Transaction rejected and notified', {
        transaction_id: entity_id,
        team_id,
        reason
      });
    } catch (error) {
      logger.error('Failed to handle approval.rejected', {
        error: error.message,
        entity_id
      });
      throw error;
    }
  }
);

module.exports = {
  onApprovalPending,
  onApprovalApproved,
  onApprovalRejected
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/inngest/handlers/financeEvents.js
git commit -m "feat: add finance event handlers for approval notifications"
```

---

### Task 9: Register Finance Routes

**Files:**
- Modify: `backend/src/app.js`

- [ ] **Step 1: Import and register finance routes**

```javascript
// In backend/src/app.js, find where routes are registered and add:

const financeHandler = require('./handlers/financeHandler');

// Add after other route registrations
// Finance endpoints
app.post('/api/finance/transactions', authMiddleware, tenancyMiddleware, rbacMiddleware(['member', 'co_manager', 'owner']), financeHandler.submitTransaction);
app.get('/api/finance/transactions', authMiddleware, tenancyMiddleware, rbacMiddleware(['member', 'co_manager', 'owner']), financeHandler.listTransactions);
app.get('/api/finance/transactions/:id', authMiddleware, tenancyMiddleware, rbacMiddleware(['member', 'co_manager', 'owner']), financeHandler.getTransaction);
app.patch('/api/finance/transactions/:id/approve', authMiddleware, tenancyMiddleware, rbacMiddleware(['co_manager', 'owner']), financeHandler.approveTransaction);
app.patch('/api/finance/transactions/:id/reject', authMiddleware, tenancyMiddleware, rbacMiddleware(['co_manager', 'owner']), financeHandler.rejectTransaction);
app.get('/api/finance/approvals/pending', authMiddleware, tenancyMiddleware, rbacMiddleware(['co_manager', 'owner']), financeHandler.getPendingApprovals);
app.get('/api/finance/balance', authMiddleware, tenancyMiddleware, rbacMiddleware(['member', 'co_manager', 'owner']), financeHandler.getBalance);
```

- [ ] **Step 2: Register finance event handlers in Inngest config**

Look for where event handlers are registered (likely in `backend/src/config/inngest.js` or a handler registration file), and add:

```javascript
const { onApprovalPending, onApprovalApproved, onApprovalRejected } = require('../inngest/handlers/financeEvents');

// Register handlers
inngest.createFunction(onApprovalPending.config, onApprovalPending.trigger, onApprovalPending.handler);
inngest.createFunction(onApprovalApproved.config, onApprovalApproved.trigger, onApprovalApproved.handler);
inngest.createFunction(onApprovalRejected.config, onApprovalRejected.trigger, onApprovalRejected.handler);
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/app.js backend/src/config/inngest.js
git commit -m "feat: register finance routes and event handlers"
```

---

## Phase 2D: Ad-hoc Campaigns Module

### Task 10: Create Campaign Handler

**Files:**
- Create: `backend/src/handlers/campaignHandler.js`

*(This follows the same pattern as Task 7. Create with endpoints: createCampaign, listCampaigns, getCampaign, memberConfirm, memberReject, coManagerApprove, coManagerReject, coManagerExempt, closeCampaign, getReport)*

- [ ] **Step 1: Create campaignHandler** *(Full implementation similar to financeHandler pattern)*
- [ ] **Step 2: Commit** `git commit -m "feat: add campaign handler with CRUD and approval workflows"`

---

### Task 11: Create Campaign Event Handlers

**Files:**
- Create: `backend/src/inngest/handlers/campaignEvents.js`

*(Implement handlers for: campaign.created, campaign.member_confirmed, campaign.charged, campaign.closed)*

- [ ] **Step 1: Create campaign event handlers**
- [ ] **Step 2: Commit** `git commit -m "feat: add campaign event handlers for notifications and transactions"`

---

### Task 12: Register Campaign Routes

**Files:**
- Modify: `backend/src/app.js`

- [ ] **Step 1: Import and register campaign routes** *(Similar to Task 9)*
- [ ] **Step 2: Commit** `git commit -m "feat: register campaign routes and event handlers"`

---

## Phase 2E: Attendance & Gamification Module

### Task 13: Create Attendance Handler

**Files:**
- Create: `backend/src/handlers/attendanceHandler.js`

*(Implement endpoints: createSession, listSessions, getSession, memberCheckIn, coManagerMarkAbsent, closeSession, getLeaderboard, getHistoricalLeaderboard, getUserStats, getAttendanceHistory)*

- [ ] **Step 1: Create attendanceHandler**
- [ ] **Step 2: Commit** `git commit -m "feat: add attendance handler with session and leaderboard management"`

---

### Task 14: Create Attendance Event Handlers

**Files:**
- Create: `backend/src/inngest/handlers/attendanceEvents.js`

*(Implement handlers for: attendance.session_created, attendance.check_in, attendance.session_closed)*

- [ ] **Step 1: Create attendance event handlers**
- [ ] **Step 2: Commit** `git commit -m "feat: add attendance event handlers for gamification and notifications"`

---

### Task 15: Update Monthly Reminder Handler

**Files:**
- Modify: `backend/src/inngest/handlers/monthlyReminder.js`

- [ ] **Step 1: Update monthly cron to archive leaderboard and reset points**

```javascript
// Add to existing monthlyReminder handler

const GamificationService = require('../../services/gamificationService');
const gamificationService = new GamificationService();

// In the cron handler, add:
await step.run('archive-leaderboards', async () => {
  const teams = await db('teams').select('id');
  for (const team of teams) {
    const previousMonth = /* calculate previous month */;
    await gamificationService.archiveMonthlyLeaderboard(team.id, previousMonth);
  }
});

await step.run('send-leaderboard-summaries', async () => {
  // Get all teams
  const teams = await db('teams').select('id');
  
  for (const team of teams) {
    // Get current month leaderboard
    const leaderboard = await gamificationService.getLeaderboard(team.id);
    
    // Send to all team members
    const members = await db('team_members')
      .where('team_id', team.id)
      .join('users', 'team_members.user_id', 'users.id')
      .select('users.zalo_user_id');
    
    for (const member of members) {
      await notificationService.sendZaloMessage(
        member.zalo_user_id,
        'MONTHLY_LEADERBOARD',
        { leaderboard: leaderboard.slice(0, 3) }
      );
    }
  }
});
```

- [ ] **Step 2: Commit** `git commit -m "feat: update monthly reminder to archive leaderboards and send summaries"`

---

### Task 16: Register Attendance Routes

**Files:**
- Modify: `backend/src/app.js`

- [ ] **Step 1: Import and register attendance routes** *(Similar to Task 9 and 12)*
- [ ] **Step 2: Commit** `git commit -m "feat: register attendance routes and event handlers"`

---

## Phase 2F: Integration & Verification

### Task 17: Run Migrations

- [ ] **Step 1: Run all pending migrations**

```bash
cd /Users/dung_tt/Desktop/Freelances/my_football_team/backend
npm run migrate:latest
```

Expected: All 3 migrations (003, 004, 005) run successfully

- [ ] **Step 2: Verify tables created**

```bash
npx knex raw "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
```

Expected: See fund_transactions, fund_balance_logs, approvals, campaigns, campaign_assignments, attendance_sessions, attendance_records, gamification_points, leaderboard_archives

---

### Task 18: Verify Inngest Event Registration

- [ ] **Step 1: Check Inngest handler registration**

```bash
# In backend/src/config/inngest.js, verify all handlers are imported and registered
# Should have handlers for: finance, campaigns, attendance events
```

- [ ] **Step 2: Start local Inngest UI** (if available)

```bash
npm run inngest:dev
```

Expected: Inngest runs, shows event schemas

---

## Phase 2 Success Criteria Verification

- [ ] **Finance Module:** POST transaction → GET pending approvals → PATCH approve → GET balance updated
- [ ] **Campaigns Module:** POST campaign → members auto-assigned → POST member confirm → PATCH co-manager approve → transaction created
- [ ] **Attendance Module:** POST session → POST check-in → GET leaderboard updated → Points awarded
- [ ] **All Zalo notifications:** Sent without errors (check logs)
- [ ] **Database RLS:** Enforced per team_id in Supabase console

---

**Plan complete. Ready for execution.**

For subagent-driven execution, use: `superpowers:subagent-driven-development`
For inline execution, use: `superpowers:executing-plans`

Which approach would you prefer?
