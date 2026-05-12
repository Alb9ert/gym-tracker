import { Types } from 'mongoose';
import { WorkoutDay } from '../models/WorkoutDay';
import { Exercise } from '../models/Exercise';
import { ExerciseHistory } from '../models/ExerciseHistory';
import { BodyWeightHistory } from '../models/BodyWeightHistory';
import { AppError } from '../utils/AppError';

function parseReps(reps: string): number {
  if (reps.includes('-')) {
    const [lo, hi] = reps.split('-').map(Number);
    return Math.round((lo + hi) / 2);
  }
  return parseFloat(reps) || 0;
}

function toDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

export async function getSummary(userId: string) {
  const [dayCount, exerciseCount, historyCount, latestWeight] = await Promise.all([
    WorkoutDay.countDocuments({ userId }),
    Exercise.countDocuments({ userId }),
    ExerciseHistory.countDocuments({ userId }),
    BodyWeightHistory.findOne({ userId }).sort({ recordedAt: -1 }),
  ]);

  // Recent activity: last 8 history entries with exercise name
  const recent = await ExerciseHistory.find({ userId })
    .sort({ recordedAt: -1 })
    .limit(8)
    .lean();

  const exerciseIds = [...new Set(recent.map((r) => String(r.exerciseId)))];
  const exercises = await Exercise.find({ _id: { $in: exerciseIds } }).select('name').lean();
  const nameMap = Object.fromEntries(exercises.map((e) => [String(e._id), e.name]));

  const recentActivity = recent.map((r) => ({
    exerciseId: r.exerciseId,
    exerciseName: nameMap[String(r.exerciseId)] ?? 'Unknown',
    sets: r.sets,
    reps: r.reps,
    weight: r.weight,
    changedFields: r.changedFields,
    recordedAt: r.recordedAt,
  }));

  return { dayCount, exerciseCount, historyCount, latestWeight: latestWeight?.weight ?? null, recentActivity };
}

export async function getStaleExercises(userId: string, days = 14) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const exercises = await Exercise.find({ userId, isActive: true }).lean();
  if (!exercises.length) return [];

  const exerciseIds = exercises.map((e) => e._id);

  // For each exercise find the most recent history entry that was an actual change
  const latestChanges = await ExerciseHistory.aggregate([
    { $match: { userId: new Types.ObjectId(userId), exerciseId: { $in: exerciseIds }, 'changedFields.0': { $exists: true } } },
    { $sort: { recordedAt: -1 } },
    { $group: { _id: '$exerciseId', lastChangedAt: { $first: '$recordedAt' } } },
  ]);

  const lastChangeMap = new Map<string, Date>(
    latestChanges.map((e) => [String(e._id), e.lastChangedAt])
  );

  return exercises
    .filter((ex) => {
      const lastChange = lastChangeMap.get(String(ex._id));
      return !lastChange || lastChange < cutoff;
    })
    .map((ex) => ({
      id: String(ex._id),
      name: ex.name,
      currentSets: ex.sets,
      currentReps: ex.reps,
      currentWeight: ex.weight,
      lastChangedAt: lastChangeMap.get(String(ex._id))?.toISOString() ?? null,
    }));
}

