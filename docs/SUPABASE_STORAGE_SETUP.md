# Supabase Storage Setup Guide

This guide explains how to set up Supabase Storage for QR code uploads in the football team management platform.

## Quick Setup

### Option 1: Automated (Recommended)

```bash
cd backend
node scripts/setup-storage.js
```

This script will:
- Connect to your Supabase project using `SUPABASE_SERVICE_KEY`
- Create the `team-assets` bucket if it doesn't exist
- Set proper public access permissions
- Verify everything is configured correctly

### Option 2: Manual Setup

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Click **Storage** in the left sidebar
4. Click **+ New bucket**
5. Configure:
   - **Name:** `team-assets`
   - **Make Public:** ✓ Yes (checked)
6. Click **Create bucket**

## Verify Storage Setup

After creating the bucket, verify it's working:

```bash
# Test upload functionality
curl -X POST http://localhost:3001/api/team/settings/qr-code/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "qr_code=@/path/to/image.jpg"
```

Expected response:
```json
{
  "message": "QR code uploaded successfully",
  "qr_code_url": "https://xxxxx.supabase.co/storage/v1/object/public/team-assets/qr-codes/team-1/timestamp-image.jpg"
}
```

## Troubleshooting

### Error: "Bucket not found"

**Cause:** The `team-assets` bucket doesn't exist in your Supabase Storage

**Solution:**
1. Run the automated setup: `node scripts/setup-storage.js`
2. **OR** manually create the bucket following the "Manual Setup" steps above

### Error: "Permission denied"

**Cause:** `SUPABASE_SERVICE_KEY` is not properly set or doesn't have storage permissions

**Solution:**
1. Verify environment variables are set:
   ```bash
   echo $SUPABASE_URL
   echo $SUPABASE_SERVICE_KEY
   ```
2. Go to Supabase Dashboard → Settings → API
3. Copy the **Service Role Secret** (make sure it's the right key, not the anon key)
4. Update `.env` with correct value: `SUPABASE_SERVICE_KEY=sk_service_...`

### Error: "CORS policy blocked"

**Cause:** Cross-origin requests not allowed from frontend

**Solution:**
1. Go to Supabase Dashboard → Storage → Select bucket
2. Click **Settings** icon (⚙️)
3. In **CORS Policy**, add your frontend domain:
   ```
   {
     "origins": ["https://yourdomain.com", "http://localhost:3000"],
     "allowedHeaders": ["*"],
     "methods": ["GET", "POST", "PUT", "DELETE"],
     "exposedHeaders": ["*"],
     "maxAgeSeconds": 3600
   }
   ```

## Environment Variables

Required in `.env` for storage to work:

```env
# Supabase Storage API
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=sk_service_xxxxx...
```

**Location:**
- `SUPABASE_URL`: Supabase Dashboard → Settings → API → Project URL
- `SUPABASE_SERVICE_KEY`: Supabase Dashboard → Settings → API → Service Role Secret

⚠️ **Keep SUPABASE_SERVICE_KEY secret** - Never commit to git or share publicly

## Architecture

```
Supabase Storage
├── team-assets (bucket, public)
│   └── qr-codes/ (folder)
│       ├── team-1/
│       │   ├── 1719387305000-qr-code.jpg
│       │   └── 1719387456789-qr-code.png
│       ├── team-2/
│       │   └── 1719387502000-qr-code.jpg
│       └── team-N/
│           └── ...
```

Each team's QR codes are organized in separate folders under `qr-codes/team-{teamId}/`.

## API Endpoint

**Upload QR Code:**
```
POST /api/team/settings/qr-code/upload

Form Data:
- qr_code: File (JPEG, PNG, GIF, WebP, max 2MB)

Response:
{
  "message": "QR code uploaded successfully",
  "qr_code_url": "https://xxxxx.supabase.co/storage/v1/object/public/team-assets/qr-codes/team-1/timestamp-filename.jpg"
}
```

**Headers:**
- `Authorization: Bearer {JWT_TOKEN}`

## Related Documentation

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [QR Code Payment Setup](./QR_CODE_PAYMENT_SETUP.md)
- [Local Setup Guide](./LOCAL_SETUP.md)
