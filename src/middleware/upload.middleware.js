import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// uploads directory: personal-blog-server/uploads/
export const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// ensure the uploads directory exists at startup
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// default to 5MB, or allow override via environment variable
const MAX_SIZE = process.env.MAX_FILE_SIZE
  ? parseInt(process.env.MAX_FILE_SIZE, 10)
  : 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

// configure multer for file uploads
const upload = multer({
  storage,
  // limit file size to prevent abuse
  limits: {
    fileSize: MAX_SIZE,
  },
  // security: validate that the uploaded file is actually an image
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      // reject non-image files
      const error = new Error('Only image files are allowed.');
      error.code = 'INVALID_FILE_TYPE';
      cb(error, false);
    }
  },
});

export { upload };
