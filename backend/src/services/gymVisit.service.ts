import { GymVisit } from '../models/GymVisit';

export async function logVisit(userId: string, data: {
  workoutDayId?: string | null;
  workoutDayName?: string | null;
  visitedAt?: string;
}) {
  return GymVisit.create({
    userId,
    workoutDayId: data.workoutDayId ?? null,
    workoutDayName: data.workoutDayName ?? null,
    visitedAt: data.visitedAt ? new Date(data.visitedAt) : new Date(),
  });
}

export async function getVisits(userId: string) {
  const visits = await GymVisit.find({ userId }).sort({ visitedAt: -1 }).lean();

  // --- Stats ---
  const now = new Date();

  // Start of current week (Monday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  startOfWeek.setHours(0, 0, 0, 0);

  // Start of current month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const thisWeek = visits.filter((v) => v.visitedAt >= startOfWeek).length;
  const thisMonth = visits.filter((v) => v.visitedAt >= startOfMonth).length;

  // Consecutive-day streak ending today or yesterday
  const visitDays = new Set(
    visits.map((v) => {
      const d = new Date(v.visitedAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );

  let streak = 0;
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);

  // Allow streak to include today even if not yet logged today
  while (visitDays.has(cursor.getTime())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    visits: visits.map((v) => ({
      _id: String(v._id),
      workoutDayId: v.workoutDayId ? String(v.workoutDayId) : null,
      workoutDayName: v.workoutDayName,
      visitedAt: v.visitedAt.toISOString(),
    })),
    stats: {
      total: visits.length,
      thisWeek,
      thisMonth,
      streak,
    },
  };
}

export async function removeVisit(userId: string, visitId: string) {
  await GymVisit.deleteOne({ _id: visitId, userId });
}
