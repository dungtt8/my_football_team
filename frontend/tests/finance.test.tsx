import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { StatsBar } from '@/components/Finance/StatsBar'
import { TransactionList } from '@/components/Finance/TransactionList'
import { TransactionForm } from '@/components/Finance/TransactionForm'
import { ApprovalQueue } from '@/components/Finance/ApprovalQueue'
import { Transaction, Approval } from '@/hooks/useFinance'

// Mock data
const mockTransactions: Transaction[] = [
  {
    id: '1',
    description: 'Team lunch',
    amount: 500000,
    category: 'Food',
    status: 'approved',
    createdAt: '2026-06-22T10:00:00Z',
    submittedBy: 'John Doe',
  },
  {
    id: '2',
    description: 'Equipment purchase',
    amount: 2000000,
    category: 'Equipment',
    status: 'pending',
    createdAt: '2026-06-23T14:30:00Z',
    submittedBy: 'Jane Smith',
  },
]

const mockApprovals: Approval[] = [
  {
    id: '3',
    description: 'Travel costs',
    amount: 1500000,
    submittedBy: 'Mike Johnson',
    createdAt: '2026-06-23T09:15:00Z',
  },
  {
    id: '4',
    description: 'Uniform purchase',
    amount: 3000000,
    submittedBy: 'Sarah Lee',
    createdAt: '2026-06-23T11:45:00Z',
  },
]

