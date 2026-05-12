import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bodyWeightApi } from '@/api/bodyWeight.api';
import { getErrorMessage } from '@/utils/errors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Sheet } from '@/components/ui/Sheet';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function BodyWeight() {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [weight, setWeight] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data: entries, isLoading } = useQuery({
    queryKey: ['body-weight'],
    queryFn: () => bodyWeightApi.getAll().then((r) => r.data.data),
  });

  const logMutation = useMutation({
    mutationFn: (w: number) => bodyWeightApi.log(w),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['body-weight'] });
      setSheetOpen(false);
      setWeight('');
      setFormError(null);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bodyWeightApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['body-weight'] }),
  });

  const chartData = useMemo(() => {
    if (!entries?.length) return [];
    const sorted = [...entries].reverse(); // oldest first
    const result = sorted.map((e) => ({ date: formatDate(e.recordedAt), weight: e.weight }));
    // Extend flat line to today if the latest entry isn't today
    const todayKey = new Date().toISOString().split('T')[0];
    const lastKey = new Date(entries[0].recordedAt).toISOString().split('T')[0];
    if (lastKey < todayKey) {
      result.push({ date: formatDate(new Date().toISOString()), weight: entries[0].weight });
    }
    return result;
  }, [entries]);

  const yDomain = useMemo((): [number, number] | undefined => {
    if (!chartData.length) return undefined;
    const vals = chartData.map((d) => d.weight);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max((max - min) * 0.2, 2);
    return [Math.floor(min - pad), Math.ceil(max + pad)];
  }, [chartData]);

  const latest = entries?.[0];

  return (
    <div className="px-5 pt-14 pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Body Weight</h1>
        {latest && (
          <div className="text-right bg-white border border-border-subtle rounded-2xl px-4 py-2 shadow-sm">
            <p className="text-2xl font-bold text-primary">{latest.weight} kg</p>
            <p className="text-xs font-medium text-secondary">{formatDate(latest.recordedAt)}</p>
          </div>
        )}
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="bg-white rounded-2xl p-5 mb-5 border border-border-subtle shadow-sm">
          <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-4">Weight over time</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
              <XAxis dataKey="date" tick={{ fill: '#6E6E73', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6E6E73', fontSize: 11 }} axisLine={false} tickLine={false} width={35} domain={yDomain ?? ['auto', 'auto']} />
              <Tooltip
                contentStyle={{
                  background: '#fff',
                  border: '1px solid #C7C7CC',
                  borderRadius: '12px',
                  fontSize: '13px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
                labelStyle={{ color: '#6E6E73', fontWeight: '600' }}
                itemStyle={{ color: '#34C759', fontWeight: '700' }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#34C759"
                strokeWidth={2.5}
                dot={{ fill: '#34C759', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <Button onClick={() => { setSheetOpen(true); setWeight(''); setFormError(null); }} className="w-full mb-5">
        + Log weight
      </Button>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-accent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries?.map((entry) => (
            <div key={entry._id} className="bg-white rounded-xl px-4 py-3.5 border border-border-subtle shadow-sm flex items-center justify-between">
              <div>
                <span className="font-bold text-primary">{entry.weight} kg</span>
                <span className="text-secondary text-sm font-medium ml-3">{formatDate(entry.recordedAt)}</span>
              </div>
              <button
                onClick={() => deleteMutation.mutate(entry._id)}
                className="text-accent-red text-sm font-semibold px-3 py-1 bg-accent-red/10 rounded-lg active:bg-accent-red/20"
              >
                Delete
              </button>
            </div>
          ))}
          {entries?.length === 0 && (
            <div className="bg-white rounded-2xl border border-border-subtle px-4 py-10 text-center">
              <p className="font-semibold text-primary">No entries yet</p>
              <p className="text-secondary text-sm mt-1">Log your first weight above</p>
            </div>
          )}
        </div>
      )}

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Log body weight">
        <div className="flex flex-col gap-4">
          <Input
            label="Weight (kg)"
            type="number"
            inputMode="decimal"
            placeholder="e.g. 82.5"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            step="0.1"
            min="1"
            autoFocus
          />
          <ErrorMessage message={formError} />
          <Button
            onClick={() => logMutation.mutate(parseFloat(weight))}
            loading={logMutation.isPending}
            disabled={!weight || parseFloat(weight) <= 0}
            className="w-full"
          >
            Save
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
