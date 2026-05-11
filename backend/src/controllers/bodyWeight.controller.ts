import { Request, Response, NextFunction } from 'express';
import * as service from '../services/bodyWeight.service';
import { AuthRequest } from '../middleware/auth';

function uid(req: Request) {
  return (req as AuthRequest).userId;
}

export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const entries = await service.getAll(uid(req));
    res.json({ success: true, data: entries });
  } catch (err) { next(err); }
}

export async function log(req: Request, res: Response, next: NextFunction) {
  try {
    const { weight, recordedAt } = req.body;
    const entry = await service.log(uid(req), weight, recordedAt ? new Date(recordedAt) : undefined);
    res.status(201).json({ success: true, data: entry });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await service.remove(uid(req), req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}
