/**
 * Campaign Module Tests
 * Test suite for campaign components and hooks
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CampaignCard } from '@/components/Campaign/CampaignCard'
import { CampaignList } from '@/components/Campaign/CampaignList'
import { CampaignForm } from '@/components/Campaign/CampaignForm'
import { CampaignApprovalQueue } from '@/components/Campaign/CampaignApprovalQueue'
import { CampaignStatsBar } from '@/components/Campaign/CampaignStatsBar'
import { Campaign } from '@/hooks/useCampaign'

// Mock campaign data
const mockCampaign: Campaign = {
  id: '1',
  title: 'Summer Football Tournament',
  description: 'Join our exciting summer tournament with amazing prizes',
  type: 'Event',
  status: 'active',
  startDate: '2026-07-01',
  endDate: '2026-08-31',
  targetAudience: 'All',
  participantCount: 25,
  createdBy: 'John Doe',
  createdDate: '2026-06-22',
  notes: 'Register early to secure your spot',
}

const mockCampaigns: Campaign[] = [
  mockCampaign,
  {
    ...mockCampaign,
    id: '2',
    title: 'Team Building Activity',
    status: 'draft',
    participantCount: 0,
  },
  {
    ...mockCampaign,
    id: '3',
    title: 'Charity Match',
    status: 'ended',
    participantCount: 40,
  },
]

// ============================================
// CAMPAIGN CARD COMPONENT TESTS
// ============================================
describe('CampaignCard Component', () => {
  test('renders campaign info correctly', () => {
    const mockOnClick = jest.fn()
    render(<CampaignCard campaign={mockCampaign} onClick={mockOnClick} />)

    expect(screen.getByText('Summer Football Tournament')).toBeInTheDocument()
    expect(screen.getByText(/Join our exciting summer/)).toBeInTheDocument()
    expect(screen.getByText(/25 participants/)).toBeInTheDocument()
  })

  test('calls onClick handler when clicked', () => {
    const mockOnClick = jest.fn()
    render(<CampaignCard campaign={mockCampaign} onClick={mockOnClick} />)

    const viewButton = screen.getByText('View')
    fireEvent.click(viewButton)

    expect(mockOnClick).toHaveBeenCalledWith('1')
  })
})

// ============================================
// CAMPAIGN LIST COMPONENT TESTS
// ============================================
describe('CampaignList Component', () => {
  test('renders loading state', () => {
    render(
      <CampaignList campaigns={[]} isLoading={true} />
    )

    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  test('renders empty state when no campaigns', () => {
    render(
      <CampaignList campaigns={[]} isLoading={false} emptyMessage="No campaigns found" />
    )

    expect(screen.getByText('No campaigns found')).toBeInTheDocument()
  })

  test('renders campaign list correctly', () => {
    render(
      <CampaignList campaigns={mockCampaigns} isLoading={false} viewMode="grid" />
    )

    expect(screen.getByText('Summer Football Tournament')).toBeInTheDocument()
    expect(screen.getByText('Team Building Activity')).toBeInTheDocument()
    expect(screen.getByText('Charity Match')).toBeInTheDocument()
  })
})

// ============================================
// CAMPAIGN FORM COMPONENT TESTS
// ============================================
describe('CampaignForm Component', () => {
  test('renders all form fields', () => {
    const mockSubmit = jest.fn()
    render(
      <CampaignForm onSubmit={mockSubmit} />
    )

    expect(screen.getByLabelText('Campaign Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByLabelText('Start Date')).toBeInTheDocument()
    expect(screen.getByLabelText('End Date')).toBeInTheDocument()
    expect(screen.getByLabelText('Campaign Type')).toBeInTheDocument()
    expect(screen.getByLabelText('Target Audience')).toBeInTheDocument()
  })

  test('validates title length', async () => {
    const mockSubmit = jest.fn()
    render(
      <CampaignForm onSubmit={mockSubmit} />
    )

    const titleInput = screen.getByLabelText('Campaign Title') as HTMLInputElement
    fireEvent.change(titleInput, { target: { value: 'ab' } })

    const submitButton = screen.getByText('Create Campaign')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Title must be at least 5 characters/)).toBeInTheDocument()
    })
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  test('submits form with valid data', async () => {
    const mockSubmit = jest.fn()
    render(
      <CampaignForm onSubmit={mockSubmit} />
    )

    fireEvent.change(screen.getByLabelText('Campaign Title'), {
      target: { value: 'Summer Tournament' },
    })
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'A great summer tournament for everyone' },
    })
    fireEvent.change(screen.getByLabelText('Start Date'), {
      target: { value: '2026-07-15' },
    })
    fireEvent.change(screen.getByLabelText('End Date'), {
      target: { value: '2026-08-15' },
    })

    const submitButton = screen.getByText('Create Campaign')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Summer Tournament',
          description: 'A great summer tournament for everyone',
        })
      )
    })
  })
})

// ============================================
// CAMPAIGN APPROVAL QUEUE COMPONENT TESTS
// ============================================
describe('CampaignApprovalQueue Component', () => {
  test('renders loading state', () => {
    const mockApprove = jest.fn()
    const mockReject = jest.fn()
    render(
      <CampaignApprovalQueue
        campaigns={[]}
        isLoading={true}
        onApprove={mockApprove}
        onReject={mockReject}
      />
    )

    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  test('calls onApprove when approve button clicked', () => {
    const mockApprove = jest.fn()
    const mockReject = jest.fn()
    const pendingCampaign = {
      ...mockCampaign,
      status: 'pending_approval' as const,
    }

    render(
      <CampaignApprovalQueue
        campaigns={[pendingCampaign]}
        isLoading={false}
        onApprove={mockApprove}
        onReject={mockReject}
      />
    )

    const approveButton = screen.getByText('Approve')
    fireEvent.click(approveButton)

    expect(mockApprove).toHaveBeenCalledWith('1')
  })

  test('calls onReject when reject button clicked', () => {
    const mockApprove = jest.fn()
    const mockReject = jest.fn()
    const pendingCampaign = {
      ...mockCampaign,
      status: 'pending_approval' as const,
    }

    render(
      <CampaignApprovalQueue
        campaigns={[pendingCampaign]}
        isLoading={false}
        onApprove={mockApprove}
        onReject={mockReject}
      />
    )

    const rejectButton = screen.getByText('Reject')
    fireEvent.click(rejectButton)

    // Should show reason input
    expect(screen.getByPlaceholderText('Enter rejection reason')).toBeInTheDocument()
  })
})

// ============================================
// CAMPAIGN STATS COMPONENT TESTS
// ============================================
describe('CampaignStatsBar Component', () => {
  test('renders stats correctly', () => {
    render(
      <CampaignStatsBar
        totalCampaigns={5}
        activeCampaigns={2}
        totalParticipants={150}
        isLoading={false}
      />
    )

    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('Total Campaigns')).toBeInTheDocument()
    expect(screen.getByText('Active Campaigns')).toBeInTheDocument()
    expect(screen.getByText('Total Participants')).toBeInTheDocument()
  })

  test('renders loading state', () => {
    render(
      <CampaignStatsBar
        totalCampaigns={0}
        activeCampaigns={0}
        totalParticipants={0}
        isLoading={true}
      />
    )

    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })
})
