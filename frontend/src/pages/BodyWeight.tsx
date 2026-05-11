import { useState } from 'react';
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

  const chartData = entries
    ?.slice()
    .reverse()
    .map((e) => ({ date: formatDate(e.recordedAt), weight: e.weight }));

  const latest = entries?.[0];

  return (
    <div className="px-5 pt-14 pb-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Body Weight</h1>
        {latest && (
          <div className="text-right">
            <p className="text-2xl font-bold">{latest.weight} kg</p>
            <p className="text-xs text-white/40">{formatDate(latest.recordedAt)}</p>
          </div>
        )}
      </div>

      {/* Chart */}
      {chartData && chartData.length > 1 && (
        <div className="bg-zinc-900 rounded-2xl p-5 mb-6">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="date" tick={{ fill: '#ffffff50', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#ffffff50', fontSize: 11 }} axisLine={false} tickLine={false} width={35} />
              <Tooltip
                contentStyle={{ background: '#27272a', border: 'none', borderRadius: '12px', fontSize: '13px' }}
                labelStyle={{ color: '#ffffff60' }}
              />
              <Line type="monotone" dataKey="weight" stroke="#30D158" strokeWidth={2} dot={{ fill: '#30D158', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <Button onClick={() => { setSheetOpen(true); setWeight(''); setFormError(null); }} className="w-full mb-6">
        + Log weight
      </Button>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries?.map((entry) => (
            <div key={entry._id} className="bg-zinc-900 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <span className="font-semibold">{entry.weight} kg</span>
                <span className="text-white/40 text-sm ml-3">{formatDate(entry.recordedAt)}</span>
              </div>
              <button
                onClick={() => deleteMutation.mutate(entry._id)}
                className="text-accent-red/50 text-sm active:text-accent-red"
              >
                Delete
              </button>
            </div>
          ))}
          {entries?.length === 0 && (
            <p className="text-white/30 text-sm text-center py-8">No entries yet. Log your first weight above.</p>
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
