# Timezone Conversion Guide: GMT+7 (Vietnam Time)

## Overview

The application uses **UTC (Coordinated Universal Time)** for storage and cron job execution, but displays and accepts times in **GMT+7 (Vietnam Time)** from the user interface.

**Why this approach?**
- UTC ensures consistent behavior across different server regions
- Inngest cron jobs work in UTC by default
- Frontend users enter times in their local timezone (GMT+7)

---

## Architecture

### Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│          USER INTERFACE (Frontend)                  │
│          Times displayed in GMT+7                   │
│  Example: 20:00 (Ghi danh lúc 20:00 Vietnam)       │
└────────────┬──────────────────────────────────────┘
             │
             │ User enters 20:00 (GMT+7)
             │
             ▼
        ┌────────────────┐
        │ gmt7ToUtc()    │ Convert GMT+7 → UTC
        │  20:00 → 13:00 │
        └────────┬───────┘
                 │
                 ▼ Sends 13:00 (UTC) to backend
┌─────────────────────────────────────────────────────┐
│         BACKEND API & DATABASE                      │
│         Stores times in UTC                         │
│  - teams.checkin_creation_time = "13:00" (UTC)     │
│  - teams.auto_session_creation_time = "03:00" (UTC)│
└────────────┬──────────────────────────────────────┘
             │
             │ Cron job reads 13:00 (UTC)
             │ Compares with current UTC time
             │
             ▼ If matches: create check-in notifications
        ┌────────────────────────────────┐
        │  Inngest Daily Cron Job        │
        │  checkinService.js             │
        │  Checks UTC time = 13:00?      │
        │  Action: Send Zalo notification│
        └────────────────────────────────┘
             │
             │ User requests settings
             │
             ▼ Returns UTC from DB
        ┌────────────────┐
        │ utcToGmt7()    │ Convert UTC → GMT+7
        │  13:00 → 20:00 │
        └────────┬───────┘
                 │
                 ▼ Returns 20:00 (GMT+7) to frontend
┌─────────────────────────────────────────────────────┐
│          USER INTERFACE (Frontend)                  │
│          Displays 20:00 GMT+7                       │
└─────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Utility Functions

#### Backend: `backend/src/utils/timeZoneConverter.js`

```javascript
const { utcToGmt7, gmt7ToUtc } = require('../utils/timeZoneConverter');

// Convert UTC to GMT+7 (for frontend display)
utcToGmt7('13:00') // Returns: '20:00'

// Convert GMT+7 to UTC (for storage)
gmt7ToUtc('20:00') // Returns: '13:00'
```

**Exports:**
- `utcToGmt7(timeUtc: string): string` - Add 7 hours, handle day overflow
- `gmt7ToUtc(timeGmt7: string): string` - Subtract 7 hours, handle day underflow

#### Frontend: `frontend/lib/timeZoneConverter.ts`

Same functions, exported as TypeScript with proper type annotations.

```typescript
import { utcToGmt7, gmt7ToUtc } from '@/lib/timeZoneConverter';

const vietnamTime = utcToGmt7('13:00'); // '20:00'
const utcTime = gmt7ToUtc('20:00');     // '13:00'
```

---

### 2. Backend Implementation

#### API: GET `/api/team/settings`

**Response:** Times are automatically converted from UTC → GMT+7

```javascript
// backend/src/handlers/teamHandler.js
const getSettings = async (req, res) => {
    // ...
    const scheduling = {
        auto_session_creation_time: utcToGmt7(team.auto_session_creation_time || '03:00'),
        checkin_creation_time: utcToGmt7(team.checkin_creation_time || '20:00'),
        // ... other fields
    };
    return res.json({ scheduling });
};
```

**Example Response:**
```json
{
  "scheduling": {
    "checkin_creation_time": "20:00",
    "checkin_creation_day": "mon",
    "checkin_start_day": "fri",
    "checkin_end_day": "tue"
  }
}
```

#### API: PUT `/api/team/settings`

**Request Body:** Frontend sends times in GMT+7, automatically converted to UTC before storage

```javascript
// backend/src/handlers/teamHandler.js
const updateSettings = async (req, res) => {
    const { scheduling } = req.body;
    
    // User sends: checkin_creation_time = "20:00" (GMT+7)
    // Convert to UTC before saving
    updates.checkin_creation_time = gmt7ToUtc(scheduling.checkin_creation_time); // "13:00"
    
    // Save "13:00" to database
    await db('teams').where({ id: teamId }).update(updates);
};
```

**Example Request:**
```json
{
  "scheduling": {
    "checkin_creation_time": "20:00",
    "checkin_creation_day": "mon"
  }
}
```

