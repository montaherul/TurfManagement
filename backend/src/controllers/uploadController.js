import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { successResponse } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';

export const uploadPhoto = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded',
      code: 'NO_FILE',
    });
  }

  const facilityId = req.facilityId || 'system';
  const uploadDir = path.join(env.uploadDir, 'photos', facilityId);
  await fs.mkdir(uploadDir, { recursive: true });

  const ext = path.extname(req.file.originalname).toLowerCase();
  const safeExt = ext && ext !== '.heic' ? ext : '.jpg';
  const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${safeExt}`;
  const filepath = path.join(uploadDir, filename);

  await sharp(req.file.buffer)
    .rotate()
    .resize(1200, 800, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(filepath);

  const url = `/uploads/photos/${facilityId}/${filename}`;

  return successResponse(res, { url, filename }, 'Photo uploaded successfully', 201);
};

export const generateSignedUrl = async (req, res) => {
  const { filename } = req.query;
  if (!filename) {
    return res.status(422).json({
      success: false,
      message: 'filename query parameter is required',
      code: 'VALIDATION_ERROR',
    });
  }

  return successResponse(res, {
    url: `/uploads/${filename}`,
    expiresIn: 3600,
  });
};