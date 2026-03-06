import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a buffer to Cloudinary
 * @param {Buffer} buffer - The file buffer
 * @param {string} folder - The folder to upload to in Cloudinary
 * @returns {Promise<{url: string, public_id: string}>}
 */
export const uploadBuffer = (buffer, folder = 'patent_software') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder, resource_type: 'auto' },
            (error, result) => {
                if (error) return reject(error);
                resolve({
                    url: result.secure_url,
                    public_id: result.public_id,
                });
            }
        );
        uploadStream.end(buffer);
    });
};

/**
 * Deletes a file from Cloudinary
 * @param {string} publicId - The public ID of the file to delete
 * @returns {Promise<any>}
 */
export const deleteFile = (publicId) => {
    if (!publicId) return Promise.resolve();
    return cloudinary.uploader.destroy(publicId);
};

export default cloudinary;
