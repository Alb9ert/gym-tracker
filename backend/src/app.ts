import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth.routes';
import workoutDayRoutes from './routes/workoutDay.routes';
import exerciseRoutes from './routes/exercise.routes';
import progressRoutes from './routes/progress.routes';
import bodyWeightRoutes from './routes/bodyWeight.routes';
import statsRoutes from './routes/stats.routes';
import gymVisitRoutes from './routes/gymVisit.routes';

const app = express();

app.use(cors({
  origin: env.CLIENT_ORIGIN,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/workout-days', workoutDayRoutes);

// Exercises nested under workout days for collection ops, standalone for item ops
app.use('/api/workout-days/:dayId/exercises', exerciseRoutes);
app.use('/api/exercises', exerciseRoutes);

app.use('/api/progress', progressRoutes);
app.use('/api/body-weight', bodyWeightRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/gym-visits', gymVisitRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

export default app;
