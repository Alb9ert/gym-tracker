import { ExerciseHistory } from '../models/ExerciseHistory';
import { Exercise } from '../models/Exercise';
import { AppError } from '../utils/AppError';

export async function getHistory(userId: string, exerciseId: string) {
  const exercise = await Exercise.findOne({ _id: exerciseId, userId });
  if (!exercise) throw AppError.notFound('Exercise');

  const history = await ExerciseHistory.find({ exerciseId, userId })
    .sort({ recordedAt: 1 });

  return { exercise, history };
}

export async function getChartData(userId: string, exerciseId: string) {
  const exercise = await Exercise.findOne({ _id: exerciseId, userId });
  if (!exercise) throw AppError.notFound('Exercise');

  const history = await ExerciseHistory.find({ exerciseId, userId })
    .sort({ recordedAt: 1 })
    .select('weight reps sets recordedAt changedFields');

  return {
    exerciseId,
    exerciseName: exercise.name,
    dataPoints: history.map((h) => ({
      date: h.recordedAt,
      weight: h.weight,
      reps: h.reps,
      sets: h.sets,
      changedFields: h.changedFields,
    })),
  };
}

export async function getStagnantExercises(userId: string, daysThreshold = 14) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysThreshold);

  // Get all exercises for user
  const exercises = await Exercise.find({ userId });
  if (!exercises.length) return [];

  const results = await Promise.all(
    exercises.map(async (exercise) => {
      const latest = await ExerciseHistory.findOne({ exerciseId: exercise._id, userId })
        .sort({ recordedAt: -1 });

      // Check if there's been any change in tracked fields since cutoff
      const recentChange = await ExerciseHistory.findOne({
        exerciseId: exercise._id,
        userId,
        recordedAt: { $gte: cutoff },
        changedFields: { $in: ['weight', 'reps', 'sets'] },
      });

      return {
        exercise,
        lastChanged: latest?.recordedAt ?? null,
        isStagnant: !recentChange,
        daysSinceChange: latest
          ? Math.floor((Date.now() - latest.recordedAt.getTime()) / 86400000)
          : null,
      };
    })
  );

  return results.filter((r) => r.isStagnant);
}
