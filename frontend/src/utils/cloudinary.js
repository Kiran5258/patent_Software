import axios from 'axios';

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

/**
 * Uploads a file to Cloudinary from the frontend.
 * @param {File} file - The file to upload.
 * @param {string} folder - Optional folder name.
 * @returns {Promise<{url: string, public_id: string}>}
 */
export const uploadToCloudinary = async (file, folder = 'patent_software') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    console.log('Attempting Cloudinary upload:', { cloudName, uploadPreset });

    try {
        const response = await axios.post(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            formData
        );

        return {
            url: response.data.secure_url,
            public_id: response.data.public_id
        };
    } catch (error) {
        if (error.response) {
            const errorMsg = JSON.stringify(error.response.data);
            console.error('Cloudinary Detailed Error STRING:', errorMsg);
            alert(`Cloudinary Error: ${error.response.data.error?.message || errorMsg}`);
            throw new Error(`Cloudinary Error: ${error.response.data.error?.message || errorMsg}`);
        }
        console.error('Cloudinary upload error:', error);
        throw new Error('Failed to upload image to Cloudinary');
    }
};
