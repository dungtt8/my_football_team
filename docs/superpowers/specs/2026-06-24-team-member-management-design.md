# Team Member Management & Jersey Number Feature Design
**Date:** 2026-06-24  
**Version:** 1.0  
**Status:** Design Approved

---

## 1. Overview

This spec defines two connected features:
1. **Team Member Lifecycle Management** - deactivate (soft-pause) and kick (hard-remove) members
2. **Jersey Number Setup** - members self-assign team-specific jersey numbers

These features enhance team roster management and provide better control over member participation in fund collections and attendance tracking.

---

## 2. Requirements & Constraints

### 2.1 Member Deactivation (Soft-Pause)

**Behavior:**
- Member retains team_members database record (not deleted)
- Status changes to `'inactive'`
- `deactivated_at` timestamp recorded for audit trail
- Member **can still view** team dashboard, history, and past records
- Member **excluded from** fund collection notifications
- Member **excluded from** attendance check-in requests
- Member can reactivate by joining team via invite code again

**Permissions:**
- Owner and co_manager can deactivate any team member
- Cannot deactivate owner (self-protection)
- Cannot deactivate another owner

### 2.2 Member Kick (Hard-Remove)

**Behavior:**
- Member loses all team access (functionally removed)
- Status changes to `'kicked'`
- `deleted_at` timestamp recorded (soft-delete pattern)
- Member **cannot query** team data via RLS
- Member **cannot rejoin** without explicit re-invitation
- Managers **can still query** kicked member's historical fund & attendance records

**Permissions:**
- Owner and co_manager can kick any team member
- Cannot kick owner (self-protection)
- Cannot kick another owner

### 2.3 Jersey Number Setup

**Behavior:**
- Team-specific assignment (per team_members record)
- Members self-set via dedicated endpoint
- Optional field (can be null)
- Any positive integer allowed
- No uniqueness constraint (multiple members can have same number)
- Displayed in team roster and leaderboard views

**Permissions:**
- Members can update only their own jersey number
- No manager override (members have full control)

---

## 3. Data Model Changes

### 3.1 Database Schema

**Migration File:** `009_team_member_management.js`

```sql
ALTER TABLE team_members 
ADD COLUMN jersey_number INTEGER NULL;

-- Indexes
CREATE INDEX idx_team_members_jersey ON team_members(team_id, jersey_number);
```

**Updated `team_members` table structure:**
```sql
CREATE TABLE team_members (
  id BIGINT PRIMARY KEY,
  team_id BIGINT NOT NULL (FK: teams.id),
  user_id BIGINT NOT NULL (FK: users.id),
  role VARCHAR(50) NOT NULL,           -- 'owner', 'co_manager', 'member'
  status VARCHAR(50) DEFAULT 'active',  -- 'active', 'inactive', 'kicked'
  jersey_number INTEGER NULL,           -- NEW: team-specific jersey number
  deactivated_at TIMESTAMP NULL,        -- existing: soft-pause audit trail
  deleted_at TIMESTAMP NULL,            -- existing: hard-remove audit trail (soft-delete)
  created_at TIMESTAMP,
  UNIQUE(team_id, user_id),
  INDEX(team_id, status),
  INDEX(team_id, role),
  INDEX(team_id, jersey_number)         -- NEW: for roster queries
);
```

### 3.2 Status Values

| Status | Behavior | DB Record | Access |
|--------|----------|-----------|--------|
| `active` | Normal participation | Exists | Full access |
| `inactive` | Excluded from notifications | Exists | Read-only (team data, history) |
| `kicked` | Removed from team | Exists (soft-delete) | No access (RLS blocks) |

---

## 4. API Endpoints

### 4.1 Deactivate Member

**Endpoint:** `PUT /api/team/members/:memberId/deactivate`  
**Auth:** JWT required (team_id context)  
**Permission:** owner, co_manager  
**Rate Limit:** Standard (5req/min per user)

**Request:**
```json
{}
```

**Response (200 OK):**
```json
{
  "id": 42,
  "team_id": 1,
  "user_id": 123,
  "role": "member",
  "status": "inactive",
  "jersey_number": 10,
  "deactivated_at": "2026-06-24T10:30:00Z",
  "created_at": "2026-06-01T08:00:00Z"
}
```

**Error Cases:**
- `404 NotFoundError` - member not found in team
- `403 ForbiddenError` - caller is not owner/co_manager
- `403 ForbiddenError` - cannot deactivate self
- `403 ForbiddenError` - cannot deactivate owner

**Logic:**
1. Verify member exists in team
2. Check caller has permission (owner or co_manager)
3. Prevent self-deactivation
4. Prevent deactivating owner
5. Update: `status = 'inactive'`, `deactivated_at = NOW()`
6. Return updated member record

---

### 4.2 Kick Member

**Endpoint:** `PUT /api/team/members/:memberId/kick`  
**Auth:** JWT required (team_id context)  
**Permission:** owner, co_manager  
**Rate Limit:** Standard (5req/min per user)

**Request:**
```json
{}
```

**Response (200 OK):**
```json
{
  "message": "Member kicked successfully",
  "member_id": 42,
  "team_id": 1,
  "user_id": 123,
  "status": "kicked"
}
```

**Error Cases:**
- `404 NotFoundError` - member not found in team
- `403 ForbiddenError` - caller is not owner/co_manager
- `403 ForbiddenError` - cannot kick self
- `403 ForbiddenError` - cannot kick owner

**Logic:**
1. Verify member exists in team
2. Check caller has permission (owner or co_manager)
3. Prevent self-kicking
4. Prevent kicking owner
5. Update: `status = 'kicked'`, `deleted_at = NOW()`
6. Return confirmation message

