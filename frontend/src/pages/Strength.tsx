import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Model from 'react-body-highlighter';
import { statsApi } from '@/api/stats.api';
import { gymVisitApi, type GymVisit } from '@/api/gymVisit.api';
import { MUSCLE_GROUPS } from '@/constants/muscles';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// Exercise-specific strength standards as 1RM / bodyweight ratio.
// Each pattern has keywords (any match wins) and 4 thresholds:
// [Beginner→Int, Int→Adv, Adv→Elite, Elite→Exceptional]
// Calibrated per exercise type so a fly machine and a bench press
// for the same muscle are scored against their own reference averages.
const EXERCISE_PATTERNS: Array<{ keywords: string[]; thresholds: [number, number, number, number] }> = [
  // ── Chest ──────────────────────────────────────────────────────────────────
  { keywords: ['bench press', 'smith bench', 'bench smith', 'barbell bench', 'smith press'],
    thresholds: [0.5, 0.8, 1.1, 1.5] },         // total weight (incl. bar)
  { keywords: ['incline press', 'incline dumbell', 'incline dumbbell', 'dumbbell press', 'dumbell press'],
    thresholds: [0.45, 0.75, 1.05, 1.4] },       // total (×2 applied in backend)
  { keywords: ['chest press', 'machine press'],
    thresholds: [0.5, 0.85, 1.25, 1.7] },
  { keywords: ['fly', 'flye', 'pec deck', 'cable cross', 'cable chest'],
    thresholds: [0.5, 0.9, 1.35, 1.85] },

  // ── Back ───────────────────────────────────────────────────────────────────
  { keywords: ['deadlift', 'dead lift', 'rdl', 'romanian'],
    thresholds: [0.7, 1.2, 1.75, 2.3] },
  { keywords: ['lat pulldown', 'pulldown', 'pull-down', 'pull down'],
    thresholds: [0.4, 0.7, 1.05, 1.45] },
  { keywords: ['cable row', 'seated row', 'machine row', 'low row', 'chest supported'],
    thresholds: [0.4, 0.7, 1.05, 1.45] },
  { keywords: ['bent over row', 'barbell row', 'bb row', 'pendlay'],
    thresholds: [0.4, 0.7, 1.0, 1.35] },
  { keywords: ['dumbbell row', 'dumbell row', 'one arm row', 'single arm row'],
    thresholds: [0.25, 0.45, 0.7, 1.0] },        // per dumbbell

  // ── Shoulders ──────────────────────────────────────────────────────────────
  { keywords: ['overhead press', 'ohp', 'military press', 'shoulder press', 'overhead smith'],
    thresholds: [0.3, 0.55, 0.8, 1.1] },
  { keywords: ['lateral raise', 'side raise', 'shoulder raise', 'side lateral'],
    thresholds: [0.06, 0.12, 0.2, 0.32] },       // per dumbbell
  { keywords: ['face pull', 'rear cable'],
    thresholds: [0.2, 0.4, 0.65, 0.95] },
  { keywords: ['rear delt', 'reverse fly', 'reverse pec', 'posterior delt'],
    thresholds: [0.3, 0.55, 0.85, 1.25] },

  // ── Arms ───────────────────────────────────────────────────────────────────
  { keywords: ['preacher', 'hammer curl', 'dumbbell curl', 'dumbell curl', 'concentration curl'],
    thresholds: [0.12, 0.22, 0.35, 0.5] },       // per dumbbell
  { keywords: ['barbell curl', 'ez curl', 'ez bar', 'straight bar curl'],
    thresholds: [0.25, 0.45, 0.65, 0.9] },
  { keywords: ['cable curl', 'rope curl'],
    thresholds: [0.15, 0.28, 0.42, 0.6] },
  { keywords: ['rope extension', 'tricep rope', 'tricep pushdown', 'cable tricep', 'pushdown'],
    thresholds: [0.3, 0.55, 0.85, 1.25] },
  { keywords: ['overhead tricep', 'overhead extension', 'skull crusher', 'lying tricep'],
    thresholds: [0.25, 0.45, 0.7, 1.0] },
  { keywords: ['tricep extension', 'tricep'],
    thresholds: [0.25, 0.5, 0.75, 1.1] },
  { keywords: ['forearm', 'wrist curl', 'reverse curl'],
    thresholds: [0.25, 0.5, 0.85, 1.25] },

  // ── Legs ───────────────────────────────────────────────────────────────────
  { keywords: ['squat', 'hack squat'],
    thresholds: [0.6, 1.0, 1.5, 2.0] },
  { keywords: ['leg press'],
    thresholds: [1.0, 1.75, 2.5, 3.5] },
  { keywords: ['leg extension', 'leg ext', 'quad extension'],
    thresholds: [0.5, 0.9, 1.4, 2.0] },
  { keywords: ['leg curl', 'ham curl', 'hamstring curl', 'lying curl', 'seated curl'],
    thresholds: [0.45, 0.8, 1.2, 1.65] },
  { keywords: ['hip thrust', 'glute bridge', 'hip bridge'],
    thresholds: [0.8, 1.35, 2.0, 2.7] },
  { keywords: ['calf', 'calves'],
    thresholds: [0.6, 1.1, 1.85, 2.7] },

  // ── Core ───────────────────────────────────────────────────────────────────
  { keywords: ['ab machine', 'cable crunch', 'crunch machine', 'crunches'],
    thresholds: [0.5, 0.85, 1.3, 1.8] },
];

