import { Router } from 'express';
import * as controller from '../controllers/progress.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/exercise/:exerciseId/history', controller.getHistory);
router.get('/exercise/:exerciseId/chart', controller.getChartData);
router.get('/stagnant', controller.getStagnant);

export default router;
