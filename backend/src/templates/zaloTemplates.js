//`Tạo bởi: ${p.created_by}`,
const templates = {
  CAMPAIGN_CREATED: (p) =>
    `QUỸ MỚI: ${p.campaign_name}\n` +
    `Số tiền: ${p.amount_per_member}đ/người\n` +
    `Hạn đóng: ${p.deadline}\n`, 
  

  MEMBER_CONFIRMED_CAMPAIGN: (p) =>
    `${p.member_name} đã xác nhận đóng quỹ ${p.campaign_name}`,

  CAMPAIGN_CHARGED: (p) =>
    `Bạn đã bị trừ ${p.amount}đ cho quỹ ${p.campaign_name}\n` +
    `Mã giao dịch: ${p.transaction_id}`,

  CAMPAIGN_CLOSED_SUMMARY: (p) =>
    `Tổng kết quỹ ${p.campaign_name}\n` +
    `Đã thu: ${p.total_charged}đ\n` +
    `Xác nhận: ${p.members_confirmed} | Từ chối: ${p.members_rejected} | Miễn: ${p.members_exempt}`,

  FUND_UPDATED: (p) =>
    `Số dư quỹ cập nhật: ${p.new_balance}đ (${p.change_amount >= 0 ? '+' : ''}${p.change_amount}đ)\n` +
    `Mã giao dịch: ${p.transaction_id}`,

  TRANSACTION_PENDING_APPROVAL: (p) =>
    `${p.submitter_name} gửi giao dịch ${p.amount}đ đang chờ bạn duyệt\n` +
    `Mã: ${p.transaction_id}`,

  TRANSACTION_APPROVED: (p) =>
    `Giao dịch ${p.amount}đ (mã ${p.transaction_id}) đã được ${p.approved_by} duyệt`,

  TRANSACTION_REJECTED: (p) =>
    `Giao dịch ${p.amount}đ (mã ${p.transaction_id}) bị ${p.rejected_by} từ chối\n` +
    `Lý do: ${p.reason}`,

  SESSION_CREATED: (p) =>
  `Buổi ${p.session_type === 'Training' ? 'tập' : 'thi đấu'} mới\n` +
  `Ngày: ${p.session_date}\n` +
  `Địa điểm: ${p.location}\n\n` +
  `Trả lời "1" nếu THAM GIA\n` +
  `Trả lời "2" nếu KHÔNG THAM GIA`,

  CHECK_IN_SUCCESS: (p) =>
    `Check-in thành công! +${p.points_earned} điểm\n` +
    `Hạng hiện tại: #${p.current_rank}`,

  SESSION_CLOSED_SUMMARY: (p) =>
    `Tổng kết buổi ${p.session_type === 'Training' ? 'tập' : 'thi đấu'}\n` +
    `Có mặt: ${p.attended_count}/${p.total_members} | Vắng: ${p.absent_count}\n` +
    `Trạng thái của bạn: ${p.user_status === 'attended' ? 'Có mặt' : 'Vắng'}`,

    // Thêm vào object templates, cạnh các template khác:
    LEADERBOARD_SUMMARY: (p) => {
    let message = '🏆 BXH Tháng Này\n\n';
    p.topUsers.forEach((user, index) => {
        const medal = ['🥇', '🥈', '🥉'][index] || `${index + 1}.`;
        message += `${medal} ${user.full_name}\n${user.total_points} điểm\n\n`;
    });
    return message;
    },

    FUND_MONTHLY_REMINDER: (p) =>
    `Nhắc nợ quỹ tháng ${p.month}\n\n` +
    `Vui lòng thanh toán trước hết hạn.\n${p.link}`,

    ATTENDANCE_MANUAL_REMINDER: (p) =>
    `NHẮC ĐIỂM DANH\n` +
    `Buổi ${p.session_type === 'Training' ? 'tập' : 'thi đấu'} ngày ${p.session_date}\n` +
    `Địa điểm: ${p.location}\n\n` +
    `Bạn chưa phản hồi tham gia. Trả lời "1" nếu THAM GIA, "2" nếu KHÔNG THAM GIA`,

    CAMPAIGN_PAYMENT_REMINDER: (p) =>
    `NHẮC ĐÓNG QUỸ\n` +
    `Quỹ: ${p.campaign_name}\n` +
    `Số tiền: ${p.amount_per_member}đ/người\n` +
    `Hạn đóng: ${p.deadline}\n\n` +
    `Bạn chưa đóng quỹ này, vui lòng thanh toán sớm.`,

    PASSWORD_RESET_OTP: (p) =>
      `${p.code} là mã đặt lại mật khẩu của bạn \n\n` +
      `KHÔNG CHIA SẺ MÃ NÀY VỚI BẤT KỲ AI.`,
};

function buildTextFromTemplate(templateId, params) {
  const builder = templates[templateId];
  if (!builder) {
    return `[${templateId}] ${JSON.stringify(params)}`; // fallback an toàn
  }
  return builder(params);
}

module.exports = { buildTextFromTemplate };
