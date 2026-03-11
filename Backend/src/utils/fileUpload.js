import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';

/**
 * Saves a buffer to local disk
 * @param {Buffer} buffer - The file buffer
 * @param {string} folder - The folder to upload to (e.g., 'figures', 'signatures', 'output')
 * @param {object} options - Options including filename
 * @returns {Promise<{url: string, public_id: string}>}
 */
export const saveBufferLocally = async (buffer, folder = 'misc', options = {}) => {
    let fileName = options.public_id;
    
    if (!fileName) {
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1E9);
        const ext = options.ext || (options.originalname ? path.extname(options.originalname) : '.bin');
        fileName = `${timestamp}_${random}${ext}`;
    }
    
    // Determine the storage path
    // We'll use 'uploads' as the base for figures/signatures and 'output' for generated docs as per server.js
    let storageDir;
    let urlPath;
    
    if (folder === 'output') {
        storageDir = path.join(__dirname, '../../output');
        urlPath = '/output';
    } else {
        storageDir = path.join(__dirname, '../../uploads', folder);
        urlPath = `/uploads/${folder}`;
    }

    // Ensure directory exists
    if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
    }

    const filePath = path.join(storageDir, fileName);
    await fs.promises.writeFile(filePath, buffer);

    return {
        url: `${BASE_URL}${urlPath}/${fileName}`,
        public_id: path.join(folder, fileName) // Using folder/filename as public_id for local deletion logic
    };
};

/**
 * Deletes a file from local disk
 * @param {string} publicId - The public ID (folder/filename)
 * @returns {Promise<void>}
 */
export const deleteLocalFile = async (publicId) => {
    if (!publicId) return;
    
    try {
        let filePath;
        if (publicId.startsWith('output')) {
            // output/filename
            const fileName = publicId.split(path.sep).pop();
            filePath = path.join(__dirname, '../../output', fileName);
        } else {
            // figures/filename or signatures/filename
            filePath = path.join(__dirname, '../../uploads', publicId);
        }

        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
        }
    } catch (error) {
        console.error("Error deleting local file:", error);
    }
};
