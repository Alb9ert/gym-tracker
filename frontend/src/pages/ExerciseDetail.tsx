import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { progressApi } from '@/api/progress.api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { ChartDataPoint } from '@/types';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: {value: number}[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-800 rounded-xl px-3 py-2 text-sm">
      <p className="text-white/50 text-xs">{label}</p>
      <p className="font-semibold">{payload[0].value} kg</p>
    </div>
  );
}

export function ExerciseDetail() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();

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

  const chartData = chartRes?.dataPoints
    .filter((p: ChartDataPoint) => p.weight != null)
    .map((p: ChartDataPoint) => ({ date: formatDate(p.date), weight: p.weight, reps: p.reps, sets: p.sets }));

  return (
    <div className="px-5 pt-14 pb-6">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="text-accent text-sm font-medium">
          ← Back
        </button>
        <h1 className="text-2xl font-bold tracking-tight flex-1">
          {isLoading ? '...' : chartRes?.exerciseName}
        </h1>
      </div>

      {/* Weight progress chart */}
      {chartData && chartData.length > 1 ? (
        <div className="bg-zinc-900 rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-medium text-white/50 mb-4 uppercase tracking-wider">Weight progress</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="date" tick={{ fill: '#ffffff50', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#ffffff50', fontSize: 11 }} axisLine={false} tickLine={false} width={35} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#0A84FF"
                strokeWidth={2}
                dot={{ fill: '#0A84FF', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : chartData?.length === 1 ? (
        <div className="bg-zinc-900 rounded-2xl p-5 mb-6 text-center text-white/30 text-sm">
          Update this exercise at least twice to see progress
        </div>
      ) : null}

      {/* History list */}
      <h2 className="text-sm font-medium text-white/50 mb-3 uppercase tracking-wider">Change history</h2>
      <div className="flex flex-col gap-2">
        {historyRes?.history.slice().reverse().map((entry) => (
          <div key={entry._id} className="bg-zinc-900 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-3 text-sm">
                <span className="text-white/60">{entry.sets}×{entry.reps}</span>
                {entry.weight != null && (
                  <span className="font-medium">{entry.weight} kg</span>
                )}
              </div>
              <span className="text-xs text-white/30">{formatDate(entry.recordedAt)}</span>
            </div>
            {entry.changedFields.length > 0 && (
              <div className="flex gap-1.5 mt-1.5">
                {entry.changedFields.map((field) => (
                  <span key={field} className="text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded-md">
                    {field}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {historyRes?.history.length === 0 && (
          <p className="text-white/30 text-sm text-center py-6">No history yet</p>
        )}
      </div>
    </div>
  );
}
