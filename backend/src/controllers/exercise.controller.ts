import { Request, Response, NextFunction } from 'express';
import * as service from '../services/exercise.service';
import { AuthRequest } from '../middleware/auth';

function uid(req: Request) {
  return (req as AuthRequest).userId;
}

export async function getByDay(req: Request, res: Response, next: NextFunction) {
  try {
    const exercises = await service.getByDay(uid(req), req.params.dayId);
    res.json({ success: true, data: exercises });
  } catch (err) { next(err); }
}

export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const exercises = await service.getAll(uid(req));
    res.json({ success: true, data: exercises });
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const exercise = await service.create(uid(req), req.params.dayId, req.body);
    res.status(201).json({ success: true, data: exercise });
  } catch (err) { next(err); }
}

export async function linkToDay(req: Request, res: Response, next: NextFunction) {
  try {
    const exercise = await service.linkToDay(uid(req), req.params.dayId, req.params.exerciseId);
    res.json({ success: true, data: exercise });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const exercise = await service.update(uid(req), req.params.id, req.body);
    res.json({ success: true, data: exercise });
  } catch (err) { next(err); }
}

export async function reorder(req: Request, res: Response, next: NextFunction) {
  try {
    await service.reorder(uid(req), req.params.dayId, req.body.orderedIds);
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function removeFromDay(req: Request, res: Response, next: NextFunction) {
  try {
    await service.removeFromDay(uid(req), req.params.dayId, req.params.exerciseId);
    res.json({ success: true });
  } catch (err) { next(err); }
}
