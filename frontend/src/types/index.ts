export interface User {
  id: string;
  email: string;
  name: string;
}

export interface WorkoutDay {
  _id: string;
  userId: string;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Exercise {
  _id: string;
  workoutDayId: string;
  userId: string;
  name: string;
  sets: number;
  reps: string;
  weight: number | null;
  note: string | null;
  isActive: boolean;
  goalWeight: boolean;
  goalReps: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseHistory {
  _id: string;
  exerciseId: string;
  userId: string;
  sets: number;
  reps: string;
  weight: number | null;
  changedFields: string[];
  recordedAt: string;
}

export interface ChartDataPoint {
  date: string;
  weight: number | null;
  reps: string;
  sets: number;
  changedFields: string[];
}

export interface ChartData {
  exerciseId: string;
  exerciseName: string;
  dataPoints: ChartDataPoint[];
}

export interface BodyWeightEntry {
  _id: string;
  userId: string;
  weight: number;
  recordedAt: string;
}

export interface StagnantExercise {
  exercise: Exercise;
  lastChanged: string | null;
  isStagnant: boolean;
  daysSinceChange: number | null;
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}
