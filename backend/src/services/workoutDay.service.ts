import { WorkoutDay } from '../models/WorkoutDay';
import { Exercise } from '../models/Exercise';
import { ExerciseHistory } from '../models/ExerciseHistory';
import { AppError } from '../utils/AppError';

export async function getAll(userId: string) {
  return WorkoutDay.find({ userId }).sort({ order: 1, createdAt: 1 });
}

export async function create(userId: string, name: string) {
  const count = await WorkoutDay.countDocuments({ userId });
  return WorkoutDay.create({ userId, name, order: count });
}

export async function update(userId: string, dayId: string, name: string) {
  const day = await WorkoutDay.findOne({ _id: dayId, userId });
  if (!day) throw AppError.notFound('Workout day');

  day.name = name;
  return day.save();
}

export async function reorder(userId: string, orderedIds: string[]) {
  const ops = orderedIds.map((id, index) =>
    WorkoutDay.updateOne({ _id: id, userId }, { order: index })
  );
  await Promise.all(ops);
}

export async function remove(userId: string, dayId: string) {
  const day = await WorkoutDay.findOne({ _id: dayId, userId });
  if (!day) throw AppError.notFound('Workout day');

  // Cascade: delete exercises and their history
  const exercises = await Exercise.find({ workoutDayId: dayId, userId });
  const exerciseIds = exercises.map((e) => e._id);

  await ExerciseHistory.deleteMany({ exerciseId: { $in: exerciseIds } });
  await Exercise.deleteMany({ workoutDayId: dayId, userId });
  await day.deleteOne();
}
