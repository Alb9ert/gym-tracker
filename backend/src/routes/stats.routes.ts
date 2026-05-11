import { Router } from 'express';
import * as controller from '../controllers/stats.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/summary', controller.getSummary);
router.get('/stale', controller.getStaleExercises);
router.get('/day/:dayId', controller.getDayStats);

export default router;
