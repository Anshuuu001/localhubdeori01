import { Router } from 'express';
import { getModules, getModuleBySlug } from '../controllers/modules.controller.js';

const router = Router();

router.get('/', getModules);
router.get('/:slug', getModuleBySlug);

export default router;
