import { useState } from 'react';
import { Check } from 'lucide-react';
import type { Exercise } from '@/types';
import { MUSCLE_GROUPS } from '@/constants/muscles';

interface Props {
  exercises: Exercise[];
  alreadyLinkedIds: Set<string>;
  onPick: (exercise: Exercise) => void;
  loading?: boolean;
}

export function ExercisePicker({ exercises, alreadyLinkedIds, onPick, loading }: Props) {
  const [search, setSearch] = useState('');

  const muscleLabel = (id: string) =>
    MUSCLE_GROUPS.find((m) => m.id === id)?.label ?? id;

  const filtered = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(search.toLowerCase())
  );

  if (exercises.length === 0) {
    return (
      <div className="text-center py-10 text-secondary text-sm">
        No exercises yet — create one first.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        placeholder="Search exercises…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="bg-white text-primary placeholder-gray-400 rounded-xl px-4 py-3.5 text-base outline-none border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 transition"
        autoFocus
      />

      {filtered.length === 0 ? (
        <p className="text-center py-6 text-secondary text-sm">No matches</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto -mx-1 px-1">
          {filtered.map((ex) => {
            const linked = alreadyLinkedIds.has(ex._id);
            return (
              <button
                key={ex._id}
                type="button"
                disabled={linked || loading}
                onClick={() => !linked && onPick(ex)}
                className={`w-full text-left rounded-2xl border px-4 py-3 transition-all ${
                  linked
                    ? 'bg-gray-50 border-border-subtle opacity-60 cursor-default'
                    : 'bg-white border-border active:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-primary text-sm leading-tight">{ex.name}</span>
                  {linked && <Check size={15} className="text-accent shrink-0" />}
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className="text-xs text-secondary">
                    {ex.sets}×{ex.reps}{ex.weight ? ` · ${ex.weight}kg` : ''}
                  </span>
                  {(ex.muscleGroups ?? []).slice(0, 3).map((mg) => (
                    <span
                      key={mg}
                      className="text-xs bg-accent/10 text-accent font-medium px-1.5 py-0.5 rounded-md"
                    >
                      {muscleLabel(mg)}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
