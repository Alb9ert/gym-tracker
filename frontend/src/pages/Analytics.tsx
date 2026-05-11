import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { workoutDaysApi } from '@/api/workoutDays.api';
import { bodyWeightApi } from '@/api/bodyWeight.api';
import { statsApi, type StaleExercise } from '@/api/stats.api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

type DayMetric = 'volume' | 'avgWeight';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function DeltaBadge({ delta, unit = 'kg' }: { delta: number | null; unit?: string }) {
  if (delta == null) return <span className="text-xs text-secondary font-medium">—</span>;
  const positive = delta >= 0;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${positive ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'}`}>
      {positive ? '+' : ''}{delta.toFixed(delta % 1 === 0 ? 0 : 1)} {unit}
    </span>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <div className="w-16 h-6 flex items-center justify-center text-xs text-secondary">—</div>;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 24;
  const w = 64;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SummaryCards() {
  const { data } = useQuery({
    queryKey: ['stats-summary'],
    queryFn: () => statsApi.getSummary().then((r) => r.data.data),
  });
  return (
    <div className="grid grid-cols-3 gap-2 mb-6">
      {[
        { label: 'Days', value: data?.dayCount ?? '—' },
        { label: 'Exercises', value: data?.exerciseCount ?? '—' },
        { label: 'Logs', value: data?.historyCount ?? '—' },
      ].map(({ label, value }) => (
        <div key={label} className="bg-white rounded-2xl border border-border-subtle shadow-sm px-3 py-3 text-center">
          <p className="text-xl font-bold text-primary">{value}</p>
          <p className="text-xs font-semibold text-secondary mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}

function BodyWeightSection() {
  const { data: entries } = useQuery({
    queryKey: ['body-weight'],
    queryFn: () => bodyWeightApi.getAll().then((r) => r.data.data),
  });
  const chartData = entries?.slice().reverse().map((e) => ({ date: formatDate(e.recordedAt), weight: e.weight }));
  const latest = entries?.[0];
  const first = entries?.[entries.length - 1];
  const delta = latest && first ? latest.weight - first.weight : null;

  if (!entries?.length) return null;

  const tickInterval = chartData && chartData.length > 30
    ? Math.floor(chartData.length / 6)
    : chartData && chartData.length > 10
    ? Math.floor(chartData.length / 4)
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-border-subtle shadow-sm p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold text-secondary uppercase tracking-wider">Body weight</p>
        <div className="flex items-center gap-2">
          {latest && <span className="font-bold text-primary">{latest.weight} kg</span>}
          <DeltaBadge delta={delta} />
        </div>
      </div>
      {chartData && chartData.length > 1 && (
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
            <XAxis dataKey="date" tick={{ fill: '#6E6E73', fontSize: 10 }} axisLine={false} tickLine={false} interval={tickInterval} />
            <YAxis tick={{ fill: '#6E6E73', fontSize: 10 }} axisLine={false} tickLine={false} width={36} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #C7C7CC', borderRadius: '10px', fontSize: '12px' }}
              labelStyle={{ color: '#6E6E73' }}
            />
            <Line type="monotone" dataKey="weight" stroke="#34C759" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function StaleExercises() {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ['stale-exercises'],
    queryFn: () => statsApi.getStaleExercises().then((r) => r.data.data),
  });

  if (!data?.length) return null;

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <p className="text-xs font-bold text-secondary uppercase tracking-wider">No progress in 14+ days</p>
        <span className="bg-accent-orange/15 text-accent-orange text-xs font-bold px-2 py-0.5 rounded-md">
          {data.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {data.map((ex: StaleExercise) => {
          const days = ex.lastChangedAt ? daysSince(ex.lastChangedAt) : null;
          return (
            <button
              key={ex.id}
              onClick={() => navigate(`/exercise/${ex.id}`)}
              className="bg-white rounded-xl border border-border-subtle shadow-sm px-4 py-3 text-left w-full active:bg-gray-50"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-primary text-sm truncate">{ex.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs bg-gray-100 text-secondary font-semibold px-2 py-0.5 rounded-md">
                      {ex.currentSets}×{ex.currentReps}
                    </span>
                    {ex.currentWeight != null && (
                      <span className="text-xs bg-accent/10 text-accent font-bold px-2 py-0.5 rounded-md">
                        {ex.currentWeight} kg
                      </span>
                    )}
                    {ex.currentWeight == null && (
                      <span className="text-xs bg-gray-100 text-secondary font-semibold px-2 py-0.5 rounded-md">
                        Bodyweight
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-bold text-accent-orange flex-shrink-0">
                  {days != null ? `${days}d ago` : 'Never changed'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RecentActivity() {
  const { data } = useQuery({
    queryKey: ['stats-summary'],
    queryFn: () => statsApi.getSummary().then((r) => r.data.data),
  });
  const navigate = useNavigate();
  const recent = data?.recentActivity ?? [];
  if (!recent.length) return null;

  return (
    <div className="mb-5">
      <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Recent changes</p>
      <div className="flex flex-col gap-2">
        {recent.map((entry, i) => (
          <button
            key={i}
            onClick={() => navigate(`/exercise/${entry.exerciseId}`)}
            className="bg-white rounded-xl border border-border-subtle shadow-sm px-4 py-3 text-left w-full active:bg-gray-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-primary text-sm">{entry.exerciseName}</p>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  <span className="text-xs bg-gray-100 text-secondary font-semibold px-2 py-0.5 rounded-md">
                    {entry.sets}×{entry.reps}
                  </span>
                  {entry.weight != null && (
                    <span className="text-xs bg-accent/10 text-accent font-bold px-2 py-0.5 rounded-md">
                      {entry.weight} kg
                    </span>
                  )}
                  {entry.changedFields.map((f) => {
                    const colors: Record<string, string> = {
                      weight: 'bg-accent/10 text-accent',
                      reps: 'bg-accent-green/10 text-accent-green',
                      sets: 'bg-accent-orange/10 text-accent-orange',
                    };
                    return (
                      <span key={f} className={`text-xs font-semibold px-2 py-0.5 rounded-md ${colors[f] ?? 'bg-gray-100 text-secondary'}`}>
                        {f} ↑
                      </span>
                    );
                  })}
                </div>
              </div>
              <span className="text-xs text-secondary font-medium ml-2 flex-shrink-0">{formatDate(entry.recordedAt)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function DayStatsView({ dayId }: { dayId: string }) {
  const navigate = useNavigate();
  const [metric, setMetric] = useState<DayMetric>('volume');

  const { data, isLoading } = useQuery({
    queryKey: ['day-stats', dayId],
    queryFn: () => statsApi.getDayStats(dayId).then((r) => r.data.data),
    enabled: !!dayId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }
  if (!data) return null;

  const chartData = data.volumeByDate.map((d) => ({
    date: formatDate(d.date),
    volume: d.volume != null ? Math.round(d.volume) : null,
    avgWeight: d.avgWeight,
  }));

  const xTickInterval = chartData.length > 30
    ? Math.floor(chartData.length / 6)
    : chartData.length > 10
    ? Math.floor(chartData.length / 4)
    : 0;

  const metricKey = metric === 'volume' ? 'volume' : 'avgWeight';
  const metricLabel = metric === 'volume' ? 'Total volume' : 'Avg weight';
  const metricUnit = 'kg';
  const metricColor = metric === 'volume' ? '#007AFF' : '#FF9500';

  const validData = chartData.filter((d) => d[metricKey] != null);
  const firstVal = validData[0]?.[metricKey] as number | undefined;
  const lastVal = validData[validData.length - 1]?.[metricKey] as number | undefined;
  const delta = firstVal != null && lastVal != null ? lastVal - firstVal : null;

  return (
    <div>
      {/* Day summary cards */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 bg-white rounded-2xl border border-border-subtle shadow-sm px-4 py-3">
          <p className="text-xs font-semibold text-secondary uppercase tracking-wider">Exercises</p>
          <p className="text-xl font-bold text-primary mt-0.5">{data.exercises.length}</p>
        </div>
        {lastVal != null && (
          <div className="flex-1 bg-white rounded-2xl border border-border-subtle shadow-sm px-4 py-3">
            <p className="text-xs font-semibold text-secondary uppercase tracking-wider">{metricLabel}</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <p className="text-xl font-bold text-primary">{(lastVal as number).toFixed(0)}</p>
              {delta != null && <DeltaBadge delta={delta} unit={metricUnit} />}
            </div>
          </div>
        )}
      </div>

      {/* Chart metric toggle */}
      <div className="flex gap-2 mb-3 bg-white rounded-2xl border border-border-subtle p-1.5 shadow-sm">
        {([['volume', 'Total volume'], ['avgWeight', 'Avg weight']] as [DayMetric, string][]).map(([m, lbl]) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${metric === m ? 'bg-accent text-white shadow-sm' : 'text-secondary active:bg-gray-100'}`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-border-subtle shadow-sm p-5 mb-5">
        {validData.length > 1 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
              <XAxis dataKey="date" tick={{ fill: '#6E6E73', fontSize: 11 }} axisLine={false} tickLine={false} interval={xTickInterval} />
              <YAxis tick={{ fill: '#6E6E73', fontSize: 11 }} axisLine={false} tickLine={false} width={metric === 'volume' ? 52 : 42} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #C7C7CC', borderRadius: '12px', fontSize: '13px' }}
                labelStyle={{ color: '#6E6E73', fontWeight: '600' }}
                formatter={(v: number) => [`${v} ${metricUnit}`, metricLabel]}
              />
              {firstVal != null && (
                <ReferenceLine y={firstVal} stroke="#E5E5EA" strokeDasharray="4 4" />
              )}
              <Line
                type="monotone"
                dataKey={metricKey}
                stroke={metricColor}
                strokeWidth={2.5}
                connectNulls
                dot={{ fill: metricColor, r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-24 flex items-center justify-center text-secondary text-sm">
            {validData.length === 0
              ? 'No weighted exercises in this day yet'
              : 'Update exercises more than once to see a chart'}
          </div>
        )}
      </div>

      {/* Exercise breakdown */}
      <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Exercise breakdown</p>
      <div className="flex flex-col gap-2">
        {data.exercises.map((ex) => (
          <button
            key={ex.id}
            onClick={() => navigate(`/exercise/${ex.id}`)}
            className="bg-white rounded-2xl border border-border-subtle shadow-sm px-4 py-3.5 text-left w-full active:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-primary text-sm truncate">{ex.name}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs bg-gray-100 text-secondary font-semibold px-2 py-0.5 rounded-md">
                    {ex.currentSets}×{ex.currentReps}
                  </span>
                  {ex.currentWeight != null && (
                    <span className="text-xs bg-accent/10 text-accent font-bold px-2 py-0.5 rounded-md">
                      {ex.currentWeight} kg
                    </span>
                  )}
                  <DeltaBadge delta={ex.weightDelta} />
                </div>
              </div>
              <div className="flex-shrink-0">
                <Sparkline
                  data={ex.weightHistory.map((h) => h.weight)}
                  color={ex.weightDelta != null && ex.weightDelta >= 0 ? '#34C759' : '#FF3B30'}
                />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function Analytics() {
  const { data: days, isLoading: daysLoading } = useQuery({
    queryKey: ['workout-days'],
    queryFn: () => workoutDaysApi.getAll().then((r) => r.data.data),
  });

  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const activeDayId = selectedDayId ?? days?.[0]?._id ?? null;

  return (
    <div className="px-5 pt-14 pb-6">
      <h1 className="text-2xl font-bold tracking-tight text-primary mb-6">Stats</h1>

      {/* Summary cards */}
      <SummaryCards />

      {/* Body weight */}
      <BodyWeightSection />

      {/* Per-day section */}
      <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Progress by day</p>

      {daysLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-accent rounded-full animate-spin" />
        </div>
      ) : !days?.length ? (
        <div className="bg-white rounded-2xl border border-border-subtle px-5 py-10 text-center mb-5">
          <p className="font-semibold text-primary">No workout days yet</p>
          <p className="text-secondary text-sm mt-1">Add days and exercises to see stats</p>
        </div>
      ) : (
        <>
          {/* Day tab selector */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
            {days.map((day) => (
              <button
                key={day._id}
                onClick={() => setSelectedDayId(day._id)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  activeDayId === day._id
                    ? 'bg-accent text-white border-accent shadow-sm'
                    : 'bg-white text-secondary border-border-subtle'
                }`}
              >
                {day.name}
              </button>
            ))}
          </div>

          {activeDayId && <DayStatsView key={activeDayId} dayId={activeDayId} />}
        </>
      )}

      {/* Stale exercises */}
      <div className="mt-5">
        <StaleExercises />
      </div>

      {/* Recent activity */}
      <div className="mt-5">
        <RecentActivity />
      </div>
    </div>
  );
}
