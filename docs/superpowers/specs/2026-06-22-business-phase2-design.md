# PHASE 2: BUSINESS MODULES IMPLEMENTATION
## SaaS Football Team Management Platform

**Date:** 2026-06-22  
**Status:** Design Phase - Awaiting Implementation  
**Scope:** 3 business modules (Finance, Ad-hoc Campaigns, Attendance & Gamification)

---

## 1. OVERVIEW & STRATEGY

**Approach:** Service-Oriented Architecture

Phase 2 implements 3 business modules in parallel, each building on Phase 1 infrastructure. Shared Domain Services (Approval, Notification, Gamification) eliminate code duplication and enable consistent behavior across modules.

**Phase 2 Goals:**
- Implement Finance module: transaction submission + 1-level approval
- Implement Ad-hoc Campaigns: creation + member confirmation + co-manager approval
- Implement Attendance: session management + monthly leaderboard + gamification points
- Create Domain Services layer: Approval, Notification, Gamification
- Parallel development: 3 independent implementation tracks

**Phase 2 Outputs:**
- Domain Services (ApprovalService, NotificationService, GamificationService)
- Finance module API + business logic
- Ad-hoc Campaigns module API + business logic
- Attendance module API + business logic
- Database migrations for new tables
- Inngest handlers for cross-module events
- Integration tests for all 3 modules

---

## 2. SECTION 2.1: SYSTEM ARCHITECTURE

### 2.1 Component Stack

```
┌─────────────────────────────────────────────┐
│         API Routes (Express)                │
│  /api/finance, /api/campaigns, /api/attendance
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│         Middleware Stack (Phase 1)          │
│  authMiddleware → tenancyMiddleware → rbac  │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│      Domain Services Layer (NEW)            │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │    ApprovalService                   │  │
│  │  - submitForApproval()               │  │
│  │  - approveEntity()                   │  │
│  │  - rejectEntity()                    │  │
│  │  - getPendingApprovals()             │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │    NotificationService               │  │
│  │  - sendZaloMessage()                 │  │
│  │  - emitEvent()                       │  │
│  │  - sendInternalNotification()        │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │    GamificationService               │  │
│  │  - addPoints()                       │  │
│  │  - getLeaderboard()                  │  │
│  │  - resetMonthlyPoints()              │  │
│  └──────────────────────────────────────┘  │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│      Module Business Logic                  │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  Finance Handlers                   │   │
│  │  - submitTransaction()              │   │
│  │  - approveTransaction()             │   │
│  │  - getBalance()                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  Campaign Handlers                  │   │
│  │  - createCampaign()                 │   │
│  │  - memberConfirm()                  │   │
│  │  - coManagerApprove()               │   │
│  │  - closeCampaign()                  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  Attendance Handlers                │   │
│  │  - createSession()                  │   │
│  │  - memberCheckIn()                  │   │
│  │  - closeSession()                   │   │
│  │  - getLeaderboard()                 │   │
│  └─────────────────────────────────────┘   │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│      Database Layer (Supabase)              │
│  - RLS policies enforced per team_id        │
│  - New tables: campaigns, gamification_*    │
└─────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│      Inngest Event Bus (Async)              │
│  - approval.approved → notify members       │
│  - campaign.charged → update finance        │
│  - attendance.check_in → add points         │
│  - monthly cron → reset + send summaries    │
└─────────────────────────────────────────────┘
```

### 2.2 Data Flow Example: Finance Transaction

```
1. Member submits transaction
   POST /api/finance/transactions
   └─> Handler inserts row (status='pending')
       └─> ApprovalService.submitForApproval()
           └─> Emit event: 'approval.pending'

2. Inngest receives event (async)
   └─> Fetch co-managers for team
       └─> NotificationService.sendZaloMessage()
           └─> Queue Zalo OA: "Transaction pending approval"

3. Co-manager approves
   PATCH /api/finance/transactions/:id/approve
   └─> ApprovalService.approveEntity()
       └─> Update DB (status='approved')
           └─> Emit event: 'approval.approved'

4. Inngest receives event
   └─> Update fund_balance_logs
       └─> NotificationService.sendZaloMessage()
           └─> Notify member: "✓ Transaction approved"
           └─> Notify team: "Fund updated +[amount]"
```

