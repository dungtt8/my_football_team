const supabase = require('../config/supabase');
const logger = require('../utils/logger');

const BUCKET_NAME = 'team-assets';
const QR_FOLDER = 'qr-codes';

/**
 * Upload QR code image to Supabase Storage
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {string} fileName - Original file name
 * @param {number} teamId - Team ID for organizing files
 * @returns {Promise<{url: string, path: string}>} - Public URL and storage path
 */
const uploadQRCode = async (fileBuffer, fileName, teamId) => {
    try {
        // Validate file size (max 2MB)
        if (fileBuffer.length > 2 * 1024 * 1024) {
            throw new Error('File size exceeds 2MB limit');
        }

        // Validate MIME type
        const validMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const fileExtension = fileName.split('.').pop().toLowerCase();
        const mimeType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;

        if (!validMimes.includes(mimeType)) {
            throw new Error('Only JPEG, PNG, GIF, and WebP images are allowed');
        }

        // Create unique file path: qr-codes/team-{teamId}/timestamp-filename
        const timestamp = Date.now();
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${QR_FOLDER}/team-${teamId}/${timestamp}-${sanitizedFileName}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, fileBuffer, {
                contentType: mimeType,
                upsert: false
            });

        if (error) {
            logger.error('Supabase upload error', { error, teamId, fileName });
            throw new Error(`Upload failed: ${error.message}`);
        }

        // Get public URL
        const { data: publicData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        logger.info('QR code uploaded successfully', {
            team_id: teamId,
            file_path: filePath,
            url: publicData.publicUrl
        });

        return {
            url: publicData.publicUrl,
            path: filePath
        };
    } catch (error) {
        logger.error('Error uploading QR code', { error: error.message, teamId, fileName });
        throw error;
    }
};

/**
 * Delete QR code image from Supabase Storage
 * @param {string} filePath - Storage file path
 * @param {number} teamId - Team ID for logging
 */
const deleteQRCode = async (filePath, teamId) => {
    try {
        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([filePath]);

        if (error) {
            logger.error('Supabase delete error', { error, teamId, filePath });
            throw new Error(`Delete failed: ${error.message}`);
        }

        logger.info('QR code deleted successfully', {
            team_id: teamId,
            file_path: filePath
        });
    } catch (error) {
        logger.error('Error deleting QR code', { error: error.message, teamId, filePath });
        throw error;
    }
};

module.exports = {
    uploadQRCode,
    deleteQRCode,
    BUCKET_NAME,
    QR_FOLDER
};
