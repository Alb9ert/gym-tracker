import { Router } from 'express';
import * as controller from '../controllers/gymVisit.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', controller.getVisits);
router.post('/', controller.logVisit);
router.delete('/:visitId', controller.removeVisit);

export default router;
