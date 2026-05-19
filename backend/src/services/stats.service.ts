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

export async function getStrengthRankings(userId: string) {
  const [exercises, latestBW] = await Promise.all([
    Exercise.find({ userId, isActive: true })
      .select('name muscleGroups sets reps weight')
      .lean(),
    BodyWeightHistory.findOne({ userId }).sort({ recordedAt: -1 }).lean(),
  ]);

  const bodyWeight = latestBW?.weight ?? null;

  const exerciseIds = exercises.map((e) => e._id);

  // Count weighted history entries per exercise — most-tracked = primary indicator
  const [historyCountRows, firstHistoryRows] = await Promise.all([
    ExerciseHistory.aggregate([
      { $match: { exerciseId: { $in: exerciseIds }, userId: new Types.ObjectId(userId), weight: { $ne: null } } },
      { $group: { _id: '$exerciseId', count: { $sum: 1 } } },
    ]),
    // First entry per exercise for "started" comparison
    ExerciseHistory.aggregate([
      { $match: { exerciseId: { $in: exerciseIds }, userId: new Types.ObjectId(userId), weight: { $ne: null } } },
      { $sort: { recordedAt: 1 } },
      { $group: { _id: '$exerciseId', firstWeight: { $first: '$weight' }, firstReps: { $first: '$reps' } } },
    ]),
  ]);

  const historyCountMap = new Map(historyCountRows.map((r) => [String(r._id), r.count as number]));
  const firstHistMap = new Map<string, { firstWeight: number; firstReps: string }>();
  firstHistoryRows.forEach((r) => firstHistMap.set(String(r._id), r as { firstWeight: number; firstReps: string }));

  // Epley 1RM estimate
  const epley = (weight: number, reps: number) => weight * (1 + reps / 30);

  // User enters one-side weight for all barbell and dumbbell exercises (no bar weight included).
  // Cable / machine stack exercises are entered as total weight — no correction needed.
  function effectiveWeight(name: string, weight: number): number {
    const n = name.toLowerCase();

    // Smith machine: one side (plate) → ×2 + 11 kg bar
    if (n.includes('smith')) return weight * 2 + 11;

    // Standard barbell exercises: one side (plate) → ×2 + 20 kg bar
    if (n.includes('barbell') || n.includes('bent over row') || n.includes('bb row') ||
        n.includes('pendlay') || n.includes('reverse curl')) return weight * 2 + 20;

    // Dumbbell PRESSING movements (bilateral): one dumbbell → ×2, no bar
    if ((n.includes('dumbbell') || n.includes('dumbell')) && n.includes('press')) return weight * 2;

    // Cable / machine / isolation dumbbells: full weight as entered
    return weight;
  }

  // Selection priority: prefer exercises where the target muscle is FIRST in the list
  // (primary target), then break ties by history count, then by 1RM.
  // This stops a bench press (chest primary, triceps secondary) from overriding
  // a tricep rope extension when ranking the triceps muscle group.
  type BestEntry = { current1RM: number; start1RM: number; effectiveWt: number; exerciseName: string; histCount: number; isPrimary: boolean };
  const mgBest = new Map<string, BestEntry>();

  for (const ex of exercises) {
    if (!ex.weight || !ex.muscleGroups?.length) continue;

    const exId = String(ex._id);
    const histCount = historyCountMap.get(exId) ?? 0;
    const adjWeight = effectiveWeight(ex.name, ex.weight);
    const currentReps = parseReps(ex.reps);
    const current1RM = epley(adjWeight, currentReps);

    const firstH = firstHistMap.get(exId);
    const firstAdjWeight = firstH ? effectiveWeight(ex.name, firstH.firstWeight) : adjWeight;
    const start1RM = firstH
      ? epley(firstAdjWeight, parseReps(firstH.firstReps))
      : current1RM;

    for (let i = 0; i < ex.muscleGroups.length; i++) {
      const mg = ex.muscleGroups[i];
      const isPrimary = i === 0;
      const existing = mgBest.get(mg);

      let isBetter = !existing;
      if (existing) {
        if (isPrimary && !existing.isPrimary) isBetter = true;
        else if (isPrimary === existing.isPrimary) {
          isBetter = histCount > existing.histCount
            || (histCount === existing.histCount && current1RM > existing.current1RM);
        }
      }
      if (isBetter) {
        mgBest.set(mg, { current1RM, start1RM, effectiveWt: adjWeight, exerciseName: ex.name, histCount, isPrimary });
      }
    }
  }

  const muscleGroups: Record<string, {
    current1RM: number;
    start1RM: number;
    effectiveWeight: number;
    currentRatio: number | null;
    startRatio: number | null;
    exerciseName: string;
  }> = {};

  for (const [mg, data] of mgBest.entries()) {
    muscleGroups[mg] = {
      current1RM: Math.round(data.current1RM * 10) / 10,
      start1RM: Math.round(data.start1RM * 10) / 10,
      effectiveWeight: Math.round(data.effectiveWt * 10) / 10,
      currentRatio: bodyWeight ? Math.round((data.current1RM / bodyWeight) * 1000) / 1000 : null,
      startRatio: bodyWeight ? Math.round((data.start1RM / bodyWeight) * 1000) / 1000 : null,
      exerciseName: data.exerciseName,
    };
  }

  return { bodyWeight, muscleGroups };
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
