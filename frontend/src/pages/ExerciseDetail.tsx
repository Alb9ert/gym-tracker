import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Pause } from 'lucide-react';
import { progressApi } from '@/api/progress.api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { ExerciseHistory } from '@/types';

type Metric = 'weight' | 'reps' | 'volume' | 'e1rm';
type Range = '7d' | '30d' | '90d' | 'all';

const RANGES: { label: string; value: Range }[] = [
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: 'All', value: 'all' },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function parseReps(reps: string): number {
  if (reps.includes('-')) {
    const [lo, hi] = reps.split('-').map(Number);
    return Math.round((lo + hi) / 2);
  }
  return parseFloat(reps) || 0;
}

function computeVolume(sets: number, reps: string, weight: number | null): number | null {
  if (weight == null) return null;
  return sets * parseReps(reps) * weight;
}

// Epley formula — most accurate at 1–10 reps
function computeE1RM(reps: string, weight: number | null): number | null {
  if (weight == null) return null;
  const r = parseReps(reps);
  if (r <= 0) return null;
  return Math.round(weight * (1 + r / 30) * 10) / 10;
}

function metricValue(entry: ExerciseHistory, metric: Metric): number | null {
  if (metric === 'weight') return entry.weight;
  if (metric === 'reps') return parseReps(entry.reps);
  if (metric === 'volume') return computeVolume(entry.sets, entry.reps, entry.weight);
  return computeE1RM(entry.reps, entry.weight);
}

const METRIC_CONFIG: Record<Metric, { label: string; unit: string; color: string }> = {
  weight: { label: 'Weight', unit: 'kg',   color: '#007AFF' },
  reps:   { label: 'Reps',   unit: 'reps', color: '#34C759' },
  volume: { label: 'Volume', unit: 'kg',   color: '#FF9500' },
  e1rm:   { label: '1RM',    unit: 'kg',   color: '#AF52DE' },
};

