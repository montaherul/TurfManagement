import express from 'express';
import multer from 'multer';
import path from 'path';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadPhoto, generateSignedUrl } from '../controllers/uploadController.js';
import { AppError } from '../utils/ApiError.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|heic/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new AppError(400, 'Only image files are allowed', { code: 'INVALID_FILE_TYPE' }));
  },
});

router.post('/photo', upload.single('photo'), asyncHandler(uploadPhoto));
router.get('/signed-url', asyncHandler(generateSignedUrl));

export default router;