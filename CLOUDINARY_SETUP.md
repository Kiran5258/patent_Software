# Cloudinary Setup for Patent Software

To enable file uploads from the frontend, you must create an **Unsigned Upload Preset** in your Cloudinary account.

### Step-by-Step Instructions:

1.  **Log in** to your [Cloudinary Dashboard](https://cloudinary.com/console).
2.  Click the **Settings** icon (gear icon) at the bottom left of the sidebar.
3.  Click on the **Upload** tab in the top menu.
4.  Scroll down to the **Upload presets** section.
5.  Click **Add upload preset**.
6.  **Configure the Preset:**
    *   **Upload preset name**: `patent_software`
    *   **Signing Mode**: Change this to **Unsigned** (This is the most important step!).
    *   **Folder** (Optional): You can set this to `patent_software` to organize your files.
7.  Click the **Save** button at the top right.

### Update your Frontend Environment:

Ensure your `frontend/.env` file has these exact lines:

```env
VITE_CLOUDINARY_CLOUD_NAME=dwbm7oyj5
VITE_CLOUDINARY_UPLOAD_PRESET=patent_software
```

### Update your Backend Environment:

For the folder-based upload logic to work, the backend needs full API access. Update your `Backend/.env` with your actual credentials from the Cloudinary Dashboard:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Note:** After creating the preset and updating the `.env` files, you **must restart both servers** (frontend and backend) for the changes to take effect.