---

## 3. SECTION 2.2: DOMAIN SERVICES LAYER

### 3.1 ApprovalService

Quản lý quy trình phê duyệt (1 cấp cho Finance + Ad-hoc Campaigns).

```javascript
class ApprovalService {
  // Member submit for approval
  async submitForApproval(entity, submittedBy, entityType) {
    // entityType: 'transaction' | 'campaign_confirmation'
    
    await db('approvals').insert({
      entity_type: entityType,
      entity_id: entity.id,
      submitted_by: submittedBy,
      status: 'pending',
      created_at: NOW()
    });
    
    // Emit event for NotificationService
    await inngest.send({
      name: 'approval.pending',
      data: {
        entity_id: entity.id,
        entity_type: entityType,
        team_id: entity.team_id,
        submitted_by: submittedBy
      }
    });
  }

  // Co-manager approve
  async approveEntity(entityId, entityType, approvedBy, approvalNotes) {
    const tableName = entityType === 'campaign_confirmation' 
      ? 'campaign_assignments' 
      : 'fund_transactions';
    
    await db(tableName).where('id', entityId).update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: NOW(),
      approval_notes: approvalNotes
    });
    
    await inngest.send({
      name: 'approval.approved',
      data: {
        entity_id: entityId,
        entity_type: entityType,
        approved_by: approvedBy
      }
    });
  }

  // Co-manager reject
  async rejectEntity(entityId, entityType, rejectedBy, reason) {
    const tableName = entityType === 'campaign_confirmation' 
      ? 'campaign_assignments' 
      : 'fund_transactions';
    
    await db(tableName).where('id', entityId).update({
      status: 'rejected',
      rejected_by: rejectedBy,
      rejection_reason: reason,
      rejected_at: NOW()
    });
    
    await inngest.send({
      name: 'approval.rejected',
      data: {
        entity_id: entityId,
        entity_type: entityType,
        reason: reason
      }
    });
  }

  // Query pending approvals
  async getPendingApprovals(teamId, approvalType) {
    const tableName = approvalType === 'campaign_confirmation' 
      ? 'campaign_assignments' 
      : 'fund_transactions';
    
    return db(tableName)
      .where('team_id', teamId)
      .where('status', 'pending_approval')
      .orderBy('created_at', 'desc');
  }
}
```

### 3.2 NotificationService

Gửi messages qua Zalo OA + emit Inngest events.

```javascript
class NotificationService {
  // Send Zalo OA message
  async sendZaloMessage(zaloUserId, templateId, params) {
    const user = await db('users')
      .where('zalo_user_id', zaloUserId)
      .first();
    
    if (!user) {
      logger.error('Zalo user not found', { zaloUserId });
      throw new BusinessError('ZALO_USER_NOT_FOUND', 'User not found', 400);
    }
    
    // Queue message (rate limiting)
    await messageQueue.add(() => {
      return zaloAPI.post('/message/send', {
        recipient: { user_id: zaloUserId },
        message: {
          template_id: templateId,
          template_data: params
        }
      });
    });
    
    logger.info('Zalo message queued', { zaloUserId, templateId });
  }

  // Emit Inngest event
  async emitEvent(eventName, data) {
    await inngest.send({
      name: eventName,
      data: data
    });
  }

  // Send internal notification
  async sendInternalNotification(userId, message) {
    await db('notifications').insert({
      user_id: userId,
      message: message,
      is_read: false,
      created_at: NOW()
    });
  }
}
```

### 3.3 GamificationService

Quản lý điểm + leaderboard (reset hàng tháng).

