import type { Exercise } from '@/types';

interface Props {
  exercise: Exercise;
  onEdit: () => void;
  onDelete: () => void;
  onViewProgress: () => void;
}

export function ExerciseRow({ exercise, onEdit, onDelete, onViewProgress }: Props) {
  const weightLabel = exercise.weight != null ? `${exercise.weight} kg` : 'Bodyweight';

  return (
    <div className="bg-white rounded-2xl px-5 py-4 border border-border-subtle shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <button className="flex-1 text-left" onClick={onViewProgress}>
          <p className="font-semibold text-base text-primary leading-tight">{exercise.name}</p>
          <div className="flex gap-2 mt-2">
            <span className="bg-gray-100 text-secondary text-xs font-semibold px-2.5 py-1 rounded-lg">{exercise.sets} sets</span>
            <span className="bg-gray-100 text-secondary text-xs font-semibold px-2.5 py-1 rounded-lg">{exercise.reps} reps</span>
            <span className="bg-accent/10 text-accent text-xs font-semibold px-2.5 py-1 rounded-lg">{weightLabel}</span>
          </div>
        </button>
        <div className="flex gap-2 pt-0.5">
          <button
            onClick={onEdit}
            className="text-accent text-sm font-semibold px-3 py-1.5 bg-accent/10 rounded-lg active:bg-accent/20"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-accent-red text-sm font-semibold px-3 py-1.5 bg-accent-red/10 rounded-lg active:bg-accent-red/20"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
