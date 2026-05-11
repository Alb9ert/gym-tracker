import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/bodyWeight.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authenticate);

const logSchema = z.object({
  weight: z.number().min(1, 'Weight must be at least 1 kg').max(500),
  recordedAt: z.string().datetime().optional(),
});

router.get('/', controller.getAll);
router.post('/', validate(logSchema), controller.log);
router.delete('/:id', controller.remove);

export default router;