// Muscle-group fallback when no pattern matches (conservative)
const MUSCLE_FALLBACK: Record<string, [number, number, number, number]> = {
  'chest':       [0.5, 0.85, 1.2, 1.6],
  'lats':        [0.4, 0.7,  1.05, 1.4],
  'upper-back':  [0.4, 0.7,  1.0, 1.35],
  'lower-back':  [0.6, 1.0,  1.5, 2.0],
  'front-delts': [0.3, 0.55, 0.8, 1.1],
  'side-delts':  [0.06, 0.12, 0.2, 0.32],
  'rear-delts':  [0.3, 0.55, 0.85, 1.25],
  'biceps':      [0.15, 0.28, 0.42, 0.6],
  'triceps':     [0.25, 0.5,  0.75, 1.1],
  'forearms':    [0.25, 0.5,  0.85, 1.25],
  'core':        [0.5, 0.85, 1.3, 1.8],
  'quads':       [1.0, 1.75, 2.5, 3.5],
  'hamstrings':  [0.45, 0.8,  1.2, 1.65],
  'glutes':      [1.0, 1.75, 2.5, 3.5],
  'calves':      [0.6, 1.1,  1.85, 2.7],
};

function getThresholds(exerciseName: string, muscleId: string): [number, number, number, number] {
  const lower = exerciseName.toLowerCase();
  for (const { keywords, thresholds } of EXERCISE_PATTERNS) {
    if (keywords.some((k) => lower.includes(k))) return thresholds;
  }
  return MUSCLE_FALLBACK[muscleId] ?? [0.35, 0.65, 1.0, 1.4];
}

// 1 = Beginner, 2 = Intermediate, 3 = Advanced, 4 = Elite, 5 = Exceptional
function getTier(ratio: number | null, exerciseName: string, muscleId: string): 0 | 1 | 2 | 3 | 4 | 5 {
  if (ratio === null) return 0;
  const t = getThresholds(exerciseName, muscleId);
  if (ratio < t[0]) return 1;
  if (ratio < t[1]) return 2;
  if (ratio < t[2]) return 3;
  if (ratio < t[3]) return 4;
  return 5;
}

const TIER_LABELS = ['', 'Beginner', 'Intermediate', 'Advanced', 'Elite', 'Exceptional'] as const;
const TIER_COLORS = ['#FF3B30', '#FF9500', '#FFD60A', '#30D158', '#0A84FF'] as const;
// index 0 = tier 1 (Beginner), ..., index 4 = tier 5 (Exceptional)

