const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/database');
const notificationService = require('../services/notificationService');
const { handleError, ValidationError, AuthenticationError } = require('../services/errorService');
const logger = require('../utils/logger');

const OTP_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.startsWith('84') ? `0${digits.slice(2)}` : digits;
};

const findActiveUserByPhone = (database, normalizedPhone) => {
  const phoneDigitsSql = "regexp_replace(phone, '[^0-9]', '', 'g')";
  const normalizedPhoneSql = `CASE
    WHEN ${phoneDigitsSql} LIKE '84%' THEN '0' || substring(${phoneDigitsSql} from 3)
    ELSE ${phoneDigitsSql}
  END`;

  return database('users')
    .where({ status: 'active' })
    .whereNull('deleted_at')
    .whereRaw(`${normalizedPhoneSql} = ?`, [normalizedPhone])
    .first();
};

const clearStoredReset = async (userId) => {
  await db('password_reset_code')
    .where({ user_id: userId })
    .whereNull('consumed_at')
    .update({ consumed_at: db.fn.now() });
};

const verifyResetCode = async (database, userId, code) => {
  const reset = await database('password_reset_code')
    .where({ user_id: userId })
    .whereNull('consumed_at')
    .where('expires_at', '>', database.fn.now())
    .orderBy('created_at', 'desc')
    .first()
    .forUpdate();

  if (!reset || reset.attempts >= MAX_ATTEMPTS) {
    return { status: 'expired' };
  }

  const isCodeValid = await bcrypt.compare(code, reset.code_hash);
  if (!isCodeValid) {
    await database('password_reset_code').where({ id: reset.id }).increment('attempts', 1);
    return { status: 'invalid' };
  }

  return { status: 'valid', reset };
};

const throwResetCodeError = (status) => {
  if (status === 'invalid') throw new AuthenticationError('Mã xác nhận không đúng');
  throw new AuthenticationError('Mã xác nhận không hợp lệ hoặc đã hết hạn');
};

const requestPasswordResetHandler = async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    if (!/^0\d{9}$/.test(phone)) {
      throw new ValidationError('Số điện thoại không hợp lệ');
    }

    const user = await findActiveUserByPhone(db, phone);

    if (!user) {
      return res.status(404).json({
        sent: false,
        error: 'Không tìm thấy tài khoản với số điện thoại này!'
      });
    }

    if (!user.zalo_user_id) {
      return res.status(400).json({
        sent: false,
        error: 'Tài khoản chưa liên kết Zalo!'
      });
    }

    const latestRequest = await db('password_reset_code')
      .where({ user_id: user.id })
      .orderBy('created_at', 'desc')
      .first();

    if (latestRequest && Date.now() - new Date(latestRequest.created_at).getTime() < RESEND_COOLDOWN_SECONDS * 1000) {
      return res.status(429).json({ error: 'Vui lòng đợi 60 giây trước khi yêu cầu mã mới' });
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    const code_hash = await bcrypt.hash(code, 10);
    const expires_at = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await clearStoredReset(user.id);
    await db('password_reset_code').insert({ user_id: user.id, code_hash, expires_at });

    const event = await notificationService.emitEvent('auth.password-reset-requested', {
      user_id: user.id,
      zalo_user_id: user.zalo_user_id,
      code,
      expires_in_minutes: OTP_TTL_MINUTES,
    });

    if (!event) {
      await clearStoredReset(user.id);
      throw new Error('Không thể gửi mã xác nhận');
    }

    logger.info('Password reset code requested', { user_id: user.id });
    return res.json({ sent: true, message: 'Mã xác nhận đã được gửi đến Zalo của bạn' });
  } catch (error) {
    return handleError(error, req, res, { endpoint: '/auth/password-reset/request' });
  }
};

const verifyPasswordResetCodeHandler = async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const code = String(req.body.code || '').trim();

    if (!/^0\d{9}$/.test(phone)) throw new ValidationError('Số điện thoại không hợp lệ');
    if (!/^\d{6}$/.test(code)) throw new ValidationError('Mã xác nhận phải gồm 6 chữ số');

    const result = await db.transaction(async (trx) => {
      const user = await findActiveUserByPhone(trx, phone).forUpdate();
      if (!user) return { status: 'expired' };
      return verifyResetCode(trx, user.id, code);
    });

    if (result.status !== 'valid') throwResetCodeError(result.status);

    return res.json({ verified: true, message: 'Mã xác nhận hợp lệ' });
  } catch (error) {
    return handleError(error, req, res, { endpoint: '/auth/password-reset/verify' });
  }
};

const confirmPasswordResetHandler = async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const code = String(req.body.code || '').trim();
    const newPassword = String(req.body.new_password || '');
    const newPasswordConfirm = String(req.body.new_password_confirm || '');

    if (!/^0\d{9}$/.test(phone)) throw new ValidationError('Số điện thoại không hợp lệ');
    if (!/^\d{6}$/.test(code)) throw new ValidationError('Mã xác nhận phải gồm 6 chữ số');
    if (newPassword.length < 8) throw new ValidationError('Mật khẩu mới phải có ít nhất 8 ký tự');
    if (newPassword !== newPasswordConfirm) throw new ValidationError('Mật khẩu xác nhận không khớp');

    const result = await db.transaction(async (trx) => {
      const user = await findActiveUserByPhone(trx, phone).forUpdate();
      if (!user) return { status: 'expired' };

      const verification = await verifyResetCode(trx, user.id, code);
      if (verification.status !== 'valid') return verification;

      const isSamePassword = await bcrypt.compare(newPassword, user.password_hash || '');
      if (isSamePassword) return { status: 'same_password' };

      const password_hash = await bcrypt.hash(newPassword, 10);
      await trx('users').where({ id: user.id }).update({ password_hash });
      await trx('password_reset_code').where({ id: verification.reset.id }).update({ consumed_at: trx.fn.now() });
      return { status: 'completed' };
    });

    if (result.status === 'same_password') {
      throw new ValidationError('Mật khẩu mới phải khác mật khẩu hiện tại');
    }
    if (result.status !== 'completed') throwResetCodeError(result.status);

    logger.info('Password reset completed', { phone: phone.slice(0, 7) + '****' });
    return res.json({ message: 'Đổi mật khẩu thành công. Hãy đăng nhập bằng mật khẩu mới' });
  } catch (error) {
    return handleError(error, req, res, { endpoint: '/auth/password-reset/confirm' });
  }
};

module.exports = {
  requestPasswordResetHandler,
  verifyPasswordResetCodeHandler,
  confirmPasswordResetHandler
};
