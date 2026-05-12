import apiClient from './client';
import type { Exercise } from '@/types';

interface CreateExerciseData {
  name: string;
  sets: number;
  reps: string;
  weight: number | null;
  note?: string | null;
  muscleGroups?: string[];
}

interface UpdateExerciseData {
  name?: string;
  sets?: number;
  reps?: string;
  weight?: number | null;
  note?: string | null;
  isActive?: boolean;
  goalWeight?: boolean;
  goalReps?: boolean;
  muscleGroups?: string[];
}

export const exercisesApi = {
  getByDay: (dayId: string) =>
    apiClient.get<{ success: true; data: Exercise[] }>(`/api/workout-days/${dayId}/exercises`),

  create: (dayId: string, data: CreateExerciseData) =>
    apiClient.post<{ success: true; data: Exercise }>(`/api/workout-days/${dayId}/exercises`, data),

  update: (id: string, data: UpdateExerciseData) =>
    apiClient.patch<{ success: true; data: Exercise }>(`/api/exercises/${id}`, data),

  reorder: (dayId: string, orderedIds: string[]) =>
    apiClient.patch(`/api/workout-days/${dayId}/exercises/reorder`, { orderedIds }),

  remove: (id: string) =>
    apiClient.delete(`/api/exercises/${id}`),
};
