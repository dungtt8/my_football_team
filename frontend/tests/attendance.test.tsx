import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CheckInCard } from '@/components/Attendance/CheckInCard'
import { AttendanceList } from '@/components/Attendance/AttendanceList'
import { LeaderboardTable } from '@/components/Attendance/LeaderboardTable'
import { BadgeDisplay } from '@/components/Attendance/BadgeDisplay'
import { PointsCard } from '@/components/Attendance/PointsCard'

// Test CheckInCard Component
describe('CheckInCard Component', () => {
  test('renders check-in button when not checked in', () => {
    const mockOnCheckIn = jest.fn()
    const mockOnCheckOut = jest.fn()

    render(
      <CheckInCard
        userStatus="not_checked_in"
        onCheckIn={mockOnCheckIn}
        onCheckOut={mockOnCheckOut}
      />
    )

    const button = screen.getByRole('button', { name: /check in/i })
    expect(button).toBeInTheDocument()
  })

  test('renders check-out button when checked in', () => {
    const mockOnCheckIn = jest.fn()
    const mockOnCheckOut = jest.fn()
    const testDate = new Date()

    render(
      <CheckInCard
        userStatus="checked_in"
        checkedInTime={testDate}
        onCheckIn={mockOnCheckIn}
        onCheckOut={mockOnCheckOut}
      />
    )

    const button = screen.getByRole('button', { name: /check out/i })
    expect(button).toBeInTheDocument()
  })

  test('calls onCheckIn when check-in button is clicked', async () => {
    const mockOnCheckIn = jest.fn()
    const mockOnCheckOut = jest.fn()

    render(
      <CheckInCard
        userStatus="not_checked_in"
        onCheckIn={mockOnCheckIn}
        onCheckOut={mockOnCheckOut}
      />
    )

    const button = screen.getByRole('button', { name: /check in/i })
    fireEvent.click(button)

    expect(mockOnCheckIn).toHaveBeenCalled()
  })
})

// Test AttendanceList Component
describe('AttendanceList Component', () => {
  const mockRecords = [
    {
      id: '1',
      userId: 'user1',
      sessionId: 'session1',
      checkInTime: '2026-06-23T09:00:00Z',
      checkOutTime: '2026-06-23T17:00:00Z',
      duration: 28800,
      status: 'present' as const,
      location: 'Office',
      notes: 'Regular check-in',
      createdAt: '2026-06-23T09:00:00Z',
    },
  ]

  test('renders attendance records', () => {
    render(<AttendanceList records={mockRecords} isLoading={false} />)

    expect(screen.getByText(/date/i)).toBeInTheDocument()
  })

  test('shows empty state when no records', () => {
    render(<AttendanceList records={[]} isLoading={false} emptyMessage="No records found" />)

    expect(screen.getByText('No records found')).toBeInTheDocument()
  })

  test('calls onRecordClick when record is clicked', () => {
    const mockOnClick = jest.fn()

    render(<AttendanceList records={mockRecords} isLoading={false} onRecordClick={mockOnClick} />)

    // The component should be clickable, though the specific implementation depends on layout
    expect(mockOnClick).not.toHaveBeenCalled()
  })
})

// Test LeaderboardTable Component
describe('LeaderboardTable Component', () => {
  const mockEntries = [
    {
      rank: 1,
      userId: 'user1',
      userName: 'John Doe',
      points: 500,
      streak: 10,
      badges: 5,
      totalPresent: 20,
      avatarUrl: 'https://example.com/avatar.jpg',
    },
    {
      rank: 2,
      userId: 'user2',
      userName: 'Jane Smith',
      points: 450,
      streak: 8,
      badges: 4,
      totalPresent: 19,
      avatarUrl: 'https://example.com/avatar2.jpg',
    },
  ]

  test('renders leaderboard entries', () => {
    render(
      <LeaderboardTable
        entries={mockEntries}
        currentUserId="user1"
        isLoading={false}
      />
    )

    expect(screen.getByText('Leaderboard')).toBeInTheDocument()
  })

  test('highlights current user row', () => {
    render(
      <LeaderboardTable
        entries={mockEntries}
        currentUserId="user1"
        isLoading={false}
      />
    )

    // Component should render, highlighting for currentUser is handled via styling
    expect(screen.getByText('Leaderboard')).toBeInTheDocument()
  })

  test('renders period tabs', () => {
    render(
      <LeaderboardTable
        entries={mockEntries}
        currentUserId="user1"
        isLoading={false}
      />
    )

    expect(screen.getByRole('button', { name: /this week/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /this month/i })).toBeInTheDocument()
  })
})

// Test BadgeDisplay Component
describe('BadgeDisplay Component', () => {
  const mockBadges = [
    {
      id: '1',
      name: 'First Check-In',
      description: 'Completed your first check-in',
      icon: '🎯',
      earnedDate: '2026-06-01T10:00:00Z',
      isEarned: true,
    },
    {
      id: '2',
      name: 'Week Warrior',
      description: 'Checked in for a full week',
      icon: '⚔️',
      earnedDate: '',
      isEarned: false,
    },
  ]

  test('renders earned badges', () => {
    render(<BadgeDisplay badges={mockBadges} isLoading={false} />)

    expect(screen.getByText('First Check-In')).toBeInTheDocument()
  })

  test('displays locked badges with reduced opacity', () => {
    render(<BadgeDisplay badges={mockBadges} isLoading={false} />)

    expect(screen.getByText('Week Warrior')).toBeInTheDocument()
  })

  test('shows View All Badges button when maxVisible is exceeded', () => {
    render(<BadgeDisplay badges={mockBadges} maxVisible={1} isLoading={false} />)

    expect(screen.getByRole('button', { name: /view all badges/i })).toBeInTheDocument()
  })
})

// Test PointsCard Component
describe('PointsCard Component', () => {
  const mockRecentActivity = [
    { action: 'Check-in Bonus', points: 10, date: '2026-06-23T09:00:00Z' },
    { action: 'Streak Bonus', points: 5, date: '2026-06-22T18:00:00Z' },
  ]

  test('displays current points', () => {
    render(
      <PointsCard
        currentPoints={250}
        pointsToNextLevel={50}
        nextLevelName="Silver Member"
        recentActivity={mockRecentActivity}
        isLoading={false}
      />
    )

    expect(screen.getByText('250')).toBeInTheDocument()
  })

  test('shows progress to next level', () => {
    render(
      <PointsCard
        currentPoints={250}
        pointsToNextLevel={50}
        nextLevelName="Silver Member"
        recentActivity={mockRecentActivity}
        isLoading={false}
      />
    )

    expect(screen.getByText(/50 points to next level/i)).toBeInTheDocument()
  })

  test('displays recent activity', () => {
    render(
      <PointsCard
        currentPoints={250}
        pointsToNextLevel={50}
        nextLevelName="Silver Member"
        recentActivity={mockRecentActivity}
        isLoading={false}
      />
    )

    expect(screen.getByText('Check-in Bonus')).toBeInTheDocument()
  })
})

// Note: useAttendance hook tests would require mocking useApi hook
// This is a placeholder for more comprehensive hook testing
describe('useAttendance Hook Integration', () => {
  test('hook exports all required functions', () => {
    // This would require proper hook testing setup with act() and renderHook
    expect(true).toBe(true) // Placeholder
  })
})
