import { Router } from 'express';
import { uploadMiddleware } from '../services/storage.service.js';
import { requireAuth, csrfProtection } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * POST /api/uploads
 * Securely uploads single or multiple images for listings, products, and profiles.
 * Authenticated users only.
 */
router.post(
  '/',
  requireAuth,
  csrfProtection,
  (req, res, next) => {
    uploadMiddleware.array('images', 5)(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: {
              code: 'FILE_TOO_LARGE',
              message: 'Image size exceeds maximum allowed limit of 5MB.',
            },
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'INVALID_FILE_TYPE') {
          return res.status(400).json({
            error: {
              code: err.code,
              message: err.message,
            },
          });
        }
        return res.status(500).json({
          error: {
            code: 'UPLOAD_FAILED',
            message: 'Failed to process image upload.',
          },
        });
      }
      next();
    });
  },
  (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: { code: 'NO_FILES', message: 'No image files provided in the request.' },
      });
    }

    const uploaded = req.files.map((file) => ({
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    }));

    return res.status(201).json({
      message: 'Images uploaded successfully.',
      files: uploaded,
      urls: uploaded.map((f) => f.url),
    });
  }
);

export default router;