```javascript
class GamificationService {
  // Add/subtract points
  async addPoints(userId, points, reason, teamId) {
    const currentMonth = this.getCurrentMonth();
    
    await db('gamification_points').insert({
      user_id: userId,
      team_id: teamId,
      points: points,
      reason: reason,
      month: currentMonth,
      created_at: NOW()
    });
    
    logger.info('Points added', {
      user_id: userId,
      points: points,
      reason: reason,
      month: currentMonth
    });
  }

  // Get leaderboard for current month
  async getLeaderboard(teamId, month = null) {
    const targetMonth = month || this.getCurrentMonth();
    
    return db('gamification_points')
      .select(
        'gamification_points.user_id',
        db.raw('SUM(gamification_points.points) as total_points'),
        'users.full_name',
        'users.id'
      )
      .join('users', 'gamification_points.user_id', 'users.id')
      .where('gamification_points.team_id', teamId)
      .where('gamification_points.month', targetMonth)
      .where('users.status', 'active')
      .groupBy('gamification_points.user_id', 'users.full_name', 'users.id')
      .orderBy('total_points', 'desc')
      .limit(100);
  }

  // Get user stats
  async getUserStats(userId, teamId, month = null) {
    const targetMonth = month || this.getCurrentMonth();
    
    const stats = await db('gamification_points')
      .sum('points as total_points')
      .where('user_id', userId)
      .where('team_id', teamId)
      .where('month', targetMonth)
      .first();
    
    // Get rank
    const betterRanked = await db('gamification_points')
      .select(db.raw('DISTINCT user_id'))
      .where('team_id', teamId)
      .where('month', targetMonth)
      .havingRaw('SUM(points) > ?', [stats.total_points])
      .count('*');
    
    return {
      total_points: stats.total_points || 0,
      rank: betterRanked[0]?.count + 1 || 1,
      month: targetMonth
    };
  }

  getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
```

---

## 4. SECTION 2.3: MODULE 1 - FINANCE & TRANSACTION APPROVAL

### 4.1 API Endpoints

| Method | Endpoint | Role | Purpose |
| --- | --- | --- | --- |
| POST | `/api/finance/transactions` | member+ | Member submit transaction |
| GET | `/api/finance/transactions` | member+ | List transactions (team filtered) |
| GET | `/api/finance/transactions/:id` | member+ | Transaction detail |
| PATCH | `/api/finance/transactions/:id/approve` | co_manager+ | Approve transaction |
| PATCH | `/api/finance/transactions/:id/reject` | co_manager+ | Reject transaction |
| GET | `/api/finance/approvals/pending` | co_manager+ | Pending approvals list |
| GET | `/api/finance/balance` | member+ | Team fund balance |
| POST | `/api/finance/campaigns` | co_manager+ | Create fund campaign |
| GET | `/api/finance/campaigns` | member+ | List campaigns |

### 4.2 Request/Response Examples

**Submit Transaction**
```javascript
POST /api/finance/transactions
{
  "campaign_id": 123,
  "amount": 500000,
  "bill_image_url": "https://...",
  "description": "Team dinner"
}

Response (201):
{
  "transaction_id": 789,
  "status": "pending",
  "amount": 500000,
  "created_at": "2026-06-22T10:30:00Z",
  "approver_count": 2  // co-managers awaiting approval
}
```

**Approve Transaction**
```javascript
PATCH /api/finance/transactions/789/approve
{
  "approval_notes": "Looks good"
}

Response (200):
{
  "transaction_id": 789,
  "status": "approved",
  "approved_by": 456,
  "approved_at": "2026-06-22T11:00:00Z"
}
```

### 4.3 Database Changes

New tables:
```sql
CREATE TABLE fund_balance_logs (
  id BIGSERIAL PRIMARY KEY,
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  transaction_id BIGINT REFERENCES fund_transactions(id),
  previous_balance DECIMAL(12, 2),
  new_balance DECIMAL(12, 2),
  change_amount DECIMAL(12, 2),
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fund_balance_logs_team_id 
  ON fund_balance_logs(team_id, created_at DESC);
```

