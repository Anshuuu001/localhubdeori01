import { Router } from 'express';
import { getDiscoveryFeed } from '../controllers/discovery.controller.js';

const router = Router();

// Public discovery feed
router.get('/feed', getDiscoveryFeed);

export default router;
