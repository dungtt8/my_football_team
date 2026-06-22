const db = require('../../../src/config/database');
const zaloService = require('../../../src/services/zaloService');
const gamificationService = require('../../../src/services/gamificationService');
const monthlyReminderHandler = require('../../../src/inngest/handlers/monthlyReminder');

jest.mock('../../../src/config/database');
jest.mock('../../../src/services/zaloService');
jest.mock('../../../src/services/gamificationService');

describe('Monthly Reminder Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should archive leaderboards and send leaderboard summaries', async () => {
    const mockTeams = [
      { id: 1, name: 'Team A' },
      { id: 2, name: 'Team B' }
    ];

    const mockLeaderboard = [
      { id: 1, full_name: 'Player 1', total_points: 100 },
      { id: 2, full_name: 'Player 2', total_points: 80 },
      { id: 3, full_name: 'Player 3', total_points: 60 }
    ];

    const mockMembers = [
      { id: 1, zalo_user_id: 'zuid-001', full_name: 'Player 1' },
      { id: 2, zalo_user_id: 'zuid-002', full_name: 'Player 2' }
    ];

    // Mock the query builder pattern: db('table').where(...).select(...)
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue(mockMembers)
    };

    db.mockImplementation(() => queryBuilder);
    db.query = jest.fn();

    gamificationService.archiveMonthlyLeaderboard.mockResolvedValue({
      top_3_users: mockLeaderboard.slice(0, 3)
    });

    gamificationService.getLeaderboard.mockResolvedValue(mockLeaderboard);

    zaloService.sendUtilityMessage.mockResolvedValue({ success: true });

    // Simulate step.run function
    let teamsFetched = false;
    const mockStep = {
      run: jest.fn((id, fn) => {
        if (id === 'fetch-teams' && !teamsFetched) {
          teamsFetched = true;
          return Promise.resolve(mockTeams);
        }
        return fn();
      })
    };

    const result = await monthlyReminderHandler.logic({ step: mockStep });

    expect(result.processed).toBe(2); // 2 teams
    expect(result.archived).toBe(2); // 2 leaderboards archived
    expect(gamificationService.archiveMonthlyLeaderboard).toHaveBeenCalledTimes(2);
    expect(gamificationService.getLeaderboard).toHaveBeenCalledTimes(2);
  });
});
