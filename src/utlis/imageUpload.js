// middlewares/imageUpload.ts
import multer from 'multer';

// Set up multer storage
const storage = multer.diskStorage({});

// Initialize multer upload
const upload = multer({ storage });

export default upload;