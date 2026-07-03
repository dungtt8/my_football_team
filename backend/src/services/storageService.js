const supabase = require('../config/supabase');
const logger = require('../utils/logger');

const BUCKET_NAME = 'team-assets';
const QR_FOLDER = 'qr-codes';
const BILLS_FOLDER = 'bills';

/**
 * Generic image upload to Supabase Storage
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {string} fileName - Original file name
 * @param {string} folder - Storage folder (e.g. 'qr-codes', 'bills')
 * @param {number} teamId - Team ID for organizing files
 * @returns {Promise<{url: string, path: string}>} - Public URL and storage path
 */
const uploadImage = async (fileBuffer, fileName, folder, teamId) => {
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

        // Create unique file path: {folder}/team-{teamId}/timestamp-filename
        const timestamp = Date.now();
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${folder}/team-${teamId}/${timestamp}-${sanitizedFileName}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, fileBuffer, {
                contentType: mimeType,
                upsert: false
            });

        if (error) {
            logger.error('Supabase upload error', { error, teamId, fileName, folder });

            // Provide helpful error messages
            if (error.message?.includes('Bucket not found')) {
                throw new Error(
                    `Storage bucket "${BUCKET_NAME}" not found. ` +
                    `Run 'node scripts/setup-storage.js' to create it, or create manually in Supabase dashboard.`
                );
            }

            throw new Error(`Upload failed: ${error.message}`);
        }

        // Get public URL
        const { data: publicData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        logger.info('Image uploaded successfully', {
            team_id: teamId,
            file_path: filePath,
            url: publicData.publicUrl
        });

        return {
            url: publicData.publicUrl,
            path: filePath
        };
    } catch (error) {
        logger.error('Error uploading image', { error: error.message, teamId, fileName, folder });
        throw error;
    }
};

/**
 * Upload QR code image to Supabase Storage
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {string} fileName - Original file name
 * @param {number} teamId - Team ID for organizing files
 * @returns {Promise<{url: string, path: string}>} - Public URL and storage path
 */
const uploadQRCode = (fileBuffer, fileName, teamId) => uploadImage(fileBuffer, fileName, QR_FOLDER, teamId);

/**
 * Upload a campaign payment bill/proof image to Supabase Storage
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {string} fileName - Original file name
 * @param {number} teamId - Team ID for organizing files
 * @returns {Promise<{url: string, path: string}>} - Public URL and storage path
 */
const uploadBillImage = (fileBuffer, fileName, teamId) => uploadImage(fileBuffer, fileName, BILLS_FOLDER, teamId);

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
    uploadImage,
    uploadQRCode,
    uploadBillImage,
    deleteQRCode,
    BUCKET_NAME,
    QR_FOLDER,
    BILLS_FOLDER
};