**Stored in Database:**
```sql
UPDATE teams SET 
  checkin_creation_time = '13:00',    -- Converted to UTC
  checkin_creation_day = 'mon'
WHERE id = 1;
```

---

### 3. Frontend Implementation

#### Team Settings Page: `frontend/app/app/team/settings/page.tsx`

**Load Settings:**
```typescript
const loadSettings = async () => {
    const data = await fetch('/api/team/settings');
    
    // API returns UTC times
    // Convert UTC → GMT+7 for display
    setSettings({
        checkin_creation_time: utcToGmt7(data.scheduling.checkin_creation_time), // "13:00" → "20:00"
    });
};
```

**Save Settings:**
```typescript
const handleSaveSettings = async () => {
    const payload = {
        scheduling: {
            // User entered GMT+7
            // Convert to UTC before sending
            checkin_creation_time: gmt7ToUtc(settings.checkin_creation_time), // "20:00" → "13:00"
        }
    };
    
    await fetch('/api/team/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
};
```

---

## Example Scenario

**User wants check-in notifications on Monday at 20:00 Vietnam time**

### Step 1: User sets in UI
- Opens: Team Settings → Scheduling tab
- Selects: "Thứ 2" (Monday)
- Sets time: 20:00 (displayed as GMT+7)

### Step 2: Frontend sends to backend
```
POST /api/team/settings
{
  "scheduling": {
    "checkin_creation_day": "mon",
    "checkin_creation_time": "20:00"  ← User input (GMT+7)
  }
}
```

### Step 3: Backend converts and stores
```javascript
gmt7ToUtc('20:00') // Converts to '13:00'

// Saves to database
UPDATE teams SET
  checkin_creation_day = 'mon',
  checkin_creation_time = '13:00'  ← Stored as UTC
```

### Step 4: Inngest cron job checks
- **Every day at UTC time check:**
  - Is today Monday? ✓
  - Is current UTC time ≥ 13:00? ✓
  - Not yet notified this week? ✓
  - **Action:** Create check-in notifications for all team members

### Step 5: User loads settings again
- Frontend receives from API: `checkin_creation_time = "13:00"` (UTC)
- Frontend converts: `utcToGmt7('13:00')` → `"20:00"`
- Display shows: **20:00** ✓

---

## Edge Cases Handled

### 1. Day Boundary Crossing

**Example:** User enters 02:00 GMT+7 (middle of night)
```
gmt7ToUtc('02:00')
→ 02:00 - 7:00 = -5:00
→ -5:00 + 24:00 = 19:00 (previous day in UTC)
```

Stored as `"19:00"` (which is previous day in UTC).

### 2. Returning from UTC edge times

**Example:** Backend returns 06:00 UTC
```
utcToGmt7('06:00')
→ 06:00 + 7:00 = 13:00 (same day in GMT+7)
```

Displays as `"13:00"`.

### 3. Invalid input handling

Both functions check for invalid format and return input unchanged:
```javascript
utcToGmt7('invalid')   // Returns: 'invalid'
gmt7ToUtc(null)        // Returns: null
gmt7ToUtc(undefined)   // Returns: undefined
```

---

## Default Values

| Field | UTC Default | Display (GMT+7) |
|-------|-------------|-----------------|
| `auto_session_creation_time` | `"03:00"` | `"10:00"` (3 AM + 7 = 10 AM) |
| `checkin_creation_time` | `"13:00"` | `"20:00"` (1 PM + 7 = 8 PM) |

---

## Testing

### Verify conversions

```bash
cd backend && node -e "
const { utcToGmt7, gmt7ToUtc } = require('./src/utils/timeZoneConverter.js');

// Round-trip test
const original = '20:00';
const utc = gmt7ToUtc(original);      // '13:00'
const backToGmt7 = utcToGmt7(utc);    // '20:00'
console.assert(original === backToGmt7, 'Conversion mismatch!');
"
```

---

## Related Files

- Backend utility: [backend/src/utils/timeZoneConverter.js](backend/src/utils/timeZoneConverter.js)
- Frontend utility: [frontend/lib/timeZoneConverter.ts](frontend/lib/timeZoneConverter.ts)
- Backend handler: [backend/src/handlers/teamHandler.js](backend/src/handlers/teamHandler.js) (getSettings, updateSettings)
- Frontend settings: [frontend/app/app/team/settings/page.tsx](frontend/app/app/team/settings/page.tsx)
- Cron service: [backend/src/services/checkinService.js](backend/src/services/checkinService.js) (uses UTC)

---

## Migration Notes

✅ **Database stored values remain UTC** - No migration needed  
✅ **Cron jobs continue working with UTC** - No changes to Inngest schedule logic  
✅ **API returns GMT+7 to frontend** - Better UX for Vietnamese users  
✅ **Backward compatible** - Old UTC times in DB work without modification