const TIER_CHIP: Record<number, string> = {
  1: 'bg-accent-red/10 text-accent-red border-accent-red/20',
  2: 'bg-accent-orange/10 text-accent-orange border-accent-orange/20',
  3: 'bg-[#FFD60A]/10 text-[#B8860B] border-[#FFD60A]/30',
  4: 'bg-accent-green/10 text-accent-green border-accent-green/20',
  5: 'bg-accent/10 text-accent border-accent/20',
};

// Compute weekly gym visit stats
function computeWeeklyStats(visits: GymVisit[]) {
  if (!visits.length) return null;

  const weekCounts = new Map<string, number>();
  for (const v of visits) {
    const date = new Date(v.visitedAt);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    const key = monday.toISOString().split('T')[0];
    weekCounts.set(key, (weekCounts.get(key) ?? 0) + 1);
  }

  // Exclude the current (possibly incomplete) week
  const now = new Date();
  const nowDay = now.getDay();
  const nowDiff = nowDay === 0 ? -6 : 1 - nowDay;
  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() + nowDiff);
  currentMonday.setHours(0, 0, 0, 0);
  const currentWeekKey = currentMonday.toISOString().split('T')[0];

  const counts = Array.from(weekCounts.entries())
    .filter(([k]) => k !== currentWeekKey)
    .map(([, count]) => count);

  if (!counts.length) return null;

  const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
  const sorted = [...counts].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
  const best = Math.max(...counts);

  // Last 12 weeks bar chart data
  const allWeeks = Array.from(weekCounts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([key, count]) => ({
      label: new Date(key).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      visits: count,
    }));

  return { avg: Math.round(avg * 10) / 10, median, best, weeksTracked: counts.length, weeklyChart: allWeeks };
}

function computeDayOfWeekStats(visits: GymVisit[]) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const v of visits) {
    const d = new Date(v.visitedAt).getDay(); // 0=Sun..6=Sat
    const idx = d === 0 ? 6 : d - 1; // Mon=0..Sun=6
    counts[idx]++;
  }
  return days.map((label, i) => ({ label, visits: counts[i] }));
}

