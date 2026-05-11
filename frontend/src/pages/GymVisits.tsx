import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gymVisitApi, type GymVisit } from '@/api/gymVisit.api';
import { workoutDaysApi } from '@/api/workoutDays.api';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import type { WorkoutDay } from '@/types';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-2xl border border-border-subtle shadow-sm px-3 py-3 text-center">
      <p className="text-xl font-bold text-primary">{value}</p>
      <p className="text-xs font-semibold text-secondary mt-0.5">{label}</p>
    </div>
  );
}

export function GymVisits() {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['gym-visits'],
    queryFn: () => gymVisitApi.getAll().then((r) => r.data.data),
  });

  const { data: days } = useQuery({
    queryKey: ['workout-days'],
    queryFn: () => workoutDaysApi.getAll().then((r) => r.data.data),
  });

  const logMutation = useMutation({
    mutationFn: (dayId: string | null) => {
      const day = days?.find((d) => d._id === dayId);
      return gymVisitApi.log({
        workoutDayId: dayId,
        workoutDayName: day?.name ?? null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gym-visits'] });
      setSheetOpen(false);
      setSelectedDayId(null);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (visitId: string) => gymVisitApi.remove(visitId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gym-visits'] }),
  });

  const stats = data?.stats;
  const visits = data?.visits ?? [];

  return (
    <div className="px-5 pt-14 pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Gym visits</h1>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 mb-5">
          <StatCard label="Streak" value={stats.streak === 0 ? '—' : `${stats.streak}d`} />
          <StatCard label="This week" value={stats.thisWeek} />
          <StatCard label="This month" value={stats.thisMonth} />
          <StatCard label="Total" value={stats.total} />
        </div>
      )}

      {/* Log button */}
      <Button onClick={() => setSheetOpen(true)} className="w-full mb-6">
        + Went to the gym
      </Button>

      {/* Visit list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-accent rounded-full animate-spin" />
        </div>
      ) : visits.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border-subtle px-5 py-10 text-center">
          <p className="font-semibold text-primary">No visits logged yet</p>
          <p className="text-sm text-secondary mt-1">Tap the button above after each gym session</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visits.map((v: GymVisit) => (
            <div
              key={v._id}
              className="bg-white rounded-xl border border-border-subtle shadow-sm px-4 py-3 flex items-center justify-between gap-3"
            >
              <div>
                <p className="font-semibold text-primary text-sm">{formatDate(v.visitedAt)}</p>
                {v.workoutDayName && (
                  <span className="text-xs bg-accent/10 text-accent font-bold px-2 py-0.5 rounded-md mt-1 inline-block">
                    {v.workoutDayName}
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  if (confirm('Remove this visit?')) removeMutation.mutate(v._id);
                }}
                className="text-accent-red text-xs font-semibold px-2.5 py-1 bg-accent-red/10 rounded-lg active:bg-accent-red/20 flex-shrink-0"
              >
                Del
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Day picker sheet */}
      <Sheet open={sheetOpen} onClose={() => { setSheetOpen(false); setSelectedDayId(null); }} title="Which day did you do?">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-secondary -mt-2 mb-1">Pick a workout day or skip to log a general visit.</p>

          {days?.map((day: WorkoutDay) => (
            <button
              key={day._id}
              onClick={() => setSelectedDayId(day._id === selectedDayId ? null : day._id)}
              className={`w-full text-left px-4 py-3.5 rounded-xl border font-semibold text-sm transition-all ${
                selectedDayId === day._id
                  ? 'bg-accent text-white border-accent shadow-sm'
                  : 'bg-white text-primary border-border-subtle'
              }`}
            >
              {day.name}
            </button>
          ))}

          <div className="flex gap-3 mt-2">
            <Button
              onClick={() => logMutation.mutate(null)}
              loading={logMutation.isPending && selectedDayId === null}
              className="flex-1 bg-gray-100 !text-secondary border border-border-subtle shadow-none"
            >
              Skip
            </Button>
            <Button
              onClick={() => logMutation.mutate(selectedDayId)}
              loading={logMutation.isPending && selectedDayId !== null}
              disabled={!selectedDayId}
              className="flex-1"
            >
              Log visit
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
