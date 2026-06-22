const BASE_URL = process.env.FRONTEND_URL || 'https://myteam.revonexus.net';

const deepLinks = {
  fundCampaign: (campaignId, action = 'view') => {
    return `${BASE_URL}/fund/campaign/${campaignId}?action=${action}`;
  },

  fundPage: () => {
    return `${BASE_URL}/fund`;
  },

  attendanceSession: (sessionId) => {
    return `${BASE_URL}/attendance/session/${sessionId}`;
  },

  attendancePage: () => {
    return `${BASE_URL}/attendance`;
  },

  campaignPay: (campaignId) => {
    return `${BASE_URL}/fund/campaign/${campaignId}?action=pay`;
  }
};

module.exports = deepLinks;
