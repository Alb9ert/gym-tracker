import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { REFRESH_COOKIE_NAME, refreshCookieOptions } from '../utils/tokens';
import { AuthRequest } from '../middleware/auth';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, name } = req.body;
    const result = await authService.register(email, password, name);
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions);
    res.status(201).json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions);
    res.json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
  } catch (err) {
    next(err);
  }
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
  res.json({ success: true });
}

export async function refreshTokens(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies[REFRESH_COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'No refresh token' } });
    }
    const result = await authService.refresh(token);
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions);
    res.json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getMe((req as AuthRequest).userId);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}
