import apiClient from './client';

export interface GymVisit {
  _id: string;
  workoutDayId: string | null;
  workoutDayName: string | null;
  visitedAt: string;
}

export interface GymVisitStats {
  total: number;
  thisWeek: number;
  thisMonth: number;
  streak: number;
}

export interface GymVisitsResponse {
  visits: GymVisit[];
  stats: GymVisitStats;
}

export const gymVisitApi = {
  getAll: () =>
    apiClient.get<{ success: true; data: GymVisitsResponse }>('/api/gym-visits'),

  log: (data: { workoutDayId?: string | null; workoutDayName?: string | null; visitedAt?: string }) =>
    apiClient.post<{ success: true; data: GymVisit }>('/api/gym-visits', data),

  remove: (visitId: string) =>
    apiClient.delete(`/api/gym-visits/${visitId}`),
};
