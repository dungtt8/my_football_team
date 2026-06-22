# Phase 2 Frontend Implementation Plan
## Finance, Campaign, Attendance Modules + PWA

**Date:** 2026-06-22  
**Design Spec:** [2026-06-22-phase2-frontend-design.md](../specs/2026-06-22-phase2-frontend-design.md)  
**Target:** Mobile-first PWA with bottom tab navigation  
**Estimated Duration:** 4 weeks (parallel work possible)

---

## 📋 FILE STRUCTURE

```
frontend/
├── app/
│   ├── layout.tsx                    # Root layout (adds global styles)
│   ├── page.tsx                      # Landing (redirect to /app/finance)
│   ├── app/
│   │   ├── layout.tsx                # APP LAYOUT (header + tabs + content wrapper)
│   │   ├── finance/
│   │   │   ├── page.tsx              # Finance dashboard (list view)
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Transaction detail view
│   │   ├── campaigns/
│   │   │   ├── page.tsx              # Campaigns dashboard
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Campaign detail view
│   │   └── attendance/
│   │       ├── page.tsx              # Attendance hub (check-in, leaderboard)
│   │       └── [id]/
│   │           └── page.tsx          # Session detail view
│
├── components/
│   ├── Layout/
│   │   ├── AppHeader.tsx             # Top header with team branding
│   │   ├── BottomTabBar.tsx          # Bottom tab navigation (4 tabs)
│   │   └── AppLayout.tsx             # Wrapper combining header + tabs
│   │
│   ├── Common/
│   │   ├── Button.tsx                # Primary button component
│   │   ├── Card.tsx                  # Card container (1px border, 8px radius)
│   │   ├── Badge.tsx                 # Status badges (pill-shaped)
│   │   ├── EmptyState.tsx            # Empty state message
│   │   ├── LoadingSkeletons.tsx      # Skeleton placeholders
│   │   └── Toast.tsx                 # Toast notifications
│   │
│   ├── Finance/
│   │   ├── TransactionList.tsx       # List of transactions with infinite scroll
│   │   ├── TransactionItem.tsx       # Single transaction row
│   │   ├── TransactionForm.tsx       # Form to submit transaction (modal/sheet)
│   │   ├── StatsBar.tsx              # 3 stat cards (pending, approved, balance)
│   │   ├── ApprovalQueue.tsx         # Co-manager: pending approvals
│   │   └── ApprovalItem.tsx          # Single approval card with buttons
│   │
│   ├── Campaign/
│   │   ├── CampaignGrid.tsx          # Bento grid of campaigns (asymmetric)
│   │   ├── CampaignCard.tsx          # Single campaign card
│   │   ├── CampaignForm.tsx          # Form to create campaign
│   │   ├── MemberConfirmations.tsx   # "My Confirmations" section (for members)
│   │   ├── ConfirmationCard.tsx      # Single confirmation card
│   │   ├── ApprovalCards.tsx         # Co-manager: pending approvals
│   │   ├── CampaignDetail.tsx        # Campaign detail view with assignments
│   │   └── MemberAssignmentList.tsx  # Table of members + status
│   │
│   └── Attendance/
│       ├── LeaderboardHero.tsx       # Top 3 + Your Rank section
│       ├── CheckInCard.tsx           # Today's session + quick check-in button
│       ├── LeaderboardTable.tsx      # Full rankings table (scrollable)
│       ├── SessionList.tsx           # Upcoming and past sessions
│       ├── UserStatsCard.tsx         # Personal stats (rank, points, %)
│       ├── MonthSelector.tsx         # Month selector for historical leaderboards
│       └── SessionForm.tsx           # Form to create session (co-manager)
│
├── hooks/
│   ├── useFinance.ts                 # Finance API hooks (list, detail, submit, approve, reject)
│   ├── useCampaigns.ts               # Campaign API hooks (list, detail, create, confirm, approve)
│   ├── useAttendance.ts              # Attendance API hooks (sessions, check-in, leaderboard)
│   ├── useAuth.ts                    # Auth context (user, team, role)
│   ├── useApi.ts                     # Generic API fetch with auth + error handling
│   └── useInfiniteScroll.ts          # Infinite scroll utility
│
├── lib/
│   ├── api.ts                        # API client base (fetch + auth header)
│   ├── constants.ts                  # Design tokens (colors, spacing)
│   ├── utils.ts                      # General utilities (date formatting, etc.)
│   └── validators.ts                 # Form validation schemas (Zod)
│
├── contexts/
│   ├── AuthContext.tsx               # Auth provider (user, team, role)
│   └── ToastContext.tsx              # Toast notification provider
│
├── styles/
│   ├── globals.css                   # Global styles, design tokens
│   ├── variables.css                 # CSS custom properties (colors, fonts)
│   └── components.css                # Reusable component styles
│
├── public/
│   ├── manifest.json                 # PWA manifest with shortcuts
│   ├── robots.txt
│   └── icons/
│       ├── icon-192.png
│       ├── icon-512.png
│       ├── shortcut-checkin-192.png
│       ├── shortcut-expense-192.png
│       ├── shortcut-leaderboard-192.png
│       └── shortcut-campaign-192.png
│
├── .env.local                        # API_BASE_URL, etc.
├── next.config.ts                    # PWA config (next-pwa)
├── tsconfig.json                     # TypeScript config
├── tailwind.config.ts                # Tailwind (custom theme)
└── package.json                      # Dependencies
```

