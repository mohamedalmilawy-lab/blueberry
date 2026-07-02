const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Initialise Cloudinary SDK once using env vars
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Factory that creates a Cloudinary multer storage engine.
 * @param {string} folder  - Destination folder inside your Cloudinary account
 * @returns {CloudinaryStorage}
 */
function makeCloudinaryStorage(folder) {
    return new CloudinaryStorage({
        cloudinary,
        params: {
            folder,
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
            // Cloudinary will auto-generate a unique public_id when none is supplied
        },
    });
}

/**
 * Delete an asset from Cloudinary by its public_id.
 * Extracts the public_id from a secure_url when a full URL is provided.
 * Safe to call with null / undefined – it simply resolves without doing anything.
 *
 * @param {string|null} urlOrPublicId
 */
async function deleteFromCloudinary(urlOrPublicId) {
    if (!urlOrPublicId) return;

    try {
        // If it looks like a full URL, extract the public_id portion
        // e.g. https://res.cloudinary.com/<cloud>/image/upload/v1234/folder/filename.jpg
        //  → public_id = "folder/filename"
        let publicId = urlOrPublicId;
        if (urlOrPublicId.startsWith('http')) {
            const parts = urlOrPublicId.split('/');
            // Everything after "upload/v<version>/" is the public_id (without extension)
            const uploadIndex = parts.indexOf('upload');
            if (uploadIndex !== -1) {
                const withVersion = parts.slice(uploadIndex + 1);
                // Skip the version segment (starts with "v" + digits)
                const withoutVersion = withVersion[0]?.match(/^v\d+$/)
                    ? withVersion.slice(1)
                    : withVersion;
                const withExtension = withoutVersion.join('/');
                publicId = withExtension.replace(/\.[^/.]+$/, ''); // remove extension
            }
        }

        await cloudinary.uploader.destroy(publicId);
    } catch (err) {
        console.error('فشل حذف الصورة من Cloudinary:', err.message);
    }
}

module.exports = { cloudinary, makeCloudinaryStorage, deleteFromCloudinary };
