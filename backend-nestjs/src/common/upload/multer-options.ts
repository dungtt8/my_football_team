import { memoryStorage } from 'multer';

/**
 * Mirrors the multer config in backend/src/app.js:
 *  - in-memory storage (buffers handed to Supabase Storage)
 *  - 2MB max file size
 *  - only JPEG/PNG/GIF/WebP images allowed
 */
export const imageMulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
    }
  },
};