---

## 🎯 IMPLEMENTATION PHASES

### **PHASE 1A: PROJECT SETUP & INFRASTRUCTURE (Week 1, Days 1-2)**

#### Task 1.1: Setup Next.js with Tailwind + TypeScript
- [ ] Remove default pages (`app/page.tsx` template code)
- [ ] Configure Tailwind with custom theme (colors, fonts)
- [ ] Create `lib/constants.ts` with design tokens (palette, spacing)
- [ ] Create `styles/globals.css` with base styles (typography, reset)
- [ ] Verify Tailwind compiles correctly
- [ ] **Commit:** `setup: configure tailwind and design tokens`

#### Task 1.2: Setup PWA + Manifest
- [ ] Install `next-pwa`
- [ ] Create `public/manifest.json` with PWA metadata + 4 shortcuts
- [ ] Create app icons (192x192, 512x512) or use placeholders
- [ ] Create shortcut icons (192x192) for 4 quick actions
- [ ] Configure `next.config.ts` with PWA plugin
- [ ] Test: `npm run build` builds PWA
- [ ] **Commit:** `setup: add PWA support with shortcuts`

#### Task 1.3: Setup API Client + Auth Context
- [ ] Create `lib/api.ts` - Base API client with fetch + auth header injection
- [ ] Create `contexts/AuthContext.tsx` - Auth provider (reads JWT from localStorage)
- [ ] Create `hooks/useAuth.ts` - Hook to access auth context
- [ ] Create `hooks/useApi.ts` - Generic hook for API calls with auth + error handling
- [ ] Test: Verify auth header is injected on API calls
- [ ] **Commit:** `setup: add API client and auth context`

