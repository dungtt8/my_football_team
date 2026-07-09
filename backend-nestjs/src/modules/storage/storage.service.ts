import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import logger from '../../common/utils/logger';

const BUCKET_NAME = 'team-assets';
const QR_FOLDER = 'qr-codes';
const BILLS_FOLDER = 'bills';

/**
 * Port of backend/src/services/storageService.js (+ config/supabase.js).
 * Supabase Storage is used only for file uploads (QR codes, bill images);
 * everything else goes through Prisma/Postgres.
 */
@Injectable()
export class StorageService {
  public readonly BUCKET_NAME = BUCKET_NAME;
  public readonly QR_FOLDER = QR_FOLDER;
  public readonly BILLS_FOLDER = BILLS_FOLDER;
  private readonly supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        `Missing Supabase configuration. Required environment variables:\n` +
          `  SUPABASE_URL: ${supabaseUrl ? '✓' : '✗ NOT SET'}\n` +
          `  SUPABASE_SERVICE_KEY: ${supabaseServiceKey ? '✓' : '✗ NOT SET'}\n` +
          `Please set these environment variables in your .env file.`,
      );
    }
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  async uploadImage(
    fileBuffer: Buffer,
    fileName: string,
    folder: string,
    teamId: number | string | bigint,
  ): Promise<{ url: string; path: string }> {
    try {
      if (fileBuffer.length > 2 * 1024 * 1024) {
        throw new Error('File size exceeds 2MB limit');
      }

      const validMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const fileExtension = fileName.split('.').pop()!.toLowerCase();
      const mimeType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;

      if (!validMimes.includes(mimeType)) {
        throw new Error('Only JPEG, PNG, GIF, and WebP images are allowed');
      }

      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${folder}/team-${teamId}/${timestamp}-${sanitizedFileName}`;

      const { error } = await this.supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, fileBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (error) {
        logger.error('Supabase upload error', {
          error,
          teamId,
          fileName,
          folder,
        });
        if (error.message?.includes('Bucket not found')) {
          throw new Error(
            `Storage bucket "${BUCKET_NAME}" not found. ` +
              `Create it in the Supabase dashboard (bucket "${BUCKET_NAME}").`,
          );
        }
        throw new Error(`Upload failed: ${error.message}`);
      }

      const { data: publicData } = this.supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      logger.info('Image uploaded successfully', {
        team_id: teamId,
        file_path: filePath,
        url: publicData.publicUrl,
      });

      return { url: publicData.publicUrl, path: filePath };
    } catch (error: any) {
      logger.error('Error uploading image', {
        error: error.message,
        teamId,
        fileName,
        folder,
      });
      throw error;
    }
  }

  uploadQRCode(
    fileBuffer: Buffer,
    fileName: string,
    teamId: number | string | bigint,
  ) {
    return this.uploadImage(fileBuffer, fileName, QR_FOLDER, teamId);
  }

  uploadBillImage(
    fileBuffer: Buffer,
    fileName: string,
    teamId: number | string | bigint,
  ) {
    return this.uploadImage(fileBuffer, fileName, BILLS_FOLDER, teamId);
  }

  async deleteQRCode(
    filePath: string,
    teamId: number | string | bigint,
  ): Promise<void> {
    try {
      const { error } = await this.supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath]);
      if (error) {
        logger.error('Supabase delete error', { error, teamId, filePath });
        throw new Error(`Delete failed: ${error.message}`);
      }
      logger.info('QR code deleted successfully', {
        team_id: teamId,
        file_path: filePath,
      });
    } catch (error: any) {
      logger.error('Error deleting QR code', {
        error: error.message,
        teamId,
        filePath,
      });
      throw error;
    }
  }
}