Schema updates:
```sql
ALTER TABLE fund_transactions ADD COLUMN (
  approval_notes TEXT,
  bill_image_url VARCHAR(255)
);
```

### 4.4 Implementation Notes

- **Bill Image:** Assumed to be uploaded to cloud storage (Supabase Storage or similar), endpoint returns URL
- **Fund Balance:** Calculated as `SUM(amount) WHERE status='approved'` for simplicity (can cache in fund_balance_logs)
- **One-level approval:** Member submits, co-manager(s) review, any co-manager can approve/reject
- **Race condition:** Use pessimistic lock on fund_balance_logs when updating balance

---

## 5. SECTION 2.4: MODULE 2 - AD-HOC CAMPAIGNS

### 5.1 API Endpoints

| Method | Endpoint | Role | Purpose |
| --- | --- | --- | --- |
| POST | `/api/campaigns` | co_manager+ | Create campaign |
| GET | `/api/campaigns` | member+ | List campaigns |
| GET | `/api/campaigns/:id` | member+ | Campaign detail |
| GET | `/api/campaigns/:id/assignments` | co_manager+ | Member assignment status |
| POST | `/api/campaigns/:id/assignments/:userId/confirm` | member | Member confirm will pay |
| POST | `/api/campaigns/:id/assignments/:userId/reject` | member | Member reject campaign |
| PATCH | `/api/campaigns/:id/assignments/:userId/approve` | co_manager+ | Co-manager approve charge |
| PATCH | `/api/campaigns/:id/assignments/:userId/reject` | co_manager+ | Co-manager reject |
| PATCH | `/api/campaigns/:id/assignments/:userId/exempt` | co_manager+ | Mark member exempt |
| POST | `/api/campaigns/:id/close` | co_manager+ | Close campaign |
| GET | `/api/campaigns/:id/report` | co_manager+ | Campaign report |

### 5.2 Campaign Assignment State Machine

```
pending_confirmation (initial)
    ↓
    ├─ member confirms ──→ pending_approval
    │                        ├─ co-manager approves ──→ approved (transaction created)
    │                        ├─ co-manager rejects ──→ rejected (no charge)
    │                        └─ co-manager exempts ──→ exempt (no charge)
    │
    ├─ member rejects ──→ rejected (no charge)
    │
    └─ co-manager exempts ──→ exempt (no charge)
```

### 5.3 Request/Response Examples

**Create Campaign**
```javascript
POST /api/campaigns
{
  "name": "Team Dinner June",
  "amount_per_member": 500000,
  "deadline": "2026-06-30",
  "description": "End of month celebration"
}

Response (201):
{
  "campaign_id": 456,
  "name": "Team Dinner June",
  "status": "active",
  "members_notified": 10,
  "assignments": [
    { user_id: 1, status: "pending_confirmation" },
    { user_id: 2, status: "pending_confirmation" },
    ...
  ]
}
```

**Member Confirm**
```javascript
POST /api/campaigns/456/assignments/1/confirm
{}

Response (200):
{
  "assignment_id": 789,
  "status": "pending_approval",
  "confirmed_at": "2026-06-22T10:30:00Z",
  "co_manager_notified": true
}
```

**Co-manager Approve**
```javascript
PATCH /api/campaigns/456/assignments/1/approve
{
  "approval_notes": "Approved"
}

Response (200):
{
  "assignment_id": 789,
  "status": "approved",
  "transaction_id": 999,
  "approved_at": "2026-06-22T11:00:00Z"
}
```

### 5.4 Database Changes

