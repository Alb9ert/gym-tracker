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

  getAll: () =>
    apiClient.get<{ success: true; data: Exercise[] }>(`/api/exercises/all`),

  create: (dayId: string, data: CreateExerciseData) =>
    apiClient.post<{ success: true; data: Exercise }>(`/api/workout-days/${dayId}/exercises`, data),

  linkToDay: (dayId: string, exerciseId: string) =>
    apiClient.post<{ success: true; data: Exercise }>(`/api/workout-days/${dayId}/exercises/${exerciseId}/link`, {}),

  update: (id: string, data: UpdateExerciseData) =>
    apiClient.patch<{ success: true; data: Exercise }>(`/api/exercises/${id}`, data),

  reorder: (dayId: string, orderedIds: string[]) =>
    apiClient.patch(`/api/workout-days/${dayId}/exercises/reorder`, { orderedIds }),

  removeFromDay: (dayId: string, exerciseId: string) =>
    apiClient.delete(`/api/workout-days/${dayId}/exercises/${exerciseId}`),
};
