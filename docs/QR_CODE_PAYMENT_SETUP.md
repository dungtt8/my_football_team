# QR Code Payment Settings Implementation

## Overview
This feature enables team owners to manage QR code payment settings for fund collections. Members can view payment QR codes when payment deadlines are active.

## Database Schema
Already implemented in migration `011_team_fund_info.js`:
- `bank_account_number` - Bank account number (string, 50 chars max)
- `bank_name` - Bank name (string, 100 chars max)
- `fund_qr_code_url` - URL to QR code image (string, 500 chars max)

## Backend Implementation

### New Endpoints

#### Upload QR Code
```
POST /api/team/settings/qr-code/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form Data:
- qr_code: File (JPEG, PNG, GIF, WebP; max 2MB)

Response (200):
{
  "message": "QR code uploaded successfully",
  "qr_code_url": "https://..."
}

Errors:
- 400: Invalid file type or size
- 401: Not authenticated
- 403: Not team owner
```

#### Delete QR Code
```
DELETE /api/team/settings/qr-code
Authorization: Bearer {token}

Response (200):
{
  "message": "QR code deleted successfully"
}

Errors:
- 401: Not authenticated
- 403: Not team owner
- 404: QR code not found
```

#### Update Bank Info (via existing endpoint)
```
PUT /api/team/settings
Authorization: Bearer {token}

Request:
{
  "fund": {
    "bank_name": "Vietcombank",
    "bank_account_number": "1234567890",
    "qr_code_url": "https://..." // Set via upload endpoint
  }
}

Response (200):
{
  "message": "Settings updated successfully",
  "fund": {
    "bank_account_number": "1234567890",
    "bank_name": "Vietcombank",
    "qr_code_url": "https://..."
  }
}
```

#### Get Settings (existing endpoint, now includes fund info)
```
GET /api/team/settings
Authorization: Bearer {token}

Response (200):
{
  "fund": {
    "bank_account_number": "1234567890",
    "bank_name": "Vietcombank",
    "qr_code_url": "https://..."
  },
  ...
}
```

## Frontend Components

### QRCodeSettings Component
Location: `frontend/components/Finance/QRCodeSettings.tsx`

Features:
- Display and edit bank account number
- Display and edit bank name
- Upload QR code image with preview
- Delete QR code
- Owner-only edit capabilities
- Validation for file type and size

Props:
- `isOwner: boolean` - Whether user is team owner
- `readOnly?: boolean` - Read-only mode

### PaymentQRDisplay Component
Location: `frontend/components/Finance/PaymentQRDisplay.tsx`

Features:
- Display QR code and bank info when payment deadline is active
- Show for all team members during payment periods
- Automatically hidden outside payment deadline window

## Storage Service

Location: `backend/src/services/storageService.js`

Functions:
- `uploadQRCode(fileBuffer, fileName, teamId)` - Upload QR code to Supabase Storage
- `deleteQRCode(filePath, teamId)` - Delete QR code from storage

## Environment Variables Required

Add to backend `.env`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
```

## Integration with Finance Page

The Finance page now includes:
1. **PaymentQRDisplay** - Shows payment deadline banner with QR code when active
2. **QRCodeSettings** - Shows for owners to manage bank details and QR codes

## User Flow

### For Team Owners:
1. Navigate to Finance section
2. Scroll to "Cài đặt thanh toán" section
3. Enter bank name and account number
4. Upload QR code image (JPEG, PNG, GIF, or WebP)
5. Save settings

### For Team Members:
1. During payment deadline period, see banner on home page and Finance section
2. View bank information and QR code
3. Use QR code to transfer money via banking app

## File Uploads

- Stored in Supabase Storage bucket: `team-assets`
- Folder structure: `qr-codes/team-{teamId}/{timestamp}-{filename}`
- Max file size: 2MB
- Allowed formats: JPEG, PNG, GIF, WebP
- Public URL access for members

## Dependencies Added

Backend:
- `@supabase/supabase-js@^2.38.4` - Supabase client
- `multer@^1.4.5-lts.1` - File upload middleware

## Testing

### Test Upload:
```bash
curl -X POST http://localhost:8000/api/team/settings/qr-code/upload \
  -H "Authorization: Bearer {token}" \
  -F "qr_code=@qrcode.png"
```

### Test Delete:
```bash
curl -X DELETE http://localhost:8000/api/team/settings/qr-code \
  -H "Authorization: Bearer {token}"
```

### Test Settings:
```bash
curl http://localhost:8000/api/team/settings \
  -H "Authorization: Bearer {token}"
```
