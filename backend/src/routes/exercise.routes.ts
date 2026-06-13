import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/exercise.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router({ mergeParams: true });
router.use(authenticate);

const createSchema = z.object({
  name: z.string().min(1, 'Exercise name is required').max(100),
  sets: z.number().int().min(1).default(3),
  reps: z.string().min(1, 'Reps is required').max(20),
  weight: z.number().min(0).nullable().default(null),
  note: z.string().max(300).nullable().default(null),
  muscleGroups: z.array(z.string()).default([]),
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  sets: z.number().int().min(1).optional(),
  reps: z.string().min(1).max(20).optional(),
  weight: z.number().min(0).nullable().optional(),
  note: z.string().max(300).nullable().optional(),
  isActive: z.boolean().optional(),
  goalWeight: z.boolean().optional(),
  goalReps: z.boolean().optional(),
  muscleGroups: z.array(z.string()).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' });

const reorderSchema = z.object({ orderedIds: z.array(z.string()).min(1) });

// Mounted at /api/workout-days/:dayId/exercises
router.get('/', controller.getByDay);
router.post('/', validate(createSchema), controller.create);
router.patch('/reorder', validate(reorderSchema), controller.reorder);
router.post('/:exerciseId/link', controller.linkToDay);
router.delete('/:exerciseId', controller.removeFromDay);

// Mounted at /api/exercises
router.get('/all', controller.getAll);
router.patch('/:id', validate(updateSchema), controller.update);

export default router;
