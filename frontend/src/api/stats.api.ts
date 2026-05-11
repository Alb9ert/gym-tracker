import apiClient from './client';

export interface StatsSummary {
  dayCount: number;
  exerciseCount: number;
  historyCount: number;
  latestWeight: number | null;
  recentActivity: {
    exerciseId: string;
    exerciseName: string;
    sets: number;
    reps: string;
    weight: number | null;
    changedFields: string[];
    recordedAt: string;
  }[];
}

export interface DayStats {
  dayId: string;
  dayName: string;
  volumeByDate: { date: string; volume: number | null; avgWeight: number | null }[];
  exercises: {
    id: string;
    name: string;
    currentSets: number;
    currentReps: string;
    currentWeight: number | null;
    weightDelta: number | null;
    historyCount: number;
    weightHistory: { date: string; weight: number; reps: string; sets: number }[];
  }[];
}

export interface StaleExercise {
  id: string;
  name: string;
  currentSets: number;
  currentReps: string;
  currentWeight: number | null;
  lastChangedAt: string | null;
}

export const statsApi = {
  getSummary: () =>
    apiClient.get<{ success: true; data: StatsSummary }>('/api/stats/summary'),

  getDayStats: (dayId: string) =>
    apiClient.get<{ success: true; data: DayStats }>(`/api/stats/day/${dayId}`),

  getStaleExercises: () =>
    apiClient.get<{ success: true; data: StaleExercise[] }>('/api/stats/stale'),
};