Schema updates:
```sql
ALTER TABLE campaign_assignments ADD COLUMN (
  confirmed_at TIMESTAMP,
  confirmed_by BIGINT REFERENCES users(id),
  rejected_at TIMESTAMP,
  rejected_reason TEXT,
  approved_at TIMESTAMP,
  approved_by BIGINT REFERENCES users(id),
  exempt_at TIMESTAMP,
  exempt_reason TEXT,
  transaction_id BIGINT REFERENCES fund_transactions(id)
);

CREATE INDEX idx_campaign_assignments_status 
  ON campaign_assignments(campaign_id, status);
```

---

## 6. SECTION 2.5: MODULE 3 - ATTENDANCE & GAMIFICATION

### 6.1 API Endpoints

| Method | Endpoint | Role | Purpose |
| --- | --- | --- | --- |
| POST | `/api/attendance/sessions` | co_manager+ | Create session |
| GET | `/api/attendance/sessions` | member+ | List sessions |
| GET | `/api/attendance/sessions/:id` | member+ | Session detail |
| POST | `/api/attendance/sessions/:id/check-in` | member | Member check-in |
| POST | `/api/attendance/sessions/:id/mark-absent` | co_manager+ | Mark member absent |
| POST | `/api/attendance/sessions/:id/close` | co_manager+ | Close session |
| GET | `/api/attendance/leaderboard` | member+ | Current month leaderboard |
| GET | `/api/attendance/leaderboard/:month` | member+ | Historical leaderboard |
| GET | `/api/attendance/stats/:userId` | member+ | User stats |
| GET | `/api/attendance/history` | member+ | Attendance history |

### 6.2 Points System

| Action | Points | Notes |
| --- | --- | --- |
| Check-in session | +10 | Basic attendance |
| Perfect attendance (30+ days) | +50 | Monthly bonus |
| Assist/Goal (manual) | +50 | Co-manager input |
| Absence penalty | -5 | Auto-applied if didn't check-in |

### 6.3 Request/Response Examples

**Create Session**
```javascript
POST /api/attendance/sessions
{
  "session_date": "2026-06-22T19:00:00Z",
  "location": "Sân bóng X",
  "session_type": "training",
  "description": "Regular training"
}

Response (201):
{
  "session_id": 111,
  "session_date": "2026-06-22T19:00:00Z",
  "status": "active",
  "members_notified": 12
}
```

**Check-in**
```javascript
POST /api/attendance/sessions/111/check-in
{}

Response (200):
{
  "attendance_id": 222,
  "status": "attended",
  "points_earned": 10,
  "leaderboard_rank": 5
}
```

**Get Leaderboard**
```javascript
GET /api/attendance/leaderboard

Response (200):
[
  {
    "rank": 1,
    "user_id": 1,
    "full_name": "Nguyễn A",
    "total_points": 150,
    "sessions_attended": 12,
    "badges": ["MVP"]
  },
  {
    "rank": 2,
    "user_id": 2,
    "full_name": "Trần B",
    "total_points": 140,
    "sessions_attended": 11,
    "badges": []
  },
  ...
]
```

### 6.4 Database Changes

New tables:
```sql
CREATE TABLE attendance_sessions (
  id BIGSERIAL PRIMARY KEY,
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  session_date TIMESTAMP NOT NULL,
  location VARCHAR(255),
  session_type VARCHAR(50) NOT NULL, -- 'training', 'match'
  description TEXT,
  created_by BIGINT NOT NULL REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'closed'
  created_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP,
  UNIQUE(team_id, session_date)
);

CREATE TABLE gamification_points (
  id BIGSERIAL PRIMARY KEY,
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INT NOT NULL,
  reason VARCHAR(100),
  month VARCHAR(7), -- 'YYYY-MM'
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_gamification_team_month (team_id, month),
  INDEX idx_gamification_user_month (user_id, month)
);

CREATE TABLE leaderboard_archives (
  id BIGSERIAL PRIMARY KEY,
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  month VARCHAR(7),
  top_3 JSONB, -- [{ rank, user_id, full_name, points }, ...]
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, month)
);
```

