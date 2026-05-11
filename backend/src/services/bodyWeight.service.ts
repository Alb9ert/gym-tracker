import { BodyWeightHistory } from '../models/BodyWeightHistory';
import { AppError } from '../utils/AppError';

export async function getAll(userId: string) {
  return BodyWeightHistory.find({ userId }).sort({ recordedAt: -1 }).limit(365);
}

export async function log(userId: string, weight: number, recordedAt?: Date) {
  return BodyWeightHistory.create({ userId, weight, recordedAt: recordedAt ?? new Date() });
}

export async function remove(userId: string, entryId: string) {
  const entry = await BodyWeightHistory.findOne({ _id: entryId, userId });
  if (!entry) throw AppError.notFound('Body weight entry');
  await entry.deleteOne();
}
