import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary (should be called once, usually in server.js or here)
export const configureCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
};

// Delete file from Cloudinary by URL
export const deleteFromCloudinary = async (url) => {
  if (!url) return;
  try {
    // Extract public ID from URL
    // Example URL: https://res.cloudinary.com/cloud_name/image/upload/v1234567/folder/filename.jpg
    const parts = url.split('/');
    const filenameWithExt = parts.pop();
    const publicId = filenameWithExt.split('.')[0];
    const folder = parts.slice(parts.indexOf('upload') + 2).join('/');
    const fullPublicId = folder ? `${folder}/${publicId}` : publicId;
    
    const result = await cloudinary.uploader.destroy(fullPublicId);
    console.log(`Cloudinary delete result: ${result.result}`);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
  }
};

// Upload file to Cloudinary
export const uploadToCloudinary = async (fileBuffer, folder = 'resumes') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};