export async function getDayStats(userId: string, dayId: string) {
  const day = await WorkoutDay.findOne({ _id: dayId, userId });
  if (!day) throw AppError.notFound('Workout day');

  const exercises = await Exercise.find({ workoutDayId: dayId, userId }).sort({ order: 1 });

  // Fetch all history for every exercise in this day in one query
  const exerciseIds = exercises.map((e) => e._id);
  const allHistory = await ExerciseHistory.find({
    exerciseId: { $in: exerciseIds },
    userId,
  }).sort({ recordedAt: 1 }).lean();

  // Group history by exerciseId
  const historyByExercise = new Map<string, typeof allHistory>();
  exercises.forEach((e) => historyByExercise.set(String(e._id), []));
  allHistory.forEach((h) => {
    const key = String(h.exerciseId);
    historyByExercise.get(key)?.push(h);
  });

  // --- Volume timeline ---
  // Collect all unique calendar dates with activity
  const allDates = new Set<string>();
  allHistory.forEach((h) => allDates.add(toDateKey(h.recordedAt)));
  const sortedDates = Array.from(allDates).sort();

  const volumeByDate = sortedDates.map((dateKey) => {
    const cutoff = new Date(dateKey + 'T23:59:59.999Z');
    let totalVolume: number | null = null;
    let totalWeightSum = 0;
    let weightCount = 0;

    exercises.forEach((ex) => {
      const history = historyByExercise.get(String(ex._id)) ?? [];
      const relevant = history.filter((h) => h.recordedAt <= cutoff);
      if (relevant.length === 0) return;
      const latest = relevant[relevant.length - 1];
      if (latest.weight != null) {
        const reps = parseReps(latest.reps);
        totalVolume = (totalVolume ?? 0) + latest.sets * reps * latest.weight;
        totalWeightSum += latest.weight;
        weightCount++;
      }
    });

    return {
      date: dateKey,
      volume: totalVolume,
      avgWeight: weightCount > 0 ? Math.round((totalWeightSum / weightCount) * 10) / 10 : null,
    };
  });

  // --- Exercise summaries ---
  const exerciseSummaries = exercises.map((ex) => {
    const history = historyByExercise.get(String(ex._id)) ?? [];
    const weightHistory = history
      .filter((h) => h.weight != null)
      .map((h) => ({ date: toDateKey(h.recordedAt), weight: h.weight as number, reps: h.reps, sets: h.sets }));

    const firstWeight = weightHistory[0]?.weight ?? null;
    const lastWeight = weightHistory[weightHistory.length - 1]?.weight ?? null;
    const weightDelta = firstWeight != null && lastWeight != null ? lastWeight - firstWeight : null;

    return {
      id: String(ex._id),
      name: ex.name,
      currentSets: ex.sets,
      currentReps: ex.reps,
      currentWeight: ex.weight,
      weightDelta,
      historyCount: history.length,
      weightHistory: weightHistory.slice(-20), // last 20 for sparkline
    };
  });

  return {
    dayId: String(day._id),
    dayName: day.name,
    volumeByDate: volumeByDate.filter((d) => d.volume != null || d.avgWeight != null),
    exercises: exerciseSummaries,
  };
}

// Maps old muscle group IDs to new split IDs after the back/shoulder breakdown refactor
const MUSCLE_ID_MIGRATION: Record<string, string[]> = {
  back:      ['lats', 'upper-back'],
  shoulders: ['side-delts'],
};

export async function getMuscleStats(userId: string) {
  // Migrate any exercises still using legacy IDs (idempotent)
  const legacyIds = Object.keys(MUSCLE_ID_MIGRATION);
  const stale = await Exercise.find({ userId, muscleGroups: { $in: legacyIds } });
  for (const ex of stale) {
    ex.muscleGroups = [...new Set(
      ex.muscleGroups.flatMap((id) => MUSCLE_ID_MIGRATION[id] ?? [id])
    )];
    await ex.save();
  }

  const exercises = await Exercise.find({ userId, isActive: true })
    .select('name muscleGroups sets reps weight')
    .lean();

  // Last date each exercise had a weight or reps increase
  const exerciseIds = exercises.map((ex) => ex._id);
  const lastProgressRows = await ExerciseHistory.aggregate([
    { $match: { exerciseId: { $in: exerciseIds }, changedFields: { $in: ['weight', 'reps'] } } },
    { $sort: { recordedAt: -1 } },
    { $group: { _id: '$exerciseId', lastProgressAt: { $first: '$recordedAt' } } },
  ]);
  const lastProgressMap = new Map<string, Date>(
    lastProgressRows.map((r) => [String(r._id), r.lastProgressAt as Date])
  );

  return exercises
    .filter((ex) => ex.muscleGroups && ex.muscleGroups.length > 0)
    .map((ex) => ({
      name: ex.name,
      muscleGroups: ex.muscleGroups,
      sets: ex.sets,
      reps: ex.reps,
      weight: ex.weight ?? null,
      lastProgressAt: lastProgressMap.get(String(ex._id))?.toISOString() ?? null,
    }));
}
