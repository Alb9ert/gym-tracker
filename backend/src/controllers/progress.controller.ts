import { Request, Response, NextFunction } from 'express';
import * as service from '../services/progress.service';
import { AuthRequest } from '../middleware/auth';

function uid(req: Request) {
  return (req as AuthRequest).userId;
}

export async function getHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getHistory(uid(req), req.params.exerciseId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getChartData(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getChartData(uid(req), req.params.exerciseId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getStagnant(req: Request, res: Response, next: NextFunction) {
  try {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 14;
    const data = await service.getStagnantExercises(uid(req), days);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}