---

### 4.3 Update Jersey Number

**Endpoint:** `PUT /api/members/jersey-number`  
**Auth:** JWT required  
**Permission:** Self-update (authenticated user)  
**Rate Limit:** Standard (10req/min per user)

**Request:**
```json
{
  "team_id": 1,
  "jersey_number": 10
}
```

**Response (200 OK):**
```json
{
  "id": 42,
  "team_id": 1,
  "user_id": 123,
  "jersey_number": 10,
  "role": "member",
  "status": "active",
  "created_at": "2026-06-01T08:00:00Z"
}
```

**Error Cases:**
- `404 NotFoundError` - user not member of team
- `400 ValidationError` - jersey_number is not positive integer
- `400 ValidationError` - jersey_number exceeds safe integer range

**Logic:**
1. Verify user is member of team (status = 'active' or 'inactive')
2. Validate jersey_number: positive integer or null
3. Update: `jersey_number = value`
4. Return updated member record

---

## 5. Frontend Impact (Phase 3)

### 5.1 Team Members Roster UI

**Location:** `/app/team/settings` → Members tab  
**Manager View:**
- Member list with jersey number display
- Deactivate button (per member)
- Kick button (per member)
- Action confirmation dialogs

**Member View:**
- Own jersey number in roster
- Inline edit for own jersey number (or modal form)
- Cannot see deactivate/kick actions

### 5.2 Data Exclusion Logic

**Fund Collection:**
- Query: `WHERE status = 'active'` (exclude inactive, kicked)
- Notifications only sent to active members

**Attendance Check-In:**
- Query: `WHERE status = 'active'` (exclude inactive, kicked)
- Only active members can check in or be marked absent

**Leaderboard:**
- Query: `WHERE status = 'active'` (exclude inactive, kicked)
- Both current and historical leaderboards

---

## 6. Business Logic & Validation

### 6.1 Deactivation Workflow
1. Manager selects member to deactivate
2. Confirmation dialog warns: "Member will be excluded from fund collection and attendance"
3. On confirm: API call updates status to 'inactive'
4. Member can reactivate via invite code flow (rejoins as active)

### 6.2 Kick Workflow
1. Manager selects member to kick
2. Confirmation dialog warns: "Member will lose all team access. Historical records remain visible."
3. On confirm: API call updates status to 'kicked'
4. Member cannot rejoin unless explicitly re-invited

### 6.3 Jersey Number Validation
- Positive integers only (0 not allowed, null allowed)
- No length restriction (supports 1-999 etc.)
- No uniqueness check (business allows duplicates)
- Safe integer range: 1 to 9,999,999

---

## 7. RLS Policies (Supabase)

### 7.1 Team Members Access

**For 'active' members:** Can read own record + see roster (team_members filtered to active/inactive)

**For 'inactive' members:** Can read own record + see own data, cannot modify

**For 'kicked' members:** Cannot read any team_members records, cannot access team data

### 7.2 Fund & Attendance Queries

**Existing logic (no change):**
- Finance: Already filters by status = 'active' in transaction queries
- Attendance: Already filters by status = 'active' in session queries
- Leaderboard: Already filters by status = 'active'

---

## 8. Error Handling

| Scenario | HTTP Status | Error Code | Message |
|----------|------------|-----------|---------|
| Member not found | 404 | NotFoundError | Team member not found |
| Insufficient permission | 403 | ForbiddenError | Only owner and co_manager can manage members |
| Cannot modify self | 403 | ForbiddenError | Cannot deactivate/kick yourself |
| Cannot modify owner | 403 | ForbiddenError | Cannot deactivate/kick team owner |
| Invalid jersey number | 400 | ValidationError | Jersey number must be positive integer |
| Member not in team | 404 | NotFoundError | User is not member of this team |

---

## 9. Testing Strategy

### 9.1 Unit Tests
- Deactivate endpoint: permission checks, status update, audit trail
- Kick endpoint: permission checks, soft-delete, historical record access
- Jersey number: validation, self-update, optional field

### 9.2 Integration Tests
- Deactivate → member excluded from fund notifications
- Deactivate → member can still view team history
- Kick → member cannot query team data
- Kick → managers can still see historical records
- Jersey number → updates in roster and leaderboard

### 9.3 RLS Validation
- Kicked member cannot read team_members table
- Inactive member can read own record only
- Managers can read historical records of kicked members

---

## 10. Rollout Plan

**Phase 1 (Backend):** Database migration + 3 endpoints
**Phase 2 (Frontend):** Team settings UI + roster management
**Phase 3 (Monitoring):** Track deactivation/kick events via logging

---

## 11. Implementation Checklist

- [ ] Create migration file `009_team_member_management.js`
- [ ] Add jersey_number column to team_members
- [ ] Implement `PUT /api/team/members/:memberId/deactivate`
- [ ] Implement `PUT /api/team/members/:memberId/kick`
- [ ] Implement `PUT /api/members/jersey-number`
- [ ] Register endpoints in app.js
- [ ] Add error handling + validation
- [ ] Write unit tests for all 3 endpoints
- [ ] Update RLS policies if needed
- [ ] Frontend: Team settings roster UI
- [ ] Frontend: Jersey number edit component
- [ ] Frontend: Action confirmation dialogs
- [ ] Integration test: fund collection excludes inactive
- [ ] Integration test: attendance excludes inactive
- [ ] Verify leaderboard excludes inactive/kicked

---

**Ready for implementation?** 🚀
