const db = require('../config/database');
const inngest = require('../config/inngest');
const zaloService = require('./zaloService');
const logger = require('../utils/logger');

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
      throw error;
    }
  }

  /**
   * Store an internal notification
   * @param {number} userId - User ID
   * @param {string} message - Notification message
   * @param {object} metadata - Additional metadata
   * @returns {Promise<object>} Created notification record
   */
  async sendInternalNotification(userId, message, metadata = {}) {
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

      // Store notification
      const notification = await db('notifications')
        .insert({
          user_id: userId,
          team_id: user.team_id,
          message,
          metadata: JSON.stringify(metadata),
          is_read: false,
          created_at: db.fn.now()
        })
        .returning('*');

      logger.info('Internal notification stored', {
        user_id: userId,
        team_id: user.team_id,
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
