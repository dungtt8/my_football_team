const inngest = require('../../config/inngest');
const notificationService = require('../../services/notificationService');
const logger = require('../../utils/logger');

const onPasswordResetRequestedHandler = inngest.createFunction(
  { id: 'auth.password-reset-requested', retryOptions: { maxRetries: 2, initialDelayMs: 5000 } },
  { event: 'auth.password-reset-requested' },
  async ({ event, step }) => {
    const { user_id, zalo_user_id, code, expires_in_minutes } = event.data;

    await step.run('send-zalo-reset-code', async () => {
      await notificationService.sendZaloMessage(zalo_user_id, 'PASSWORD_RESET_OTP', {
        code,
        expires_in_minutes,
      });
    });

    logger.info('Password reset code sent through Zalo', { user_id });
    return { user_id, status: 'sent' };
  }
);

module.exports = { onPasswordResetRequestedHandler };
