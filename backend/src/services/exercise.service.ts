import { Exercise } from '../models/Exercise';
import { ExerciseHistory } from '../models/ExerciseHistory';
import { WorkoutDay } from '../models/WorkoutDay';
import { AppError } from '../utils/AppError';

export async function getByDay(userId: string, dayId: string) {
  const day = await WorkoutDay.findOne({ _id: dayId, userId });
  if (!day) throw AppError.notFound('Workout day');
  return Exercise.find({ workoutDayId: dayId, userId }).sort({ order: 1 });
}

export async function create(userId: string, dayId: string, data: {
  name: string;
  sets: number;
  reps: string;
  weight: number | null;
  note?: string | null;
  muscleGroups?: string[];
}) {
  const day = await WorkoutDay.findOne({ _id: dayId, userId });
  if (!day) throw AppError.notFound('Workout day');

  const count = await Exercise.countDocuments({ workoutDayId: dayId, userId });
  const exercise = await Exercise.create({
    workoutDayId: dayId,
    userId,
    name: data.name,
    sets: data.sets,
    reps: data.reps,
    weight: data.weight,
    note: data.note ?? null,
    muscleGroups: data.muscleGroups ?? [],
    order: count,
  });

  // Log the initial state as first history entry
  await ExerciseHistory.create({
    exerciseId: exercise._id,
    userId,
    sets: exercise.sets,
    reps: exercise.reps,
    weight: exercise.weight,
    changedFields: [],
    recordedAt: new Date(),
  });

  return exercise;
}

export async function update(userId: string, exerciseId: string, data: {
  name?: string;
  sets?: number;
  reps?: string;
  weight?: number | null;
  note?: string | null;
  isActive?: boolean;
  goalWeight?: boolean;
  goalReps?: boolean;
  muscleGroups?: string[];
}) {
  const exercise = await Exercise.findOne({ _id: exerciseId, userId });
  if (!exercise) throw AppError.notFound('Exercise');

  // Determine which tracked fields changed (note is intentionally excluded)
  const changedFields: string[] = [];
  if (data.sets !== undefined && data.sets !== exercise.sets) changedFields.push('sets');
  if (data.reps !== undefined && data.reps !== exercise.reps) changedFields.push('reps');
  if (data.weight !== undefined && data.weight !== exercise.weight) changedFields.push('weight');

  // Apply updates
  if (data.name !== undefined) exercise.name = data.name;
  if (data.sets !== undefined) exercise.sets = data.sets;
  if (data.reps !== undefined) exercise.reps = data.reps;
  if (data.weight !== undefined) exercise.weight = data.weight;
  if (data.note !== undefined) exercise.note = data.note;
  if (data.isActive !== undefined) exercise.isActive = data.isActive;
  if (data.goalWeight !== undefined) exercise.goalWeight = data.goalWeight;
  if (data.goalReps !== undefined) exercise.goalReps = data.goalReps;
  if (data.muscleGroups !== undefined) exercise.muscleGroups = data.muscleGroups;

  await exercise.save();

  // Only log history when tracked fields actually changed
  if (changedFields.length > 0) {
    await ExerciseHistory.create({
      exerciseId: exercise._id,
      userId,
      sets: exercise.sets,
      reps: exercise.reps,
      weight: exercise.weight,
      changedFields,
      recordedAt: new Date(),
    });
  }

  return exercise;
}

export async function reorder(userId: string, dayId: string, orderedIds: string[]) {
  const day = await WorkoutDay.findOne({ _id: dayId, userId });
  if (!day) throw AppError.notFound('Workout day');

  const ops = orderedIds.map((id, index) =>
    Exercise.updateOne({ _id: id, userId, workoutDayId: dayId }, { order: index })
  );
  await Promise.all(ops);
}

export async function remove(userId: string, exerciseId: string) {
  const exercise = await Exercise.findOne({ _id: exerciseId, userId });
  if (!exercise) throw AppError.notFound('Exercise');

  await ExerciseHistory.deleteMany({ exerciseId: exercise._id });
  await exercise.deleteOne();
}
