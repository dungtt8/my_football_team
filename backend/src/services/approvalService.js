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
      const tableName = this._getTableName(entityType);

      // Update entity status to pending
      await db(tableName)
        .where('id', entity.id)
        .update({
          status: 'pending',
          updated_at: new Date()
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
        team_id: entity.team_id,
        submitted_by: submittedBy
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
   * @param {number} entityId - ID of entity to approve
   * @param {string} entityType - 'transaction' | 'campaign_confirmation'
   * @param {number} approvedBy - User ID who approved
   * @param {string} approvalNotes - Optional notes from approver
   */
  async approveEntity(entityId, entityType, approvedBy, approvalNotes = null) {
    try {
      const tableName = this._getTableName(entityType);

      // Fetch entity to get team_id
      const entity = await db(tableName)
        .where('id', entityId)
        .first();

      if (!entity) {
        throw new Error(`${entityType} with id ${entityId} not found`);
      }

      // Update entity status to approved
      const updateData = {
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date(),
        updated_at: new Date()
      };

      // Add approval_notes if the table supports it (for future extensibility)
      if (approvalNotes) {
        updateData.approval_notes = approvalNotes;
      }

      await db(tableName)
        .where('id', entityId)
        .update(updateData);

      // Emit event for notifications and downstream processing
      await inngest.send({
        name: 'approval.approved',
        data: {
          entity_id: entityId,
          entity_type: entityType,
          team_id: entity.team_id,
          approved_by: approvedBy,
          approval_notes: approvalNotes
        }
      });

      logger.info('Entity approved', {
        entity_id: entityId,
        entity_type: entityType,
        team_id: entity.team_id,
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
   * @param {number} entityId - ID of entity to reject
   * @param {string} entityType - 'transaction' | 'campaign_confirmation'
   * @param {number} rejectedBy - User ID who rejected
   * @param {string} reason - Reason for rejection
   */
  async rejectEntity(entityId, entityType, rejectedBy, reason) {
    try {
      const tableName = this._getTableName(entityType);

      // Fetch entity to get team_id
      const entity = await db(tableName)
        .where('id', entityId)
        .first();

      if (!entity) {
        throw new Error(`${entityType} with id ${entityId} not found`);
      }

      // Update entity status to rejected
      const updateData = {
        status: 'rejected',
        updated_at: new Date()
      };

      // Add rejection_reason if the table supports it
      if (reason) {
        updateData.rejection_reason = reason;
      }

      await db(tableName)
        .where('id', entityId)
        .update(updateData);

      // Emit event for notifications
      await inngest.send({
        name: 'approval.rejected',
        data: {
          entity_id: entityId,
          entity_type: entityType,
          team_id: entity.team_id,
          rejected_by: rejectedBy,
          reason
        }
      });

      logger.info('Entity rejected', {
        entity_id: entityId,
        entity_type: entityType,
        team_id: entity.team_id,
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
   * @param {number} teamId - Team ID
   * @param {string} approvalType - Type of approvals to fetch ('transaction' | 'campaign_confirmation' | 'all')
   * @returns {Promise<Array>} Array of pending approval items
   */
  async getPendingApprovals(teamId, approvalType = 'all') {
    try {
      let results = [];

      if (approvalType === 'transaction' || approvalType === 'all') {
        const transactions = await db('fund_transactions')
          .where({
            team_id: teamId,
            status: 'pending'
          })
          .select('id', 'team_id', 'campaign_id', 'submitted_by', 'amount', 'status', 'bill_image_url', 'transaction_date', 'created_at')
          .orderBy('created_at', 'asc');

        results.push(...transactions.map(t => ({
          ...t,
          entity_type: 'transaction'
        })));
      }

      if (approvalType === 'campaign_confirmation' || approvalType === 'all') {
        const campaigns = await db('campaign_assignments')
          .where({
            'campaign_assignments.team_id': teamId,
            'campaign_assignments.status': 'pending'
          })
          .join('fund_campaigns', 'campaign_assignments.campaign_id', 'fund_campaigns.id')
          .select(
            'campaign_assignments.id',
            'campaign_assignments.campaign_id',
            'campaign_assignments.user_id',
            'campaign_assignments.status',
            'campaign_assignments.created_at',
            'fund_campaigns.name as campaign_name',
            'fund_campaigns.team_id'
          )
          .orderBy('campaign_assignments.created_at', 'asc');

        results.push(...campaigns.map(c => ({
          ...c,
          entity_type: 'campaign_confirmation'
        })));
      }

      logger.info('Fetched pending approvals', {
        team_id: teamId,
        approval_type: approvalType,
        count: results.length
      });

      return results;
    } catch (error) {
      logger.error('Failed to fetch pending approvals', {
        error: error.message,
        team_id: teamId,
        approval_type: approvalType
      });
      throw error;
    }
  }

  /**
   * Map entity type to database table name
   * @private
   * @param {string} entityType - 'transaction' | 'campaign_confirmation'
   * @returns {string} Table name
   */
  _getTableName(entityType) {
    const tableMap = {
      transaction: 'fund_transactions',
      campaign_confirmation: 'campaign_assignments'
    };

    const tableName = tableMap[entityType];
    if (!tableName) {
      throw new Error(`Unknown entity type: ${entityType}`);
    }

    return tableName;
  }
}

module.exports = new ApprovalService();
