import apiClient from './client';
import type { WorkoutDay } from '@/types';

export const workoutDaysApi = {
  getAll: () =>
    apiClient.get<{ success: true; data: WorkoutDay[] }>('/api/workout-days'),

  create: (name: string) =>
    apiClient.post<{ success: true; data: WorkoutDay }>('/api/workout-days', { name }),

  update: (id: string, name: string) =>
    apiClient.patch<{ success: true; data: WorkoutDay }>(`/api/workout-days/${id}`, { name }),

  reorder: (orderedIds: string[]) =>
    apiClient.patch('/api/workout-days/reorder', { orderedIds }),

  remove: (id: string) =>
    apiClient.delete(`/api/workout-days/${id}`),
};
