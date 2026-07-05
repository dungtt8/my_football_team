const crypto = require('crypto');
const db = require('../config/database');
const logger = require('../utils/logger');
const { handleError } = require('../services/errorService');

const verifyZaloSignature = (body, signature) => {
  const verifyToken = process.env.ZALO_OA_WEBHOOK_VERIFY_TOKEN;
  if (!verifyToken) {
    logger.error('ZALO_OA_WEBHOOK_VERIFY_TOKEN is not configured; rejecting webhook request');
    return false;
  }

  if (!signature || typeof signature !== 'string') {
    return false;
  }

  const hash = crypto
    .createHmac('sha256', verifyToken)
    .update(JSON.stringify(body))
    .digest('hex');

  const hashBuffer = Buffer.from(hash);
  const signatureBuffer = Buffer.from(signature);

  if (hashBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(hashBuffer, signatureBuffer);
};

const zaloWebhookHandler = async (req, res) => {
  try {
    const signature = req.headers['x-zalo-signature'];
    const body = req.body;

    // Verify webhook signature
    if (!verifyZaloSignature(body, signature)) {
      logger.warn('Invalid Zalo webhook signature');
      return res.status(403).json({ error: 'Invalid signature' });
    }

    logger.info('Zalo webhook received', { event: body.event });

    // Route by event type
    switch (body.event) {
      case 'follow':
        await handleFollowEvent(body);
        break;
      case 'unfollow':
        await handleUnfollowEvent(body);
        break;
      case 'message':
        await handleMessageEvent(body);
        break;
      case 'view':
        await handleViewEvent(body);
        break;
      default:
        logger.warn('Unknown Zalo event type', { event: body.event });
    }

    res.json({ success: true });
  } catch (error) {
    return handleError(error, req, res, { endpoint: '/api/zalo/webhook' });
  }
};

const handleFollowEvent = async (event) => {
  const { user_id: zaloUserId, name, avatar } = event;

  logger.info('User followed OA', { zalo_user_id: zaloUserId });

  // Check if user exists (mock for now)
  if (!db || !db.query) {
    logger.info('Database not available, skipping user creation');
    return;
  }

  let user = await db('users')
    .where('zalo_user_id', zaloUserId)
    .first();

  if (!user) {
    logger.info('New follower detected', { zalo_user_id: zaloUserId });
  }
};

const handleUnfollowEvent = async (event) => {
  const { user_id: zaloUserId } = event;

  logger.info('User unfollowed OA', { zalo_user_id: zaloUserId });
};

const handleMessageEvent = async (event) => {
  const { user_id: zaloUserId, message } = event;

  logger.info('Message received from user', {
    zalo_user_id: zaloUserId,
    message_length: message?.text?.length
  });
};

const handleViewEvent = async (event) => {
  const { user_id: zaloUserId } = event;

  logger.info('User viewed OA', { zalo_user_id: zaloUserId });
};

module.exports = zaloWebhookHandler;