function StrengthRankings() {
  const { data, isLoading } = useQuery({
    queryKey: ['strength-rankings'],
    queryFn: () => statsApi.getStrengthRankings().then((r) => r.data.data),
  });

  const hasBodyWeight = !!data?.bodyWeight;

  const startModelData = useMemo(() => {
    if (!data) return [];
    return MUSCLE_GROUPS
      .filter((mg) => mg.libraryNames.length > 0)
      .flatMap((mg) => {
        const entry = data.muscleGroups[mg.id];
        if (!entry || entry.startRatio === null) return [];
        const tier = getTier(entry.startRatio, entry.exerciseName, mg.id);
        if (tier === 0) return [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return [{ name: mg.id, muscles: mg.libraryNames as unknown as any[], frequency: tier }];
      });
  }, [data]);

  const currentModelData = useMemo(() => {
    if (!data) return [];
    return MUSCLE_GROUPS
      .filter((mg) => mg.libraryNames.length > 0)
      .flatMap((mg) => {
        const entry = data.muscleGroups[mg.id];
        if (!entry || entry.currentRatio === null) return [];
        const tier = getTier(entry.currentRatio, entry.exerciseName, mg.id);
        if (tier === 0) return [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return [{ name: mg.id, muscles: mg.libraryNames as unknown as any[], frequency: tier }];
      });
  }, [data]);

  // Muscle breakdown rows
  const muscleRows = useMemo(() => {
    if (!data) return [];
    return MUSCLE_GROUPS
      .filter((mg) => data.muscleGroups[mg.id])
      .map((mg) => {
        const entry = data.muscleGroups[mg.id];
        const startTier = getTier(entry.startRatio, entry.exerciseName, mg.id);
        const currentTier = getTier(entry.currentRatio, entry.exerciseName, mg.id);
        const thresholds = getThresholds(entry.exerciseName, mg.id);
        return {
          id: mg.id,
          label: mg.label,
          exerciseName: entry.exerciseName,
          startTier,
          currentTier,
          current1RM: entry.current1RM,
          start1RM: entry.start1RM,
          effectiveWeight: entry.effectiveWeight,
          thresholds,
          improved: currentTier > startTier,
        };
      })
      .sort((a, b) => b.currentTier - a.currentTier);
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || Object.keys(data.muscleGroups).length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-border-subtle shadow-sm px-5 py-10 text-center mb-5">
        <p className="font-semibold text-primary">No strength data yet</p>
        <p className="text-secondary text-sm mt-1">Add exercises with muscle groups and weights to see your rankings.</p>
      </div>
    );
  }

  return (
    <div className="mb-5">
      {/* Body maps: Started vs Now */}
      <div className="bg-white rounded-2xl border border-border-subtle shadow-sm p-4 mb-4">
        {!hasBodyWeight && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-accent-orange/10 border border-accent-orange/20">
            <p className="text-xs text-accent-orange font-semibold text-center">
              Log your body weight for personalized strength ratios
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {/* Started */}
          <div>
            <p className="text-xs font-bold text-secondary text-center mb-2 uppercase tracking-wider">Started</p>
            <div className="flex justify-center gap-1">
              <Model
                data={startModelData}
                highlightedColors={[...TIER_COLORS]}
                bodyColor="#D1D5DB"
                style={{ flex: 1, maxWidth: '110px' }}
                svgStyle={{ height: '210px', width: '100%', display: 'block' }}
                type="anterior"
              />
              <Model
                data={startModelData}
                highlightedColors={[...TIER_COLORS]}
                bodyColor="#D1D5DB"
                style={{ flex: 1, maxWidth: '110px' }}
                svgStyle={{ height: '210px', width: '100%', display: 'block' }}
                type="posterior"
              />
            </div>
          </div>

          {/* Now */}
          <div>
            <p className="text-xs font-bold text-secondary text-center mb-2 uppercase tracking-wider">Now</p>
            <div className="flex justify-center gap-1">
              <Model
                data={currentModelData}
                highlightedColors={[...TIER_COLORS]}
                bodyColor="#D1D5DB"
                style={{ flex: 1, maxWidth: '110px' }}
                svgStyle={{ height: '210px', width: '100%', display: 'block' }}
                type="anterior"
              />
              <Model
                data={currentModelData}
                highlightedColors={[...TIER_COLORS]}
                bodyColor="#D1D5DB"
                style={{ flex: 1, maxWidth: '110px' }}
                svgStyle={{ height: '210px', width: '100%', display: 'block' }}
                type="posterior"
              />
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-4">
          {TIER_LABELS.slice(1).map((label, i) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: TIER_COLORS[i] }} />
              <span className="text-xs text-secondary font-medium">{label}</span>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-secondary mt-2">
          {hasBodyWeight ? 'Based on estimated 1RM ÷ body weight, per exercise type' : 'Based on estimated 1RM (Epley formula)'}
        </p>
      </div>

      {/* Muscle breakdown table */}
      <div className="bg-white rounded-2xl border border-border-subtle shadow-sm p-4 mb-4">
        <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Muscle breakdown</p>
        <div className="flex flex-col gap-2">
          {muscleRows.map((row) => (
            <div key={row.id} className="flex items-center justify-between py-1.5 border-b border-border-subtle last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-primary">{row.label}</p>
                  {row.improved && (
                    <span className="text-xs font-bold text-accent-green">↑</span>
                  )}
                </div>
                <p className="text-xs text-secondary truncate">{row.exerciseName} · {row.effectiveWeight} kg</p>
                <p className="text-xs text-secondary mt-0.5">
                  est. 1RM: {row.start1RM} → {row.current1RM} kg
                </p>
                {data?.bodyWeight && (
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                    {(['Int', 'Adv', 'Elite', 'Excep'] as const).map((label, i) => (
                      <span key={label} className="text-xs font-medium" style={{ color: TIER_COLORS[i + 1] }}>
                        {label} ≥{Math.round(row.thresholds[i] * (data.bodyWeight as number))}kg
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {row.startTier !== row.currentTier && row.startTier > 0 && (
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${TIER_CHIP[row.startTier]}`}
                  >
                    {TIER_LABELS[row.startTier]}
                  </span>
                )}
                {row.currentTier > 0 && (
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${TIER_CHIP[row.currentTier]}`}
                  >
                    {TIER_LABELS[row.currentTier]}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GymStats() {
  const { data, isLoading } = useQuery({
    queryKey: ['gym-visits'],
    queryFn: () => gymVisitApi.getAll().then((r) => r.data.data),
  });

  const weeklyStats = useMemo(() => data ? computeWeeklyStats(data.visits) : null, [data]);
  const dayOfWeekData = useMemo(() => data ? computeDayOfWeekStats(data.visits) : null, [data]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data?.visits.length) {
    return (
      <div className="bg-white rounded-2xl border border-border-subtle shadow-sm px-5 py-10 text-center mb-5">
        <p className="font-semibold text-primary">No gym visits logged yet</p>
        <p className="text-secondary text-sm mt-1">Log visits in the Gym tab to see your stats here.</p>
      </div>
    );
  }

  const { stats } = data;

  return (
    <div className="mb-5">
      {/* Top stat cards */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { label: 'Total sessions', value: stats.total },
          { label: 'Current streak', value: `${stats.streak}d` },
          { label: 'This month', value: stats.thisMonth },
          { label: 'This week', value: stats.thisWeek },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl border border-border-subtle shadow-sm px-4 py-3 text-center">
            <p className="text-xl font-bold text-primary">{value}</p>
            <p className="text-xs font-semibold text-secondary mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Weekly frequency */}
      {weeklyStats && (
        <div className="bg-white rounded-2xl border border-border-subtle shadow-sm p-4 mb-4">
          <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Weekly frequency</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{weeklyStats.avg}</p>
              <p className="text-xs font-semibold text-secondary mt-0.5">Avg / week</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{weeklyStats.median}</p>
              <p className="text-xs font-semibold text-secondary mt-0.5">Median / week</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{weeklyStats.best}</p>
              <p className="text-xs font-semibold text-secondary mt-0.5">Best week</p>
            </div>
          </div>

          {weeklyStats.weeklyChart.length > 1 && (
            <>
              <p className="text-xs font-semibold text-secondary mb-2">Last {weeklyStats.weeklyChart.length} weeks</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={weeklyStats.weeklyChart} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#6E6E73', fontSize: 9 }} axisLine={false} tickLine={false} interval={Math.max(0, Math.ceil(weeklyStats.weeklyChart.length / 6) - 1)} />
                  <YAxis tick={{ fill: '#6E6E73', fontSize: 10 }} axisLine={false} tickLine={false} width={20} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #C7C7CC', borderRadius: '10px', fontSize: '12px' }}
                    formatter={(v: number) => [v, 'Sessions']}
                  />
                  <Bar dataKey="visits" fill="#007AFF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
          <p className="text-xs text-secondary text-center mt-2">
            Based on {weeklyStats.weeksTracked} completed week{weeklyStats.weeksTracked !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Day of week heatmap */}
      {dayOfWeekData && (
        <div className="bg-white rounded-2xl border border-border-subtle shadow-sm p-4 mb-4">
          <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Busiest day</p>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={dayOfWeekData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#6E6E73', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6E6E73', fontSize: 10 }} axisLine={false} tickLine={false} width={20} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #C7C7CC', borderRadius: '10px', fontSize: '12px' }}
                formatter={(v: number) => [v, 'Sessions']}
              />
              <Bar dataKey="visits" fill="#34C759" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {(() => {
            const best = dayOfWeekData.reduce((a, b) => (a.visits >= b.visits ? a : b));
            return best.visits > 0 ? (
              <p className="text-xs text-secondary text-center mt-2">
                Most sessions on <span className="font-bold text-primary">{best.label}</span>
              </p>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}

export function Strength() {
  return (
    <div className="px-5 pt-14 pb-6">
      <h1 className="text-2xl font-bold tracking-tight text-primary mb-6">Strength</h1>

      <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Strength rankings</p>
      <StrengthRankings />

      <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Gym stats</p>
      <GymStats />
    </div>
  );
}