Schema updates:
```sql
ALTER TABLE attendance_records ADD COLUMN (
  session_id BIGINT REFERENCES attendance_sessions(id),
  checked_in_at TIMESTAMP,
  marked_by BIGINT REFERENCES users(id)
);

CREATE INDEX idx_attendance_sessions_team_date 
  ON attendance_sessions(team_id, session_date);
```

---

## 7. SECTION 2.6: CROSS-MODULE EVENT FLOWS

### 7.1 Event Integration Map

| Event | Triggered By | Handler | Action |
| --- | --- | --- | --- |
| `approval.pending` | ApprovalService | NotificationService | Send Zalo to co-managers |
| `approval.approved` | ApprovalService | NotificationService + Finance | Notify member + update balance |
| `approval.rejected` | ApprovalService | NotificationService | Notify member why rejected |
| `campaign.created` | Campaign handler | NotificationService | Notify active members |
| `campaign.member_confirmed` | Campaign handler | NotificationService | Notify co-managers |
| `campaign.charged` | Campaign handler | Finance service | Create transaction (auto-approved) |
| `campaign.closed` | Campaign handler | NotificationService | Send team summary |
| `attendance.session_created` | Attendance handler | NotificationService | Notify active members |
| `attendance.check_in` | Attendance handler | GamificationService | Add +10 points |
| `attendance.session_closed` | Attendance handler | GamificationService + Notification | Calculate penalties, send summary |
| `inngest.monthly_cron` | Cron (1st month) | Gamification + Notification | Archive leaderboard, reset points, send summaries |

### 7.2 Example: Campaign Charge Flow

```
Campaign co-manager approves member:
  PATCH /api/campaigns/:id/assignments/:userId/approve
    ↓
  ApprovalService.approveEntity()
    ↓
  Emit: 'campaign.charged'
    ↓
  Inngest handler:
    ├─ Create fund_transaction (auto-approved)
    ├─ Call GamificationService.addPoints() if applicable
    ├─ Update fund_balance_logs
    └─ Send Zalo: "✓ [amount] charged from campaign"
```

---

## 8. SECTION 2.7: ERROR HANDLING & EDGE CASES

### 8.1 Error Scenarios

| Scenario | HTTP Status | Error Code | Recovery |
| --- | --- | --- | --- |
| Submit transaction after campaign closed | 400 | CAMPAIGN_CLOSED | User sees message |
| Approve already-approved transaction | 409 | ALREADY_APPROVED | User refreshes |
| Check-in to closed session | 400 | SESSION_CLOSED | User sees message |
| Member deactivated mid-campaign | 400 | MEMBER_INACTIVE | Exclude from future notifications |
| Zalo API fails | 500 | ZALO_API_ERROR | Inngest retries 5x, logs to inngest_logs |
| Database race condition on balance | 409 | RACE_CONDITION | Use pessimistic lock |
| Invalid bill image URL | 400 | INVALID_IMAGE_URL | Return validation error |
| Insufficient permissions | 403 | RBAC_DENIED | Check JWT role in middleware |
| Team doesn't exist | 404 | TEAM_NOT_FOUND | Return 404 |

### 8.2 Retry Strategy

- **Inngest events:** 5 retries with exponential backoff (5s, 30s, 2min, 5min, 10min)
- **Zalo API calls:** 3 retries with backoff
- **Database transactions:** Optimistic locking with 3 retries
- **Failed events:** Logged to `inngest_logs` table, monitored by ops dashboard

---

## 9. SECTION 2.8: TESTING STRATEGY

### 9.1 Unit Tests

| Service | Test Cases |
| --- | --- |
| **ApprovalService** | - submitForApproval() emits event |
| | - approveEntity() updates status |
| | - rejectEntity() logs reason |
| | - getPendingApprovals() filters by team |
| **NotificationService** | - sendZaloMessage() queues correctly |
| | - emitEvent() sends to Inngest |
| | - sendInternalNotification() inserts row |
| **GamificationService** | - addPoints() calculates month correctly |
| | - getLeaderboard() ranks users |
| | - getUserStats() returns rank + points |

