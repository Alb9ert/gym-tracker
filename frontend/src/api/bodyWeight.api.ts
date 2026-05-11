import apiClient from './client';
import type { BodyWeightEntry } from '@/types';

export const bodyWeightApi = {
  getAll: () =>
    apiClient.get<{ success: true; data: BodyWeightEntry[] }>('/api/body-weight'),

  log: (weight: number, recordedAt?: string) =>
    apiClient.post<{ success: true; data: BodyWeightEntry }>('/api/body-weight', { weight, recordedAt }),

  remove: (id: string) =>
    apiClient.delete(`/api/body-weight/${id}`),
};
