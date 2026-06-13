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

export async function toggleActive(userId: string, dayId: string) {
  const day = await WorkoutDay.findOne({ _id: dayId, userId });
  if (!day) throw AppError.notFound('Workout day');

  day.isActive = !day.isActive;
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

  // Only delete exercise docs that are not linked to any other day
  if (day.exercises.length > 0) {
    const otherDays = await WorkoutDay.find({ userId, _id: { $ne: dayId } }).select('exercises').lean();
    const linkedElsewhere = new Set(otherDays.flatMap((d) => (d.exercises ?? []).map(String)));

    const toDelete = day.exercises.map(String).filter((id) => !linkedElsewhere.has(id));
    if (toDelete.length > 0) {
      await ExerciseHistory.deleteMany({ exerciseId: { $in: toDelete } });
      await Exercise.deleteMany({ _id: { $in: toDelete } });
    }
  }

  await day.deleteOne();
}
