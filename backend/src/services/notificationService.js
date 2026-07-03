const db = require('../config/database');
const inngest = require('../config/inngest');
const zaloService = require('./zaloService');
const logger = require('../utils/logger');
const { getTeamUsers } = require('../utils/teamUsers');

class NotificationService {
  /**
   * Send a Zalo message using template
   * @param {string} zaloUserId - Zalo user ID
   * @param {string} templateId - Zalo template ID
   * @param {object} params - Template parameters
   * @returns {Promise<object>} Response from Zalo API
   */
  async sendZaloMessage(zaloUserId, templateId, params) {
    try {
      // Verify user exists with zaloUserId
      const user = await db('users')
        .where('zalo_user_id', zaloUserId)
        .first();

      if (!user) {
        const error = `User with zaloUserId ${zaloUserId} not found`;
        logger.warn('Zalo message send failed', {
          zalo_user_id: zaloUserId,
          template_id: templateId,
          reason: error
        });
        throw new Error(error);
      }

      // Send ZNS message via Zalo service
      const response = await zaloService.sendZNS(zaloUserId, templateId, params);

      logger.info('Zalo message queued successfully', {
        zalo_user_id: zaloUserId,
        template_id: templateId,
        user_id: user.id
      });

      return response;
    } catch (error) {
      logger.error('Failed to send Zalo message', {
        zalo_user_id: zaloUserId,
        template_id: templateId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Emit an event to Inngest
   * @param {string} eventName - Event name
   * @param {object} data - Event data
   * @returns {Promise<object>} Event send response
   */
  async emitEvent(eventName, data) {
    try {
      const response = await inngest.send({
        name: eventName,
        data
      });

      logger.info('Event emitted to Inngest', {
        event_name: eventName,
        event_id: response.ids ? response.ids[0] : null
      });

      return response;
    } catch (error) {
      logger.error('Failed to emit event to Inngest', {
        event_name: eventName,
        error: error.message
      });
      // Do not throw — Inngest events are fire-and-forget side effects.
      // Missing INNGEST_EVENT_KEY or network issues should not break the caller.
      return null;
    }
  }

  /**
   * Store an internal notification
   * @param {number} userId - User ID
   * @param {string} message - Notification message
   * @param {object} metadata - Additional metadata
   * @param {number} [teamId] - Team ID (required by the notifications table;
   *   `users` has no team_id column, so this must be passed in by the caller —
   *   it's looked up via team_members as a fallback if omitted)
   * @returns {Promise<object>} Created notification record
   */
  async sendInternalNotification(userId, message, metadata = {}, teamId = null) {
    try {
      // Verify user exists
      const user = await db('users')
        .where('id', userId)
        .first();

      if (!user) {
        const error = `User with ID ${userId} not found`;
        logger.warn('Internal notification send failed', {
          user_id: userId,
          reason: error
        });
        throw new Error(error);
      }

      let resolvedTeamId = teamId;
      if (!resolvedTeamId) {
        const membership = await db('team_members')
          .where('user_id', userId)
          .where('status', 'active')
          .first();
        resolvedTeamId = membership?.team_id;
      }

      if (!resolvedTeamId) {
        throw new Error(`Could not resolve team_id for user ${userId}`);
      }

      // Store notification
      const notification = await db('notifications')
        .insert({
          user_id: userId,
          team_id: resolvedTeamId,
          message,
          metadata: JSON.stringify(metadata),
          is_read: false,
          created_at: db.fn.now()
        })
        .returning('*');

      logger.info('Internal notification stored', {
        user_id: userId,
        team_id: resolvedTeamId,
        notification_id: notification[0].id
      });

      return notification[0];
    } catch (error) {
      logger.error('Failed to store internal notification', {
        user_id: userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Broadcast an internal notification to every active member of a team.
   * @param {object} notification
   * @param {number} notification.team_id
   * @param {string} notification.message
   * @param {object} [notification.data]
   * @returns {Promise<{successful: number, failed: number}>}
   */
  async broadcastNotification(notification) {
    const { team_id, message, title, data } = notification;
    const results = { successful: 0, failed: 0 };

    if (!team_id || !message) {
      throw new Error('broadcastNotification requires team_id and message');
    }

    const members = await getTeamUsers(team_id, { status: 'active' });

    for (const member of members) {
      try {
        await this.sendInternalNotification(
          member.id,
          title ? `${title}: ${message}` : message,
          data || {},
          team_id
        );
        results.successful++;
      } catch (error) {
        results.failed++;
        logger.error('Failed to broadcast notification to member', {
          team_id,
          user_id: member.id,
          error: error.message
        });
      }
    }

    logger.info('Broadcast notification completed', {
      team_id,
      successful: results.successful,
      failed: results.failed
    });

    return results;
  }

  /**
   * Send Zalo messages to multiple users
   * @param {array} userIds - Array of Zalo user IDs
   * @param {string} templateId - Zalo template ID
   * @param {object} params - Template parameters
   * @returns {Promise<object>} Results of batch send
   */
  async sendBatchNotifications(userIds, templateId, params) {
    const results = {
      successful: [],
      failed: []
    };

    try {
      // Verify all users exist with zaloUserIds
      const users = await db('users')
        .whereIn('zalo_user_id', userIds)
        .select('id', 'zalo_user_id');

      const foundUserIds = new Set(users.map(u => u.zalo_user_id));
      const missingUserIds = userIds.filter(id => !foundUserIds.has(id));

      if (missingUserIds.length > 0) {
        logger.warn('Some users not found for batch notification', {
          missing_zalo_user_ids: missingUserIds,
          template_id: templateId
        });
      }

      // Send to each user
      for (const zaloUserId of userIds) {
        try {
          if (!foundUserIds.has(zaloUserId)) {
            results.failed.push({
              zalo_user_id: zaloUserId,
              error: 'User not found'
            });
            continue;
          }

          const response = await zaloService.sendZNS(zaloUserId, templateId, params);
          results.successful.push({
            zalo_user_id: zaloUserId,
            response
          });

          logger.info('Batch notification sent to user', {
            zalo_user_id: zaloUserId,
            template_id: templateId
          });
        } catch (error) {
          results.failed.push({
            zalo_user_id: zaloUserId,
            error: error.message
          });

          logger.error('Failed to send batch notification to user', {
            zalo_user_id: zaloUserId,
            template_id: templateId,
            error: error.message
          });
        }
      }

      logger.info('Batch notification completed', {
        total: userIds.length,
        successful: results.successful.length,
        failed: results.failed.length,
        template_id: templateId
      });

      return results;
    } catch (error) {
      logger.error('Batch notification process failed', {
        user_ids_count: userIds.length,
        template_id: templateId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new NotificationService();
