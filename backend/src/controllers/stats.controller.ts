import { Request, Response, NextFunction } from 'express';
import * as service from '../services/stats.service';
import { AuthRequest } from '../middleware/auth';

function uid(req: Request) {
  return (req as AuthRequest).userId;
}

export async function getSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getSummary(uid(req));
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getDayStats(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getDayStats(uid(req), req.params.dayId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getStaleExercises(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getStaleExercises(uid(req));
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getMuscleStats(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getMuscleStats(uid(req));
    res.json({ success: true, data });
  } catch (err) { next(err); }
}
