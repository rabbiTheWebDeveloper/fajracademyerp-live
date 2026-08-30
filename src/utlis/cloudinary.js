import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary using environment variables
cloudinary.config({ 
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dbfkavpxa', 
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || '498137587259741', 
  api_secret: process.env.CLOUDINARY_API_SECRET || 'Jxxwumb3uemykHkXtfVdSzRMqxw' 
});

export default cloudinary;