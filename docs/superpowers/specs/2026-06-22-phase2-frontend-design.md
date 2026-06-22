# PHASE 2: FRONTEND IMPLEMENTATION DESIGN
## Finance, Campaign, Attendance Modules + PWA Shortcuts

**Date:** 2026-06-22  
**Status:** Design Approved - Ready for Implementation  
**Target:** Mobile-first PWA with bottom tab navigation

---

## 1. OVERVIEW

**Scope:** Frontend UI for 3 business modules (Finance, Campaign, Attendance & Gamification)  
**Design System:** Minimalist Editorial Style (warm monochrome, flat bento grids, generous spacing)  
**Platform:** PWA (Progressive Web App) with home screen shortcuts  
**Mobile-first:** Primary focus on mobile/tablet, responsive to desktop  

---

## 2. ARCHITECTURE

### 2.1 Navigation Structure

```
Main App Layout:
├─ Header (sticky, team branding)
├─ Content Area (dynamic by active tab)
└─ Bottom Tab Bar (sticky, 4 tabs)
    ├─ 🏦 Finance
    ├─ 📢 Campaigns  
    ├─ 📊 Attendance
    └─ ⚙️ Menu (settings/profile)
```

**Tab Bar Behavior:**
- Fixed at bottom on mobile (< 768px)
- Always visible, no scroll
- Active tab highlighted in black (#111)
- Inactive tabs in gray (#787774)
- Icons: Phosphor Icons (bold weight, 24px)

### 2.2 PWA App Shortcuts

4 quick actions available from home screen (iOS/Android):
1. **Check In** → `/app/attendance?action=checkin`
2. **Submit Expense** → `/app/finance?action=submit`
3. **View Leaderboard** → `/app/attendance?action=leaderboard`
4. **New Campaign** → `/app/campaigns?action=create`

Defined in `manifest.json` with icons, descriptions, and target URLs.

---

## 3. MODULE DESIGNS

### 3.1 Finance Dashboard

**Screens:**
1. **List View** - Transaction history with filters
2. **Submit Form** - Create new transaction
3. **Approval Queue** - Co-manager only, pending transactions
4. **Detail View** - Single transaction details

**Layout (mobile):**
```
[Header: Finance] [+ Button]
[Stats: Pending/Approved/Balance]
[CTA: Submit Transaction - full width black button]
[Transaction List - scrollable]
  - Each row: Date | Amount | Status Badge | Tap to detail
[Co-Manager Section: Pending Approvals]
  - Approve/Reject buttons inline
```

**Components:**
- `<StatsBar />` - 3 stat cards (pending count, approved count, balance)
- `<TransactionForm />` - Input fields (amount, description, bill image, date)
- `<TransactionList />` - Scrollable infinite list with pull-to-refresh
- `<TransactionItem />` - Single transaction row with status badge
- `<ApprovalItem />` - Pending approval card with action buttons

**Colors:**
- Approved: Pale green badge (#EDF3EC, text #346538)
- Pending: Pale yellow badge (#FBF3DB, text #956400)
- Rejected: Pale red badge (#FDEBEC, text #9F2F2D)
- CTA Button: Solid black (#111)

**Data Flow:**
```
1. User taps [Submit Transaction]
2. Modal/Sheet opens → TransactionForm
3. User fills: amount, description, optional bill image
4. Submit → POST /api/finance/transactions
5. Success → refresh list, show toast notification
6. Notification sent to co-managers via Inngest
7. Co-manager approves → Transaction status updates
8. User sees approval in list
```

---

### 3.2 Campaign Manager

**Screens:**
1. **List View** - All campaigns (active, closed)
2. **Create Form** - New campaign
3. **Campaign Detail** - Members, confirmations, assignments
4. **Member Confirmations** - What member needs to do
5. **Co-Manager Approvals** - Pending confirmations to approve

**Layout (mobile):**
```
[Header: Campaigns] [+ Button]
[Active Campaigns - Bento Grid]
  - Asymmetric cards (1x2, 1x1, 1x1 pattern)
  - Each card: Campaign name, member count, amount per member
  - Tap to detail view
[My Confirmations - for members]
  - Cards showing campaigns waiting member confirmation
  - [✓ Confirm] [✗ Reject] buttons
[Co-Manager: Pending Approvals]
  - Members who confirmed, waiting manager approval
  - [Approve] [Reject] [Exempt] buttons
[Closed Campaigns Archive]
```

**Components:**
- `<CampaignGrid />` - Asymmetric bento layout
- `<CampaignCard />` - Campaign summary card
- `<CampaignForm />` - Create new campaign
- `<ConfirmationCard />` - What member needs to do
- `<ApprovalCard />` - What manager needs to do
- `<MemberAssignmentList />` - Table of all members + status

**Data Flow:**
```
1. Co-manager: [Create Campaign]
   → POST /api/campaigns
   → Inngest: notify all members
2. Member receives: "Campaign waiting your confirmation"
   → See in [My Confirmations]
   → [✓ Confirm] or [✗ Reject]
   → POST /api/campaigns/:id/assignments/:userId/confirm
   → Inngest: notify co-manager
3. Co-manager: [Approve Confirmation]
   → PATCH /api/campaigns/:id/assignments/:userId/approve
   → Transaction auto-created in Finance
4. Co-manager: [Close Campaign]
   → Archive & show report
```

---

### 3.3 Attendance & Leaderboard

**Screens:**
1. **Check-In Hub** - Today's session + quick check-in
2. **Leaderboard** - Current month top 3 + full rankings
3. **Session History** - Past and upcoming sessions
4. **User Stats** - Personal attendance record

**Layout (mobile):**
```
[Header: Attendance] [+ Button]
[Top 3 Leaderboard Hero Section]
  - 🥇 1st: [Name] [Points] (large, oversized)
  - 🥈 2nd: [Name] [Points]
  - 🥉 3rd: [Name] [Points]
  - [Your Rank: 6th - X pts] (smaller, muted)
[Quick Check-In]
  - "Today: Training 18:00"
  - [✓ Check In Now] button
  - Status: "You checked in at 17:55"
[Full Leaderboard]
  - Scrollable list of all members ranked by points
  - Current month
[Session History]
  - Upcoming sessions (scrollable left-right or expandable)
  - Past sessions (with ✓/✗ attendance indicator)
[Month Selector]
  - View leaderboard for past months (archived)
```

**Components:**
- `<LeaderboardHero />` - Top 3 with large typography
- `<CheckInCard />` - Today's session + quick action
- `<LeaderboardTable />` - Full rankings, scrollable
- `<SessionList />` - Upcoming and past sessions
- `<UserStatsCard />` - Personal stats (rank, points, attendance %)
- `<MonthSelector />` - Historical leaderboards

**Colors:**
- Top 3: Emphasized (larger text, bold)
- Current rank: Pale green background (#EDF3EC) if in top 10
- Checked in: Pale green badge
- Absent: Pale red badge
- CTA Button: Solid black (#111)

**Data Flow:**
```
1. Member taps [✓ Check In Now]
   → POST /api/attendance/sessions/:id/check-in
   → Inngest: addPoints() called
2. Leaderboard auto-updates in real-time
   → User sees new points added
3. Co-manager: [Create Session]
   → POST /api/attendance/sessions
   → Inngest: notify team
4. Session closes:
   → Archive in history
   → Leaderboard frozen for that session
5. Month ends:
   → Monthly reminder Inngest job
   → Archive leaderboard
   → Reset points (or show historical)
```

---

## 4. DESIGN SYSTEM

### 4.1 Color Palette

| Color | Value | Usage |
|-------|-------|-------|
| Black | #111111 | Primary text, CTA buttons |
| Charcoal | #2F3437 | Secondary text |
| Gray | #787774 | Tertiary text, inactive tabs |
| Light Gray | #EAEAEA | Borders, dividers |
| Bone | #F7F6F3 | Background, cards |
| White | #FFFFFF | Primary surface |
| Pale Red | #FDEBEC | Rejected status badge |
| Pale Green | #EDF3EC | Approved status badge |
| Pale Yellow | #FBF3DB | Pending status badge |
| Pale Blue | #E1F3FE | Info badge (optional) |

### 4.2 Typography

| Role | Font | Size | Weight | Letter Spacing | Line Height |
|------|------|------|--------|-----------------|-------------|
| Hero Heading | Instrument Serif | 32px | 400 | -0.02em | 1.1 |
| Section Title | Instrument Serif | 24px | 400 | -0.02em | 1.15 |
| Heading 3 | Geist Sans | 18px | 600 | 0 | 1.3 |
| Body | Geist Sans | 16px | 400 | 0 | 1.6 |
| Small | Geist Sans | 14px | 400 | 0 | 1.5 |
| Caption | Geist Mono | 12px | 400 | 0 | 1.4 |
| Button | Geist Sans | 14px | 500 | 0 | 1.2 |

### 4.3 Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Micro spacing |
| sm | 8px | Small spacing |
| md | 12px | Component spacing |
| lg | 16px | Content spacing |
| xl | 24px | Card padding |
| 2xl | 32px | Section spacing |
| 3xl | 48px | Large section spacing |

### 4.4 Component Specifications

**Buttons:**
- Primary: Solid black (#111), text white, 4px border-radius, 14px sans-serif 500
- Hover: #333333 (subtle shift)
- Active: scale(0.98) transform
- Padding: 12px 24px (mobile), 14px 28px (desktop)

**Cards:**
- Border: 1px solid #EAEAEA
- Border-radius: 8px
- Padding: 24px
- Background: #FFFFFF or #F9F9F8
- No shadow (or ultra-subtle 0.02 opacity max)

**Badges/Tags:**
- Border-radius: 9999px (pill)
- Font: Geist Sans, 12px, 500
- Padding: 4px 12px
- Background: One of Pale Color palette

**Dividers:**
- 1px solid #EAEAEA
- Full width or constrained

---

## 5. RESPONSIVE BEHAVIOR

| Breakpoint | Width | Behavior |
|-----------|-------|----------|
| Mobile | < 640px | Full width, bottom tabs, stacked layout |
| Tablet | 640-1024px | Wider cards, 2-col grids where appropriate, same bottom tabs |
| Desktop | > 1024px | Optional left sidebar, 3-col grids, side-by-side layouts |

**Priority:** Mobile first. Desktop is bonus.

---

## 6. ANIMATIONS & INTERACTIONS

**Scroll Entry (Fade-in):**
- Elements fade in as they enter viewport
- `opacity: 0` → `opacity: 1`
- `translateY: 12px` → `translateY: 0`
- Duration: 600ms
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)`
- Tool: Framer Motion or React Intersection Observer

**Hover States:**
- Cards: Ultra-subtle shadow lift (0.02 opacity)
- Buttons: Scale(0.98) on active, color shift to #333 on hover
- Links: Underline fade-in on hover

**Pull-to-Refresh:**
- Transaction/Campaign/Attendance lists support pull-to-refresh
- Loading spinner (minimalist, thin stroke)
- Refresh completes, list updates

**Tab Switching:**
- Immediate switch (no fade)
- Active tab indicator underline (black bar)
- Smooth scroll if tabs overflow

---

## 7. ERROR HANDLING & States

**Empty States:**
- No transactions: "No transactions yet. [Submit first transaction]"
- No campaigns: "No active campaigns. [Create campaign]"
- No sessions: "No upcoming sessions"
- Centered text, generous spacing, optional illustration

**Error States:**
- Network error: Toast notification with retry button
- Validation error: Inline field error message (pale red)
- API error: Toast with error message

**Loading States:**
- Skeleton placeholders (same shape as content cards)
- Minimal, flat skeletons (no shimmer animation)
- Never show generic spinners

---

## 8. PWA Configuration

**manifest.json:**
```json
{
  "name": "Football Team Manager",
  "short_name": "Team Manager",
  "start_url": "/app/finance",
  "display": "standalone",
  "scope": "/app/",
  "theme_color": "#111111",
  "background_color": "#FFFFFF",
  "icons": [...],
  "shortcuts": [
    {
      "name": "Check In",
      "url": "/app/attendance?action=checkin"
    },
    {
      "name": "Submit Expense",
      "url": "/app/finance?action=submit"
    },
    {
      "name": "View Leaderboard",
      "url": "/app/attendance?action=leaderboard"
    },
    {
      "name": "New Campaign",
      "url": "/app/campaigns?action=create"
    }
  ]
}
```

**Service Worker:**
- Cache static assets
- Network-first for API calls
- Offline message if no connectivity
- Handle push notifications (optional)

---

## 9. API Integration

**Endpoints Used:**

**Finance:**
- `POST /api/finance/transactions` - Submit
- `GET /api/finance/transactions` - List
- `GET /api/finance/transactions/:id` - Detail
- `PATCH /api/finance/transactions/:id/approve` - Approve
- `PATCH /api/finance/transactions/:id/reject` - Reject
- `GET /api/finance/balance` - Get balance
- `GET /api/finance/approvals/pending` - Pending (co-manager)

**Campaigns:**
- `POST /api/campaigns` - Create
- `GET /api/campaigns` - List
- `GET /api/campaigns/:id` - Detail
- `POST /api/campaigns/:id/assignments/:userId/confirm` - Member confirm
- `PATCH /api/campaigns/:id/assignments/:userId/approve` - Approve
- `PATCH /api/campaigns/:id/assignments/:userId/reject` - Reject
- `PATCH /api/campaigns/:id/assignments/:userId/exempt` - Exempt

**Attendance:**
- `POST /api/attendance/sessions` - Create session
- `GET /api/attendance/sessions` - List
- `POST /api/attendance/sessions/:id/check-in` - Check-in
- `GET /api/attendance/leaderboard` - Current month
- `GET /api/attendance/leaderboard/:month` - Historical
- `GET /api/attendance/stats/:userId` - User stats

---

## 10. Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS + custom CSS modules
- **UI Components:** Headless (Radix UI) + custom minimalist components
- **Icons:** Phosphor Icons (@phosphor/react)
- **State:** React Context + custom hooks
- **Fetch:** React Query or SWR
- **PWA:** next-pwa (for manifest + service worker)
- **Animations:** Framer Motion (optional, for scroll-entry)
- **Form:** React Hook Form + Zod validation
- **Date Picker:** React DatePicker (headless)

---

## 11. File Structure

```
frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── app/
│       ├── layout.tsx (app layout with bottom tabs)
│       ├── finance/
│       │   ├── page.tsx (list)
│       │   └── [id]/page.tsx (detail)
│       ├── campaigns/
│       │   ├── page.tsx (list)
│       │   └── [id]/page.tsx (detail)
│       └── attendance/
│           ├── page.tsx (hub)
│           └── [id]/page.tsx (session detail)
├── components/
│   ├── Finance/
│   │   ├── TransactionList.tsx
│   │   ├── TransactionForm.tsx
│   │   ├── StatsBar.tsx
│   │   └── ApprovalQueue.tsx
│   ├── Campaign/
│   │   ├── CampaignGrid.tsx
│   │   ├── CampaignForm.tsx
│   │   ├── MemberConfirmations.tsx
│   │   └── ApprovalCards.tsx
│   ├── Attendance/
│   │   ├── LeaderboardHero.tsx
│   │   ├── CheckInCard.tsx
│   │   ├── SessionList.tsx
│   │   └── LeaderboardTable.tsx
│   ├── Layout/
│   │   ├── Header.tsx
│   │   ├── BottomTabBar.tsx
│   │   └── AppLayout.tsx
│   └── Common/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Badge.tsx
│       └── EmptyState.tsx
├── hooks/
│   ├── useFinance.ts
│   ├── useCampaigns.ts
│   ├── useAttendance.ts
│   └── useAuth.ts
├── lib/
│   ├── api.ts (API client)
│   ├── constants.ts (colors, spacing)
│   └── utils.ts
├── public/
│   ├── manifest.json
│   ├── icons/
│   └── shortcuts/
└── styles/
    ├── globals.css
    ├── variables.css (design tokens)
    └── components.css
```

---

## 12. Success Criteria

✅ Mobile-responsive (< 640px primary target)  
✅ Bottom tab navigation working  
✅ All 3 modules functional (read + create + approve flows)  
✅ PWA installable with 4 shortcuts  
✅ API integration complete  
✅ Minimalist aesthetic applied  
✅ Accessibility: WCAG AA level  
✅ Performance: Lighthouse score > 85  

---

## 13. Timeline Estimate

- **Week 1:** Setup, components, Finance module
- **Week 2:** Campaign module, Attendance module
- **Week 3:** PWA setup, shortcuts, polish, testing
- **Week 4:** Bug fixes, performance, deployment

---

**Status:** ✅ Design Approved - Ready for Implementation Plan
