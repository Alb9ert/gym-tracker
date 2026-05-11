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

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-xl px-3 py-2 text-sm shadow-lg">
      <p className="text-secondary text-xs">{label}</p>
      <p className="font-bold text-primary">{payload[0].value} kg</p>
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
        <button
          onClick={() => navigate(-1)}
          className="text-accent text-sm font-semibold bg-accent/10 px-3 py-1.5 rounded-lg active:bg-accent/20"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-primary flex-1 truncate">
          {isLoading ? '…' : chartRes?.exerciseName}
        </h1>
      </div>

      {/* Weight progress chart */}
      {chartData && chartData.length > 1 ? (
        <div className="bg-white rounded-2xl p-5 mb-5 border border-border-subtle shadow-sm">
          <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-4">Weight progress</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
              <XAxis dataKey="date" tick={{ fill: '#6E6E73', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6E6E73', fontSize: 11 }} axisLine={false} tickLine={false} width={35} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#007AFF"
                strokeWidth={2.5}
                dot={{ fill: '#007AFF', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : chartData?.length === 1 ? (
        <div className="bg-white rounded-2xl p-5 mb-5 border border-border-subtle text-center text-secondary text-sm">
          Update this exercise at least twice to see a progress chart
        </div>
      ) : null}

      {/* History list */}
      <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Change history</p>
      <div className="flex flex-col gap-2">
        {historyRes?.history.slice().reverse().map((entry) => (
          <div key={entry._id} className="bg-white rounded-xl px-4 py-3.5 border border-border-subtle shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-primary">{entry.sets}×{entry.reps}</span>
                {entry.weight != null && (
                  <span className="text-accent font-bold">{entry.weight} kg</span>
                )}
              </div>
              <span className="text-xs font-medium text-secondary">{formatDate(entry.recordedAt)}</span>
            </div>
            {entry.changedFields.length > 0 && (
              <div className="flex gap-1.5 mt-2">
                {entry.changedFields.map((field) => (
                  <span key={field} className="text-xs bg-accent/10 text-accent font-semibold px-2 py-0.5 rounded-md">
                    {field} changed
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {historyRes?.history.length === 0 && (
          <div className="bg-white rounded-xl px-4 py-8 border border-border-subtle text-center text-secondary text-sm">
            No history yet
          </div>
        )}
      </div>
    </div>
  );
}