describe('Finance Module Components', () => {
  // Test 1: StatsBar displays stats when data loads
  describe('StatsBar Component', () => {
    it('should display loading state initially', () => {
      render(
        <StatsBar
          totalBalance={0}
          monthlySpent={0}
          pendingCount={0}
          isLoading={true}
        />
      )
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should display stats when data is loaded', () => {
      render(
        <StatsBar
          totalBalance={10000000}
          monthlySpent={2500000}
          pendingCount={3}
          isLoading={false}
        />
      )
      expect(screen.getByText('Total Balance')).toBeInTheDocument()
      expect(screen.getByText('Monthly Spent')).toBeInTheDocument()
      expect(screen.getByText('Pending Approvals')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  // Test 2: TransactionList renders list of transactions
  describe('TransactionList Component', () => {
    it('should display loading state when isLoading is true', () => {
      render(
        <TransactionList
          transactions={[]}
          isLoading={true}
          emptyMessage="No transactions"
        />
      )
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should render empty state when no transactions', () => {
      render(
        <TransactionList
          transactions={[]}
          isLoading={false}
          emptyMessage="No transactions found"
        />
      )
      expect(screen.getByText('No transactions found')).toBeInTheDocument()
    })

    it('should render all transactions in the list', () => {
      render(
        <TransactionList
          transactions={mockTransactions}
          isLoading={false}
        />
      )
      expect(screen.getByText('Team lunch')).toBeInTheDocument()
      expect(screen.getByText('Equipment purchase')).toBeInTheDocument()
    })

    it('should call onItemClick when a transaction is clicked', () => {
      const handleClick = jest.fn()
      render(
        <TransactionList
          transactions={mockTransactions}
          isLoading={false}
          onItemClick={handleClick}
        />
      )
      const transactionItems = screen.getAllByText(/Team lunch|Equipment purchase/)
      fireEvent.click(transactionItems[0].closest('.p-lg'))
      expect(handleClick).toHaveBeenCalled()
    })
  })

  // Test 3: TransactionForm validates required fields
  describe('TransactionForm Component', () => {
    it('should render all form fields', () => {
      render(<TransactionForm onSubmit={jest.fn()} />)
      expect(
        screen.getByPlaceholderText('e.g., Team lunch meeting')
      ).toBeInTheDocument()
      expect(screen.getByPlaceholderText('0')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Additional details...')).toBeInTheDocument()
    })

    it('should show validation error for empty description', async () => {
      const handleSubmit = jest.fn()
      render(<TransactionForm onSubmit={handleSubmit} />)

      const submitButton = screen.getByText('Submit Expense')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Description is required')).toBeInTheDocument()
      })
      expect(handleSubmit).not.toHaveBeenCalled()
    })

    it('should show validation error for invalid amount', async () => {
      const handleSubmit = jest.fn()
      render(<TransactionForm onSubmit={handleSubmit} />)

      const descriptionInput = screen.getByPlaceholderText(
        'e.g., Team lunch meeting'
      ) as HTMLInputElement
      fireEvent.change(descriptionInput, { target: { value: 'Valid description' } })

      const amountInput = screen.getByPlaceholderText('0') as HTMLInputElement
      fireEvent.change(amountInput, { target: { value: '0' } })

      const submitButton = screen.getByText('Submit Expense')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText('Amount must be greater than 0')
        ).toBeInTheDocument()
      })
      expect(handleSubmit).not.toHaveBeenCalled()
    })

    it('should call onSubmit with valid form data', async () => {
      const handleSubmit = jest.fn()
      render(<TransactionForm onSubmit={handleSubmit} />)

      const descriptionInput = screen.getByPlaceholderText(
        'e.g., Team lunch meeting'
      ) as HTMLInputElement
      fireEvent.change(descriptionInput, { target: { value: 'Team lunch' } })

      const amountInput = screen.getByPlaceholderText('0') as HTMLInputElement
      fireEvent.change(amountInput, { target: { value: '500000' } })

      const categorySelect = screen.getByDisplayValue(
        'Select a category'
      ) as HTMLSelectElement
      fireEvent.change(categorySelect, { target: { value: 'Food' } })

      const submitButton = screen.getByText('Submit Expense')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            description: 'Team lunch',
            amount: '500000',
            category: 'Food',
          })
        )
      })
    })
  })

  // Test 4: ApprovalQueue shows pending approvals
  describe('ApprovalQueue Component', () => {
    it('should display loading state when isLoading is true', () => {
      render(
        <ApprovalQueue
          approvals={[]}
          isLoading={true}
          onApprove={jest.fn()}
          onReject={jest.fn()}
        />
      )
      expect(screen.getByText('Pending Approvals')).toBeInTheDocument()
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should render empty state when no approvals', () => {
      render(
        <ApprovalQueue
          approvals={[]}
          isLoading={false}
          onApprove={jest.fn()}
          onReject={jest.fn()}
          emptyMessage="No pending approvals"
        />
      )
      expect(screen.getByText('No pending approvals')).toBeInTheDocument()
    })

    it('should render all pending approvals', () => {
      render(
        <ApprovalQueue
          approvals={mockApprovals}
          isLoading={false}
          onApprove={jest.fn()}
          onReject={jest.fn()}
        />
      )
      expect(screen.getByText('Travel costs')).toBeInTheDocument()
      expect(screen.getByText('Uniform purchase')).toBeInTheDocument()
      expect(screen.getByText('2 Pending')).toBeInTheDocument()
    })

    it('should call onApprove when approve button is clicked', async () => {
      const handleApprove = jest.fn()
      render(
        <ApprovalQueue
          approvals={mockApprovals}
          isLoading={false}
          onApprove={handleApprove}
          onReject={jest.fn()}
        />
      )

      const approveButtons = screen.getAllByText('✓ Approve')
      fireEvent.click(approveButtons[0])

      await waitFor(() => {
        expect(handleApprove).toHaveBeenCalledWith('3')
      })
    })

    it('should call onReject when reject button is clicked', async () => {
      const handleReject = jest.fn()
      render(
        <ApprovalQueue
          approvals={mockApprovals}
          isLoading={false}
          onApprove={jest.fn()}
          onReject={handleReject}
        />
      )

      const rejectButtons = screen.getAllByText('✗ Reject')
      fireEvent.click(rejectButtons[0])

      await waitFor(() => {
        expect(handleReject).toHaveBeenCalledWith('3', '')
      })
    })
  })
})
