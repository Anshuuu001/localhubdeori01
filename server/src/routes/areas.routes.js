import { Router } from 'express';
import { getAreas } from '../controllers/areas.controller.js';

const router = Router();

router.get('/', getAreas);

export default router;
