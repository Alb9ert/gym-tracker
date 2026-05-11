import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as service from '../services/gymVisit.service';
import { AuthRequest } from '../middleware/auth';

function uid(req: Request) {
  return (req as AuthRequest).userId;
}

const logSchema = z.object({
  workoutDayId: z.string().nullable().optional(),
  workoutDayName: z.string().nullable().optional(),
  visitedAt: z.string().datetime().optional(),
});

export async function getVisits(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getVisits(uid(req));
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function logVisit(req: Request, res: Response, next: NextFunction) {
  try {
    const body = logSchema.parse(req.body);
    const visit = await service.logVisit(uid(req), body);
    res.status(201).json({ success: true, data: visit });
  } catch (err) { next(err); }
}

export async function removeVisit(req: Request, res: Response, next: NextFunction) {
  try {
    await service.removeVisit(uid(req), req.params.visitId);
    res.json({ success: true });
  } catch (err) { next(err); }
}
