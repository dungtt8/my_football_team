const BASE_URL = process.env.FRONTEND_URL || 'https://myteam.revonexus.net';

export const deepLinks = {
  fundCampaign: (campaignId: string | number, action = 'view') =>
    `${BASE_URL}/fund/campaign/${campaignId}?action=${action}`,
  fundPage: () => `${BASE_URL}/fund`,
  attendanceSession: (sessionId: string | number) =>
    `${BASE_URL}/attendance/session/${sessionId}`,
  attendancePage: () => `${BASE_URL}/attendance`,
  campaignPay: (campaignId: string | number) =>
    `${BASE_URL}/fund/campaign/${campaignId}?action=pay`,
};

export default deepLinks;
