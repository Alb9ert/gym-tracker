import { Router } from 'express';
import * as controller from '../controllers/stats.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/summary', controller.getSummary);
router.get('/stale', controller.getStaleExercises);
router.get('/muscles', controller.getMuscleStats);
router.get('/day/:dayId', controller.getDayStats);
router.get('/strength-rankings', controller.getStrengthRankings);

export default router;