function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function rangeCutoff(range: Range): Date | null {
  if (range === 'all') return null;
  const days = { '7d': 7, '30d': 30, '90d': 90 }[range];
  const d = utcMidnight(new Date());
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

/**
 * Builds a continuous daily series from the first log to today.
 * Each day gets the last-known value carried forward ("step" / hold-last).
 * Only days within the chosen range are returned, but the carry-forward
 * starts from the very first log so the line begins at the correct value
 * even if no change happened inside the range.
 */
function buildContinuousSeries(
  history: ExerciseHistory[],
  metric: Metric,
  range: Range,
): { date: string; value: number }[] {
  if (!history.length) return [];

  // Sort ascending
  const sorted = [...history].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );

  // Build a map: ISO date string → last metric value on that date
  const byDate = new Map<string, number>();
  for (const entry of sorted) {
    const val = metricValue(entry, metric);
    if (val == null) continue;
    const key = new Date(entry.recordedAt).toISOString().split('T')[0];
    byDate.set(key, val);
  }
  if (!byDate.size) return [];

  const firstDate = utcMidnight(new Date(sorted[0].recordedAt));
  const today = utcMidnight(new Date());

  const cutoff = rangeCutoff(range);

  // Walk every calendar day from first log to today, carry value forward
  const result: { date: string; value: number }[] = [];
  let lastVal: number | null = null;
  const cursor = new Date(firstDate);

  while (cursor <= today) {
    const key = cursor.toISOString().split('T')[0];
    if (byDate.has(key)) lastVal = byDate.get(key)!;

    if (lastVal != null && (!cutoff || cursor >= cutoff)) {
      result.push({ date: formatDate(key), value: lastVal });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return result;
}

function CustomTooltip({
  active, payload, label, unit,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-xl px-3 py-2 text-sm shadow-lg">
      <p className="text-secondary text-xs font-medium">{label}</p>
      <p className="font-bold text-primary">
        {payload[0].value % 1 === 0
          ? payload[0].value
          : payload[0].value.toFixed(1)}{' '}
        {unit}
      </p>
    </div>
  );
}

export function ExerciseDetail() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();
  const [metric, setMetric] = useState<Metric>('weight');
  const [range, setRange] = useState<Range>('all');
  const [filterField, setFilterField] = useState<string | null>(null);

  const { data: chartRes, isLoading } = useQuery({
    queryKey: ['progress-chart', exerciseId],
    queryFn: () => progressApi.getChartData(exerciseId!).then((r) => r.data.data),
    enabled: !!exerciseId,
  });

  const { data: historyRes } = useQuery({
    queryKey: ['progress-history', exerciseId],
    queryFn: () => progressApi.getHistory(exerciseId!).then((r) => r.data.data),
    enabled: !!exerciseId,
  });

  const history: ExerciseHistory[] = historyRes?.history ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exerciseInfo = historyRes?.exercise as any;
  const isPaused = exerciseInfo?.isActive === false;

  // Continuous daily series with carry-forward.
  // If all entries land on the same day the series collapses to 1 point —
  // in that case fall back to plotting each raw entry with a time label.
  const chartData = useMemo(() => {
    const continuous = buildContinuousSeries(history, metric, range);
    if (continuous.length >= 2) return continuous;

    // Fallback: individual entries (same-day or only 1 calendar day in range)
    const raw = [...history]
      .filter((e) => metricValue(e, metric) != null)
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

    if (raw.length >= 2) {
      return raw.map((e) => ({
        date: new Date(e.recordedAt).toLocaleTimeString('en-GB', {
          hour: '2-digit', minute: '2-digit',
        }),
        value: metricValue(e, metric)!,
      }));
    }

    return continuous;
  }, [history, metric, range]);

  const filteredHistory = filterField
    ? history.filter((e) => e.changedFields.includes(filterField))
    : history;

  const cfg = METRIC_CONFIG[metric];
  const firstVal = chartData[0]?.value;
  const latestVal = chartData[chartData.length - 1]?.value;
  const delta = firstVal != null && latestVal != null ? latestVal - firstVal : null;

  const bestE1RM = useMemo(() => {
    if (metric !== 'e1rm') return null;
    const vals = history.map((e) => computeE1RM(e.reps, e.weight)).filter((v): v is number => v != null);
    return vals.length ? Math.max(...vals) : null;
  }, [history, metric]);

  // stepAfter for multi-day carry-forward, monotone for same-day time-based fallback
  const isSameDay = chartData[0]?.date.includes(':');
  const lineType = isSameDay ? 'monotone' : 'stepAfter';

  const yDomain = useMemo((): [number, number] | undefined => {
    if (!chartData.length) return undefined;
    const vals = chartData.map((d) => d.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max((max - min) * 0.2, 2);
    return [Math.floor(min - pad), Math.ceil(max + pad)];
  }, [chartData]);

  // Only show every Nth label so X-axis isn't crowded
  const xTickInterval = chartData.length > 60 ? Math.floor(chartData.length / 8)
    : chartData.length > 20 ? Math.floor(chartData.length / 6)
    : 0;

  return (
    <div className="px-5 pt-14 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-accent text-sm font-semibold bg-accent/10 px-3 py-1.5 rounded-lg active:bg-accent/20"
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
          Back
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-primary flex-1 truncate">
          {isLoading ? '…' : chartRes?.exerciseName}
        </h1>
      </div>

      {/* Paused banner */}
      {isPaused && (
        <div className="flex items-center gap-2 bg-gray-100 border border-border-subtle rounded-xl px-4 py-3 mb-5 text-sm text-secondary font-medium">
          <Pause size={14} strokeWidth={2} className="flex-shrink-0" />
          <span>This exercise is paused — history is preserved, no active progress shown.</span>
        </div>
      )}

      {/* Summary cards */}
      {latestVal != null && (
        <div className="flex gap-3 mb-5">
          <div className="flex-1 bg-white rounded-2xl border border-border-subtle shadow-sm px-4 py-3">
            <p className="text-xs font-semibold text-secondary uppercase tracking-wider">
              {metric === 'e1rm' ? 'Est. 1RM' : 'Current'}
            </p>
            <p className="text-xl font-bold text-primary mt-0.5">
              {latestVal % 1 === 0 ? latestVal : latestVal.toFixed(1)}{' '}
              <span className="text-sm font-semibold text-secondary">{cfg.unit}</span>
            </p>
          </div>
          {metric === 'e1rm' && bestE1RM != null ? (
            <div className="flex-1 bg-white rounded-2xl border border-border-subtle shadow-sm px-4 py-3">
              <p className="text-xs font-semibold text-secondary uppercase tracking-wider">Best ever</p>
              <p className="text-xl font-bold text-violet-600 mt-0.5">
                {bestE1RM % 1 === 0 ? bestE1RM : bestE1RM.toFixed(1)}{' '}
                <span className="text-sm font-semibold">{cfg.unit}</span>
              </p>
            </div>
          ) : delta != null ? (
            <div className="flex-1 bg-white rounded-2xl border border-border-subtle shadow-sm px-4 py-3">
              <p className="text-xs font-semibold text-secondary uppercase tracking-wider">Total gain</p>
              <p className={`text-xl font-bold mt-0.5 ${delta >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                {delta >= 0 ? '+' : ''}{delta % 1 === 0 ? delta : delta.toFixed(1)}{' '}
                <span className="text-sm font-semibold">{cfg.unit}</span>
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* Metric toggle */}
      <div className="flex gap-2 mb-3 bg-white rounded-2xl border border-border-subtle p-1.5 shadow-sm">
        {(Object.keys(METRIC_CONFIG) as Metric[]).map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
              metric === m ? 'bg-accent text-white shadow-sm' : 'text-secondary active:bg-gray-100'
            }`}
          >
            {METRIC_CONFIG[m].label}
          </button>
        ))}
      </div>

      {/* Time range toggle */}
      <div className="flex gap-2 mb-4 bg-white rounded-2xl border border-border-subtle p-1.5 shadow-sm">
        {RANGES.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setRange(value)}
            className={`flex-1 py-1.5 rounded-xl text-sm font-semibold transition-all ${
              range === value ? 'bg-gray-800 text-white shadow-sm' : 'text-secondary active:bg-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 1 ? (
        <div className="bg-white rounded-2xl p-5 mb-5 border border-border-subtle shadow-sm">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6E6E73', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={xTickInterval}
              />
              <YAxis
                tick={{ fill: '#6E6E73', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={metric === 'volume' ? 52 : 40}
                domain={yDomain ?? ['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip unit={cfg.unit} />} />
              <Line
                type={lineType}
                dataKey="value"
                stroke={cfg.color}
                strokeWidth={2.5}
                dot={lineType === 'monotone' ? { fill: cfg.color, r: 5, strokeWidth: 0 } : false}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-5 mb-5 border border-border-subtle text-center text-secondary text-sm">
          {(metric === 'volume' || metric === 'e1rm') && history.some((e) => e.weight == null)
            ? 'Set a weight on this exercise to track this metric'
            : chartData.length === 0 && range !== 'all'
            ? 'No changes in this time range — try "All"'
            : 'Chart appears after you change the weight or reps for the first time'}
        </div>
      )}
      {metric === 'e1rm' && chartData.length > 0 && (
        <p className="text-xs text-secondary text-center -mt-3 mb-5">
          Epley formula · weight × (1 + reps/30) · most accurate at 1–10 reps
        </p>
      )}

      {/* History filters */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-secondary uppercase tracking-wider">Change history</p>
        <div className="flex gap-1.5">
          {(['weight', 'reps', 'sets'] as const).map((field) => (
            <button
              key={field}
              onClick={() => setFilterField(filterField === field ? null : field)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
                filterField === field
                  ? 'bg-accent text-white'
                  : 'bg-gray-100 text-secondary border border-border-subtle'
              }`}
            >
              {field}
            </button>
          ))}
        </div>
      </div>

      {/* History list */}
      <div className="flex flex-col gap-2">
        {filteredHistory.length === 0 && (
          <div className="bg-white rounded-xl px-4 py-8 border border-border-subtle text-center text-secondary text-sm">
            {filterField ? `No ${filterField} changes logged yet` : 'No history yet'}
          </div>
        )}
        {filteredHistory.slice().reverse().map((entry) => (
          <div key={entry._id} className="bg-white rounded-xl px-4 py-3.5 border border-border-subtle shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-primary text-sm">
                  {entry.sets} sets × {entry.reps} reps
                </span>
                {entry.weight != null && (
                  <span className="bg-accent/10 text-accent text-xs font-bold px-2 py-0.5 rounded-md">
                    {entry.weight} kg
                  </span>
                )}
                {entry.weight == null && (
                  <span className="bg-gray-100 text-secondary text-xs font-semibold px-2 py-0.5 rounded-md">
                    Bodyweight
                  </span>
                )}
                {entry.weight != null && (
                  <span className="bg-gray-100 text-secondary text-xs font-semibold px-2 py-0.5 rounded-md">
                    {(entry.sets * parseReps(entry.reps) * entry.weight).toFixed(0)} kg vol
                  </span>
                )}
                {entry.weight != null && computeE1RM(entry.reps, entry.weight) != null && (
                  <span className="bg-violet-50 text-violet-600 text-xs font-semibold px-2 py-0.5 rounded-md">
                    ~{computeE1RM(entry.reps, entry.weight)} kg 1RM
                  </span>
                )}
              </div>
              <span className="text-xs font-medium text-secondary ml-2 flex-shrink-0">
                {formatDate(entry.recordedAt)}
              </span>
            </div>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {entry.changedFields.length === 0 ? (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-secondary">
                  Started
                </span>
              ) : (
                entry.changedFields.map((field) => {
                  const colors: Record<string, string> = {
                    weight: 'bg-accent/10 text-accent',
                    reps:   'bg-accent-green/10 text-accent-green',
                    sets:   'bg-accent-orange/10 text-accent-orange',
                  };
                  return (
                    <span
                      key={field}
                      className={`text-xs font-semibold px-2 py-0.5 rounded-md ${colors[field] ?? 'bg-gray-100 text-secondary'}`}
                    >
                      {field} ↑
                    </span>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
