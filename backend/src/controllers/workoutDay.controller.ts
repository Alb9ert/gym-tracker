import { Request, Response, NextFunction } from 'express';
import * as service from '../services/workoutDay.service';
import { AuthRequest } from '../middleware/auth';

function uid(req: Request) {
  return (req as AuthRequest).userId;
}

export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const days = await service.getAll(uid(req));
    res.json({ success: true, data: days });
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const day = await service.create(uid(req), req.body.name);
    res.status(201).json({ success: true, data: day });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const day = await service.update(uid(req), req.params.id, req.body.name);
    res.json({ success: true, data: day });
  } catch (err) { next(err); }
}

export async function reorder(req: Request, res: Response, next: NextFunction) {
  try {
    await service.reorder(uid(req), req.body.orderedIds);
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await service.remove(uid(req), req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}
