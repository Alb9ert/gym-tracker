import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/workoutDay.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authenticate);

const createSchema = z.object({ name: z.string().min(1).max(50) });
const updateSchema = z.object({ name: z.string().min(1).max(50) });
const reorderSchema = z.object({ orderedIds: z.array(z.string()).min(1) });

router.get('/', controller.getAll);
router.post('/', validate(createSchema), controller.create);
router.patch('/reorder', validate(reorderSchema), controller.reorder);
router.patch('/:id', validate(updateSchema), controller.update);
router.post('/:id/toggle-active', controller.toggleActive);
router.delete('/:id', controller.remove);

export default router;