### 9.2 Integration Tests

| Module | Test Cases |
| --- | --- |
| **Finance** | - Member submits transaction |
| | - Transaction pending (not approved yet) |
| | - Co-manager approves, balance updates |
| | - Co-manager rejects, no balance change |
| | - Zalo notification sent to both parties |
| **Campaigns** | - Create campaign, members auto-included |
| | - Member confirms + co-manager approves |
| | - Transaction created automatically |
| | - Campaign closed, report generated |
| **Attendance** | - Create session, members notified |
| | - Member checks in, +10 points awarded |
| | - Session closed, leaderboard updated |
| | - Monthly cron resets points |

### 9.3 End-to-End Tests

- Full Finance workflow (submit → pending → approve → charged)
- Full Campaign workflow (create → member confirm → co-manager approve → charge)
- Full Attendance workflow (session → check-in → points → leaderboard)
- Cross-module: Campaign charge updates Finance balance

---

## 10. PHASE 2 DELIVERABLES CHECKLIST

### Domain Services
- [ ] ApprovalService implementation + unit tests
- [ ] NotificationService implementation + unit tests
- [ ] GamificationService implementation + unit tests

### Finance Module
- [ ] API endpoints (submit, approve, reject, balance, campaigns)
- [ ] Business logic handlers
- [ ] Database migrations
- [ ] Inngest event handlers
- [ ] Integration tests
- [ ] Zalo message templates

### Ad-hoc Campaigns Module
- [ ] API endpoints (create, confirm, approve, close, report)
- [ ] Campaign assignment state machine
- [ ] Business logic handlers
- [ ] Database migrations
- [ ] Inngest event handlers
- [ ] Integration tests
- [ ] Zalo message templates

### Attendance & Gamification Module
- [ ] API endpoints (create session, check-in, leaderboard, stats)
- [ ] Gamification points calculation
- [ ] Business logic handlers
- [ ] Database migrations
- [ ] Inngest monthly cron handler
- [ ] Leaderboard ranking + archival
- [ ] Integration tests
- [ ] Zalo message templates

### Cross-Module
- [ ] Event flow testing (campaign charge → finance update)
- [ ] End-to-end integration tests
- [ ] Error handling tests
- [ ] Documentation

---

## 11. PHASE 2 SUCCESS CRITERIA

✅ **Finance Module:**
- Transaction submit flow works (status = pending)
- Co-manager approval flow works (status = approved)
- Fund balance updates correctly
- Zalo notifications sent to all parties
- Rejection flow works (status = rejected)

✅ **Ad-hoc Campaigns:**
- Campaign creation auto-includes active members
- Member confirmation flow works
- Co-manager approval creates transaction
- Campaign closing generates report
- Zalo notifications sent at each step

✅ **Attendance & Gamification:**
- Session creation notifies members
- Check-in adds +10 points
- Leaderboard ranks users correctly
- Monthly reset works (1st of month)
- Zalo sends leaderboard summary

✅ **Cross-Module Integration:**
- Campaign charge creates Finance transaction
- All Inngest events processed successfully
- No silent failures (all errors logged)

---

## 12. NEXT STEPS (IMPLEMENTATION PLAN)

Once this spec is approved, proceed to **Implementation Phase**:

1. **Setup Phase (Days 1-2):**
   - Database migrations
   - Domain Services scaffold

2. **Parallel Development (Days 3-10):**
   - Track 1: Finance module
   - Track 2: Ad-hoc Campaigns module
   - Track 3: Attendance & Gamification module

3. **Integration (Days 11-12):**
   - Event flow testing
   - Cross-module integration tests

4. **Review (Days 13-14):**
   - Code review per PR
   - Deployment preparation

---

**Document prepared for user review.**
