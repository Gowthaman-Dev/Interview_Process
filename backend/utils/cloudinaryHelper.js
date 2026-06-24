import { v2 as cloudinary } from 'cloudinary';

export const configureCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
};

export const deleteFromCloudinary = async (url) => {
  if (!url) return;
  try {
    const parts = url.split('/');
    const filenameWithExt = parts.pop();
    const publicId = filenameWithExt.split('.')[0];
    const folder = parts.slice(parts.indexOf('upload') + 2).join('/');
    const fullPublicId = folder ? `${folder}/${publicId}` : publicId;
    const result = await cloudinary.uploader.destroy(fullPublicId);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
  }
};

export const uploadToCloudinary = async (fileBuffer, folder = 'resumes') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'raw', // ✅ forces raw/upload/ URL for PDFs
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    uploadStream.end(fileBuffer);
  });
};