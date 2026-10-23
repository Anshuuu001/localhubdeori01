import { Router } from 'express';
import {
  listDirectoryBusinesses,
  getDirectoryBusinessById,
} from '../controllers/directory.controller.js';

const router = Router();

// Public discovery endpoints
router.get('/', listDirectoryBusinesses);
router.get('/:id', getDirectoryBusinessById);

export default router;
