import apiClient from './client';
import type { ChartData, ExerciseHistory, StagnantExercise } from '@/types';

export const progressApi = {
  getHistory: (exerciseId: string) =>
    apiClient.get<{ success: true; data: { exercise: unknown; history: ExerciseHistory[] } }>(
      `/api/progress/exercise/${exerciseId}/history`
    ),

  getChartData: (exerciseId: string) =>
    apiClient.get<{ success: true; data: ChartData }>(
      `/api/progress/exercise/${exerciseId}/chart`
    ),

  getStagnant: (days?: number) =>
    apiClient.get<{ success: true; data: StagnantExercise[] }>(
      `/api/progress/stagnant${days ? `?days=${days}` : ''}`
    ),
};
