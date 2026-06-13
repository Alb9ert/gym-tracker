import { Types } from 'mongoose';
import { Exercise } from '../models/Exercise';
import { ExerciseHistory } from '../models/ExerciseHistory';
import { WorkoutDay } from '../models/WorkoutDay';
import { AppError } from '../utils/AppError';

export async function getByDay(userId: string, dayId: string) {
  const day = await WorkoutDay.findOne({ _id: dayId, userId });
  if (!day) throw AppError.notFound('Workout day');

  if (day.exercises.length === 0) return [];

  const docs = await Exercise.find({ _id: { $in: day.exercises }, userId }).lean();
  const map = Object.fromEntries(docs.map((e) => [String(e._id), e]));
  return day.exercises.map((id) => map[String(id)]).filter(Boolean);
}

export async function getAll(userId: string) {
  return Exercise.find({ userId }).sort({ name: 1 }).lean();
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

  const exercise = await Exercise.create({
    userId,
    name: data.name,
    sets: data.sets,
    reps: data.reps,
    weight: data.weight,
    note: data.note ?? null,
    muscleGroups: data.muscleGroups ?? [],
  });

  day.exercises.push(exercise._id as Types.ObjectId);
  await day.save();

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

export async function linkToDay(userId: string, dayId: string, exerciseId: string) {
  const [day, exercise] = await Promise.all([
    WorkoutDay.findOne({ _id: dayId, userId }),
    Exercise.findOne({ _id: exerciseId, userId }),
  ]);
  if (!day) throw AppError.notFound('Workout day');
  if (!exercise) throw AppError.notFound('Exercise');

  const alreadyLinked = day.exercises.some((id) => String(id) === exerciseId);
  if (alreadyLinked) throw AppError.conflict('Exercise is already on this day');

  day.exercises.push(new Types.ObjectId(exerciseId));
  await day.save();

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

  const changedFields: string[] = [];
  if (data.sets !== undefined && data.sets !== exercise.sets) changedFields.push('sets');
  if (data.reps !== undefined && data.reps !== exercise.reps) changedFields.push('reps');
  if (data.weight !== undefined && data.weight !== exercise.weight) changedFields.push('weight');

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

  day.exercises = orderedIds.map((id) => new Types.ObjectId(id));
  await day.save();
}

// Removes exercise from a specific day. If it's not linked anywhere else, deletes the document.
export async function removeFromDay(userId: string, dayId: string, exerciseId: string) {
  const [day, exercise] = await Promise.all([
    WorkoutDay.findOne({ _id: dayId, userId }),
    Exercise.findOne({ _id: exerciseId, userId }),
  ]);
  if (!day) throw AppError.notFound('Workout day');
  if (!exercise) throw AppError.notFound('Exercise');

  day.exercises = day.exercises.filter((id) => String(id) !== exerciseId);
  await day.save();

  // Check if still linked to any other day
  const stillLinked = await WorkoutDay.countDocuments({
    userId,
    exercises: new Types.ObjectId(exerciseId),
  });

  if (stillLinked === 0) {
    await ExerciseHistory.deleteMany({ exerciseId: exercise._id });
    await exercise.deleteOne();
  }
}

export async function migrateToExercisesArray() {
  const exercises = await Exercise.find({ workoutDayId: { $exists: true, $ne: null } }).lean();
  if (exercises.length === 0) return;

  const byDay: Record<string, typeof exercises> = {};
  for (const ex of exercises) {
    const dayId = String(ex.workoutDayId);
    if (!byDay[dayId]) byDay[dayId] = [];
    byDay[dayId].push(ex);
  }

  for (const [dayId, exs] of Object.entries(byDay)) {
    const day = await WorkoutDay.findById(dayId);
    if (!day) continue;

    const existingIds = new Set(day.exercises.map(String));
    const sorted = [...exs].sort((a, b) => ((a as any).order ?? 0) - ((b as any).order ?? 0));

    for (const ex of sorted) {
      const id = String(ex._id);
      if (!existingIds.has(id)) {
        day.exercises.push(new Types.ObjectId(id));
        existingIds.add(id);
      }
    }

    await day.save();
  }

  console.log(`[migrate] Moved ${exercises.length} exercises into WorkoutDay.exercises arrays`);
}