#### Task 1.4: Create Design System Components
- [ ] Create `components/Common/Button.tsx` (solid black, 4px radius, hover state)
- [ ] Create `components/Common/Card.tsx` (1px border #EAEAEA, 8px radius, 24px padding)
- [ ] Create `components/Common/Badge.tsx` (pill-shaped, 4 color variants)
- [ ] Create `components/Common/EmptyState.tsx` (centered text + optional action)
- [ ] Create `components/Common/LoadingSkeletons.tsx` (flat skeleton placeholders)
- [ ] Create `components/Common/Toast.tsx` (simple toast with auto-dismiss)
- [ ] Test: Render all components, verify colors and spacing
- [ ] **Commit:** `feat: add core design system components`

---

### **PHASE 1B: LAYOUT & NAVIGATION (Week 1, Days 3-4)**

#### Task 1.5: Create App Layout with Bottom Tabs
- [ ] Create `components/Layout/AppHeader.tsx`
  - Team logo (placeholder)
  - Team name
  - Optional menu icon (link to settings)
  - Fixed at top, white background
- [ ] Create `components/Layout/BottomTabBar.tsx`
  - 4 tabs: Finance, Campaigns, Attendance, Menu
  - Icons from Phosphor (bold weight)
  - Active tab: black text + underline
  - Inactive: gray text
  - Fixed at bottom on mobile
- [ ] Create `components/Layout/AppLayout.tsx`
  - Wrapper: Header + Content Area + Bottom Tab Bar
  - Content area has padding for tab bar (pb-20 on mobile)
- [ ] Test: Render layout, verify header/tabs fixed on scroll
- [ ] **Commit:** `feat: add app layout with bottom tab navigation`

#### Task 1.6: Create Page Structure + Routing
- [ ] Update `app/page.tsx` to redirect to `/app/finance` (temporary)
- [ ] Create `app/app/layout.tsx` that wraps with `<AppLayout>`
- [ ] Create `app/app/finance/page.tsx` (empty, placeholder)
- [ ] Create `app/app/campaigns/page.tsx` (empty, placeholder)
- [ ] Create `app/app/attendance/page.tsx` (empty, placeholder)
- [ ] Test: Navigate between pages via URL, verify tab bar highlights correct tab
- [ ] **Commit:** `feat: add app routing structure`

#### Task 1.7: Create Toast Context + Provider
- [ ] Create `contexts/ToastContext.tsx` with provider
- [ ] Create hook `useToast()` for triggering notifications
- [ ] Add `<ToastProvider>` to `app/layout.tsx`
- [ ] Test: Call toast from a component, verify it shows + dismisses
- [ ] **Commit:** `feat: add toast notification system`

---

### **PHASE 2: FINANCE MODULE (Week 1-2, Days 5-10)**

#### Task 2.1: Create Finance Hooks
- [ ] Create `hooks/useFinance.ts` with:
  - `useTransactions()` - GET list with pagination
  - `useTransactionDetail(id)` - GET single
  - `useSubmitTransaction()` - POST new
  - `useApproveTransaction()` - PATCH approve
  - `useRejectTransaction()` - PATCH reject
  - `usePendingApprovals()` - GET pending (co-manager)
  - `useBalance()` - GET balance
- [ ] Use `useApi()` hook for all calls
- [ ] Add error + loading states
- [ ] Test: Mock API responses, verify hooks return correct data
- [ ] **Commit:** `feat: add finance hooks`

#### Task 2.2: Create Finance Components (Part 1)
- [ ] Create `components/Finance/StatsBar.tsx`
  - 3 cards: Pending, Approved, Balance
  - Call `useBalance()` + `usePendingApprovals()`
  - Show loading skeleton while fetching
- [ ] Create `components/Finance/TransactionItem.tsx`
  - Row layout: Date | Amount | Status Badge | Click handler
  - Props: transaction object + onTap callback
  - Status badge color based on transaction.status
- [ ] Create `components/Finance/TransactionList.tsx`
  - Call `useTransactions()`
  - Render list of `<TransactionItem>`
  - Pull-to-refresh support
  - Infinite scroll (load more button)
  - Empty state if no transactions
- [ ] Test: Render list, verify items display correctly
- [ ] **Commit:** `feat: add finance transaction list components`

#### Task 2.3: Create Finance Form Component
- [ ] Create `components/Finance/TransactionForm.tsx`
  - Form fields: amount, description, bill image (optional), date (optional)
  - Form state: React Hook Form
  - Validation: Zod (amount > 0, description length)
  - Submit: `useSubmitTransaction()`
  - Loading: Button disabled while submitting
  - Success: Toast notification + close form
  - Error: Show validation errors inline
- [ ] Test: Fill form, submit, verify API call made
- [ ] **Commit:** `feat: add transaction form component`

#### Task 2.4: Create Finance Approval Components (Co-manager)
- [ ] Create `components/Finance/ApprovalItem.tsx`
  - Card: Transaction summary + [Approve] [Reject] buttons
  - Props: transaction + onApprove + onReject callbacks
  - Loading state for buttons
- [ ] Create `components/Finance/ApprovalQueue.tsx`
  - Call `usePendingApprovals()`
  - Render list of `<ApprovalItem>`
  - Only visible if user role is co_manager or owner
  - Empty state if no pending
- [ ] Test: Mock pending approvals, verify render + button handlers
- [ ] **Commit:** `feat: add finance approval components`

#### Task 2.5: Finance Dashboard Page
- [ ] Update `app/app/finance/page.tsx`
  - Import: `StatsBar`, `TransactionList`, `ApprovalQueue`
  - Layout:
    ```
    [Header: Finance] [+ Button]
    [StatsBar]
    [CTA: Submit Transaction button]
    [TransactionList]
    [ApprovalQueue] (if co-manager)
    ```
  - [+ Button] opens `TransactionForm` in modal/sheet
  - [Submit Transaction CTA] opens same modal
- [ ] Create modal/sheet component (simple backdrop + container)
- [ ] Test: Render page, verify all sections show, modals open/close
- [ ] **Commit:** `feat: build finance dashboard page`

#### Task 2.6: Finance Detail Page
- [ ] Create `app/app/finance/[id]/page.tsx`
  - Call `useTransactionDetail(id)`
  - Show full transaction details
  - If user is co-manager AND status is pending: show [Approve] [Reject] buttons
  - Back button to return to list
- [ ] Test: Navigate to detail, verify data loads + buttons work
- [ ] **Commit:** `feat: add finance transaction detail page`

#### Task 2.7: Finance Module Testing + Polish
- [ ] Write basic tests for hooks (mock API responses)
- [ ] Test form validation (submit with invalid data)
- [ ] Test error handling (API error → toast notification)
- [ ] Mobile responsive test (viewport < 640px)
- [ ] Fix any layout/spacing issues
- [ ] **Commit:** `test: add finance module tests`

---

### **PHASE 3: CAMPAIGN MODULE (Week 2, Days 11-15)**

#### Task 3.1: Create Campaign Hooks
- [ ] Create `hooks/useCampaigns.ts` with:
  - `useCampaigns()` - GET list
  - `useCampaignDetail(id)` - GET single
  - `useCreateCampaign()` - POST new
  - `useConfirmCampaign(id, userId)` - POST confirm
  - `useRejectCampaign(id, userId)` - POST reject
  - `useApproveAssignment(id, userId)` - PATCH approve
  - `useRejectAssignment(id, userId)` - PATCH reject
  - `useExemptAssignment(id, userId)` - PATCH exempt
- [ ] Test: Mock API, verify hook responses
- [ ] **Commit:** `feat: add campaign hooks`

#### Task 3.2: Create Campaign Components (Part 1)
- [ ] Create `components/Campaign/CampaignCard.tsx`
  - Card: Campaign name, member count, amount per member, deadline (optional)
  - Props: campaign object + onTap callback
  - Status badge: active vs closed
- [ ] Create `components/Campaign/CampaignGrid.tsx`
  - Call `useCampaigns()`
  - Asymmetric bento grid (CSS Grid with varied sizes)
  - Render `<CampaignCard>` for each
  - Empty state
- [ ] Test: Render grid, verify layout + card styling
- [ ] **Commit:** `feat: add campaign grid components`

#### Task 3.3: Create Campaign Confirmation Components
- [ ] Create `components/Campaign/ConfirmationCard.tsx`
  - Card: Campaign name, amount, [✓ Confirm] [✗ Reject] buttons
  - Props: campaign + onConfirm + onReject
  - Loading state
- [ ] Create `components/Campaign/MemberConfirmations.tsx`
  - Query: Get campaigns where member has pending confirmation
  - Render list of `<ConfirmationCard>`
  - Empty state
- [ ] Test: Render confirmations, verify buttons work
- [ ] **Commit:** `feat: add campaign confirmation components`

#### Task 3.4: Create Campaign Approval Components (Co-manager)
- [ ] Create `components/Campaign/ApprovalCard.tsx`
  - Card: Member name, campaign name, amount, status, [Approve] [Reject] [Exempt] buttons
  - Props: assignment + callbacks
- [ ] Create `components/Campaign/ApprovalCards.tsx`
  - Query: Get assignments where status is pending_approval
  - Render list of `<ApprovalCard>`
  - Visible only to co-manager/owner
- [ ] Test: Render approvals, verify buttons
- [ ] **Commit:** `feat: add campaign approval components`

#### Task 3.5: Create Campaign Form
- [ ] Create `components/Campaign/CampaignForm.tsx`
  - Form fields: name, amount per member, deadline (optional), description (optional)
  - Validation: Zod
  - Submit: `useCreateCampaign()`
  - Success: Toast + close modal
  - Visible only to co-manager/owner
- [ ] Test: Fill form, submit
- [ ] **Commit:** `feat: add campaign creation form`

#### Task 3.6: Campaign Dashboard Page
- [ ] Update `app/app/campaigns/page.tsx`
  - Layout:
    ```
    [Header: Campaigns] [+ Button]
    [CampaignGrid] (active campaigns)
    [MemberConfirmations] (for members)
    [ApprovalCards] (for co-managers)
    [Closed Campaigns section]
    ```
  - [+ Button] opens `CampaignForm` (if co-manager)
- [ ] Test: Render page, verify all sections
- [ ] **Commit:** `feat: build campaign dashboard page`

#### Task 3.7: Campaign Detail Page
- [ ] Create `app/app/campaigns/[id]/page.tsx`
  - Call `useCampaignDetail(id)`
  - Show campaign details
  - Show `MemberAssignmentList` (table of members + status)
  - If co-manager: show approval/reject/exempt buttons for each member
- [ ] Create `components/Campaign/MemberAssignmentList.tsx`
  - Table: member name | status | actions (if co-manager)
  - Call hooks for approve/reject/exempt
- [ ] Test: Navigate to detail, verify table + buttons
- [ ] **Commit:** `feat: add campaign detail page`

#### Task 3.8: Campaign Module Testing
- [ ] Write tests for campaign hooks
- [ ] Test form validation
- [ ] Test error handling
- [ ] Mobile responsive
- [ ] **Commit:** `test: add campaign module tests`

---

### **PHASE 4: ATTENDANCE & LEADERBOARD MODULE (Week 2-3, Days 16-20)**

#### Task 4.1: Create Attendance Hooks
- [ ] Create `hooks/useAttendance.ts` with:
  - `useSessions()` - GET sessions (upcoming + past)
  - `useSessionDetail(id)` - GET single
  - `useCreateSession()` - POST new (co-manager)
  - `useCheckIn(id)` - POST check-in
  - `useMarkAbsent(id, userId)` - POST mark absent (co-manager)
  - `useLeaderboard()` - GET current month
  - `useLeaderboardHistory(month)` - GET past month
  - `useUserStats(userId)` - GET personal stats
- [ ] Test: Mock API
- [ ] **Commit:** `feat: add attendance hooks`

#### Task 4.2: Create Leaderboard Hero Component
- [ ] Create `components/Attendance/LeaderboardHero.tsx`
  - Top 3 ranking: large typography (oversized)
  - Your rank: smaller, muted, pale green background
  - Call `useLeaderboard()` + `useUserStats()`
  - Show loading skeleton
- [ ] Test: Render hero, verify styling
- [ ] **Commit:** `feat: add leaderboard hero component`

#### Task 4.3: Create Check-In Card Component
- [ ] Create `components/Attendance/CheckInCard.tsx`
  - Show today's session (if exists): time, location, type
  - [✓ Check In Now] button
  - Show current status: "You checked in at HH:MM" or "Not checked in"
  - Call `useSessions()` to get today's session
  - Call `useCheckIn()` on button tap
- [ ] Test: Render card, verify check-in works
- [ ] **Commit:** `feat: add check-in card component`

#### Task 4.4: Create Leaderboard Table Component
- [ ] Create `components/Attendance/LeaderboardTable.tsx`
  - Call `useLeaderboard()`
  - Table: Rank | Name | Points (scrollable on mobile)
  - Each row clickable → user detail (optional)
  - Empty state
- [ ] Test: Render table, verify data
- [ ] **Commit:** `feat: add leaderboard table component`

#### Task 4.5: Create Session History Component
- [ ] Create `components/Attendance/SessionList.tsx`
  - Two sections: Upcoming, Past
  - Call `useSessions()`
  - Upcoming: clickable cards, [Check In Now] if today
  - Past: show date + attendance status (✓/✗)
  - Empty state if no sessions
- [ ] Test: Render list, verify sections
- [ ] **Commit:** `feat: add session history component`

#### Task 4.6: Create Month Selector (for Historical Leaderboards)
- [ ] Create `components/Attendance/MonthSelector.tsx`
  - Dropdown or previous/next month buttons
  - On change: call `useLeaderboardHistory(month)`
  - Show historical leaderboard
- [ ] Test: Change month, verify leaderboard updates
- [ ] **Commit:** `feat: add month selector component`

#### Task 4.7: Create User Stats Card
- [ ] Create `components/Attendance/UserStatsCard.tsx`
  - Show: Current rank, total points, attendance %
  - Call `useUserStats()`
  - Optional: show comparison to previous month
- [ ] Test: Render card, verify data
- [ ] **Commit:** `feat: add user stats card`

#### Task 4.8: Create Session Form (Co-manager)
- [ ] Create `components/Attendance/SessionForm.tsx`
  - Form fields: session date, location (optional), session type (training/match), description (optional)
  - Validation: Zod
  - Submit: `useCreateSession()`
  - Success: Toast + close modal
  - Visible only to co-manager/owner
- [ ] Test: Fill form, submit
- [ ] **Commit:** `feat: add session form component`

#### Task 4.9: Attendance Hub Page
- [ ] Update `app/app/attendance/page.tsx`
  - Layout:
    ```
    [Header: Attendance] [+ Button]
    [LeaderboardHero]
    [CheckInCard]
    [LeaderboardTable]
    [SessionList]
    [MonthSelector]
    ```
  - [+ Button] opens `SessionForm` (if co-manager)
- [ ] Test: Render page, verify all sections
- [ ] **Commit:** `feat: build attendance hub page`

#### Task 4.10: Session Detail Page
- [ ] Create `app/app/attendance/[id]/page.tsx`
  - Call `useSessionDetail(id)`
  - Show session details
  - If co-manager: show [Mark Absent] option for members
  - Attendance list: members + their status
- [ ] Test: Navigate to detail, verify data
- [ ] **Commit:** `feat: add session detail page`

#### Task 4.11: Attendance Module Testing
- [ ] Write tests for hooks
- [ ] Test form validation
- [ ] Test error handling
- [ ] Mobile responsive
- [ ] **Commit:** `test: add attendance module tests`

---

### **PHASE 5: POLISH & PWA (Week 3-4, Days 21-24)**

#### Task 5.1: Error Handling & Edge Cases
- [ ] Add error boundaries to main sections
- [ ] Test: API errors → toast notifications
- [ ] Test: Empty states (no transactions, no campaigns, no leaderboards)
- [ ] Test: Offline mode (service worker caches, show offline message)
- [ ] Test: Permission errors (non-co-managers can't see approval sections)
- [ ] **Commit:** `fix: improve error handling and edge cases`

#### Task 5.2: Form Validations & UX Polish
- [ ] Add inline validation feedback on forms
- [ ] Add loading indicators (disable buttons, show spinners)
- [ ] Add confirmation dialogs for destructive actions (reject, exempt)
- [ ] Add success animations (toast notifications)
- [ ] **Commit:** `ux: improve form validation and feedback`

#### Task 5.3: Responsive Design & Mobile Optimization
- [ ] Test all pages on mobile (< 640px)
- [ ] Test tablet (640-1024px)
- [ ] Adjust spacing, font sizes for smaller screens
- [ ] Verify bottom tab bar not blocking content
- [ ] Verify forms fit on mobile keyboard open
- [ ] **Commit:** `style: optimize responsive layout for mobile`

#### Task 5.4: Accessibility (WCAG AA)
- [ ] Add ARIA labels to buttons, inputs, modals
- [ ] Test keyboard navigation (tab, enter, esc)
- [ ] Verify color contrast (text on background)
- [ ] Test with screen reader (optional)
- [ ] **Commit:** `a11y: add accessibility improvements`

#### Task 5.5: Performance Optimization
- [ ] Audit with Lighthouse (`npm run build` + inspect)
- [ ] Code split: lazy load modules (Finance/Campaign/Attendance)
- [ ] Image optimization: compress icons
- [ ] Minimize bundle size: remove unused dependencies
- [ ] Add static caching headers (if using Vercel)
- [ ] **Commit:** `perf: optimize bundle size and loading`

#### Task 5.6: PWA Testing & Shortcuts
- [ ] Test: Install app on mobile (home screen)
- [ ] Test: All 4 shortcuts work (tap → correct page/action)
- [ ] Test: App icon displays correctly
- [ ] Test: Standalone mode (no browser UI)
- [ ] Test: Service worker caches + offline fallback
- [ ] **Commit:** `pwa: test shortcuts and offline support`

#### Task 5.7: API Integration Testing
- [ ] Test: Connect to running backend (port 3001 or deployed)
- [ ] Test: All API calls work (create, read, update)
- [ ] Test: Error responses handled (400, 401, 500)
- [ ] Test: Auth token refresh (if implemented in Phase 1 auth)
- [ ] Test: Real data from backend (not mocks)
- [ ] **Commit:** `test: verify API integration end-to-end`

#### Task 5.8: Browser & Cross-Device Testing
- [ ] Test on Chrome, Safari, Firefox (if possible)
- [ ] Test on iOS Safari (PWA behavior)
- [ ] Test on Android Chrome (PWA + shortcuts)
- [ ] Test on tablet landscape mode
- [ ] Fix any browser-specific issues
- [ ] **Commit:** `test: cross-browser and device testing`

#### Task 5.9: Documentation & Code Review
- [ ] Write README for frontend (setup, run, build)
- [ ] Add JSDoc comments to key functions
- [ ] Review code style, naming conventions
- [ ] Clean up unused imports, dead code
- [ ] **Commit:** `docs: add frontend documentation`

#### Task 5.10: Deployment Prep & Release
- [ ] Build for production: `npm run build`
- [ ] Test production build locally
- [ ] Set up `.env.production` with production API URL
- [ ] Deploy to Vercel (or chosen platform)
- [ ] Verify PWA works on production domain
- [ ] Monitor: Check error logs, performance metrics
- [ ] **Commit:** `release: production build and deployment`

---

## 🧪 TESTING STRATEGY

### Unit Tests (per module)
- **Finance:** Test hooks (list, submit, approve), form validation, components render
- **Campaign:** Test hooks, form validation, status transitions, components render
- **Attendance:** Test hooks, leaderboard calculations, components render

### Integration Tests (cross-module)
- Test: Finance transaction → Approval notification → Leaderboard update
- Test: Campaign creation → Member confirmations → Co-manager approval → Finance integration
- Test: Attendance check-in → Points added → Leaderboard updated

### E2E Tests (optional, if time)
- Test: Full user flow (submit expense → approve → see in balance)
- Test: Full campaign flow (create → confirm → approve → close)
- Test: Attendance flow (check-in → see points → rank update)

### Testing Tools
- Jest for unit tests
- React Testing Library for component tests
- Playwright or Cypress for E2E (optional)

---

## 📋 CHECKLIST

**Setup & Infrastructure:**
- [ ] Next.js + Tailwind configured
- [ ] PWA + manifest ready
- [ ] API client + auth context working
- [ ] Design system components built

**Finance Module:**
- [ ] Hooks complete
- [ ] Components complete
- [ ] Pages (list + detail) complete
- [ ] Form working
- [ ] Co-manager approvals visible

**Campaign Module:**
- [ ] Hooks complete
- [ ] Components complete
- [ ] Pages (list + detail) complete
- [ ] Member confirmations working
- [ ] Co-manager approvals working

**Attendance Module:**
- [ ] Hooks complete
- [ ] Components complete
- [ ] Pages (hub + detail) complete
- [ ] Check-in working
- [ ] Leaderboard displaying correctly

**Polish & Testing:**
- [ ] Mobile responsive (< 640px)
- [ ] Error handling working
- [ ] Forms validated
- [ ] PWA shortcuts working
- [ ] All pages tested
- [ ] Deployed to production

---

## 🔗 DEPENDENCIES

**Frontend → Backend Dependency:**
- Backend must have all API endpoints running
- Backend must have CORS configured for frontend domain
- Backend must have auth working (JWT)

**Frontend Dependencies:**
- `next`: 14+
- `react`: 18+
- `tailwindcss`: 3.3+
- `next-pwa`: Latest
- `react-hook-form`: Latest
- `zod`: Latest
- `@phosphor/react`: Latest (icons)
- `axios` or `fetch`: For API calls

---

## 🎯 SUCCESS CRITERIA

By end of Phase 2 Frontend:
- ✅ All 3 modules fully functional (mobile-first)
- ✅ PWA installable with 4 shortcuts
- ✅ All API integrations working
- ✅ Mobile responsive (< 640px tested)
- ✅ Minimalist aesthetic applied (warm monochrome, flat bento)
- ✅ Error handling + edge cases covered
- ✅ Lighthouse score > 85
- ✅ Deployed to production
- ✅ Ready for user testing

---

## 📅 TIMELINE

| Week | Focus | Deliverables |
|------|-------|--------------|
| 1 | Setup + Finance | Finance module complete |
| 2 | Campaign + Attendance | All 3 modules complete |
| 3 | Polish + Testing | PWA, responsive, error handling |
| 4 | Deployment + Release | Production-ready |

---

**Status:** ✅ Plan Ready for Implementation

Next: Invoke `subagent-driven-development` or `executing-plans` to begin implementation.
