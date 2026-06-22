const db = require('../../../src/config/database');
const zaloService = require('../../../src/services/zaloService');
const monthlyReminderHandler = require('../../../src/inngest/handlers/monthlyReminder');

jest.mock('../../../src/config/database');
jest.mock('../../../src/services/zaloService');

describe('Monthly Reminder Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should fetch all active teams and send reminders', async () => {
    const mockTeams = [
      { id: 1, name: 'Team A' },
      { id: 2, name: 'Team B' }
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
    expect(zaloService.sendUtilityMessage.mock.calls.length).toBe(4); // 2 teams * 2 members
  });
});
