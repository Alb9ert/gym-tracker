import { forwardRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { exercisesApi } from '@/api/exercises.api';
import type { Exercise } from '@/types';

interface Props {
  exercise: Exercise;
  dayId: string;
  onEdit: () => void;
  onDelete: () => void;
  onViewProgress: () => void;
}

const DragHandle = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => (
    <div
      ref={ref}
      {...props}
      className="flex flex-col gap-[3px] px-2 py-2 cursor-grab active:cursor-grabbing touch-none select-none self-center"
      aria-label="Drag to reorder"
    >
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex gap-[3px]">
          <div className="w-[3px] h-[3px] rounded-full bg-gray-300" />
          <div className="w-[3px] h-[3px] rounded-full bg-gray-300" />
        </div>
      ))}
    </div>
  )
);
DragHandle.displayName = 'DragHandle';

export function ExerciseRow({ exercise, dayId, onEdit, onDelete, onViewProgress }: Props) {
  const queryClient = useQueryClient();
  const weightLabel = exercise.weight != null ? `${exercise.weight} kg` : 'Bodyweight';

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise._id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  const toggleMutation = useMutation({
    mutationFn: (patch: Partial<Pick<Exercise, 'isActive' | 'goalWeight' | 'goalReps'>>) =>
      exercisesApi.update(exercise._id, patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ['exercises', dayId] });
      const previous = queryClient.getQueryData<Exercise[]>(['exercises', dayId]);
      queryClient.setQueryData<Exercise[]>(['exercises', dayId], (old) =>
        old?.map((e) => e._id === exercise._id ? { ...e, ...patch } : e) ?? []
      );
      return { previous };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['exercises', dayId], ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['exercises', dayId] }),
  });

  const inactive = !exercise.isActive;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`rounded-2xl border shadow-sm transition-opacity ${
        isDragging ? 'opacity-50 shadow-lg' : 'opacity-100'
      } ${inactive ? 'bg-gray-50 border-border-subtle opacity-60' : 'bg-white border-border-subtle'}`}
    >
      {/* Main content row */}
      <div className="flex items-start gap-2 px-3 pt-4 pb-2">
        {/* Drag handle — only this element is the drag activator */}
        <DragHandle ref={setActivatorNodeRef} {...listeners} />

        <button className="flex-1 text-left min-w-0" onClick={inactive ? undefined : onViewProgress}>
          <p className={`font-semibold text-base leading-tight ${inactive ? 'text-secondary' : 'text-primary'}`}>
            {exercise.name}
          </p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className="bg-gray-100 text-secondary text-xs font-semibold px-2.5 py-1 rounded-lg">
              {exercise.sets} sets
            </span>
            <span className="bg-gray-100 text-secondary text-xs font-semibold px-2.5 py-1 rounded-lg">
              {exercise.reps} reps
            </span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
              inactive ? 'bg-gray-100 text-secondary' : 'bg-accent/10 text-accent'
            }`}>
              {weightLabel}
            </span>
          </div>
          {exercise.note && (
            <p className="mt-2 text-sm text-secondary leading-snug">{exercise.note}</p>
          )}
        </button>

        <div className="flex gap-2 flex-shrink-0">
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
            Del
          </button>
        </div>
      </div>

      {/* Footer: goal toggles + active toggle */}
      <div className="px-4 pb-3 flex items-center gap-2">
        <button
          onClick={() => toggleMutation.mutate({ goalWeight: !exercise.goalWeight })}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
            exercise.goalWeight
              ? 'bg-accent-orange/15 text-accent-orange border-accent-orange/30'
              : 'bg-gray-100 text-gray-400 border-transparent'
          }`}
        >
          <span className="text-sm">↑</span> kg
        </button>

        <button
          onClick={() => toggleMutation.mutate({ goalReps: !exercise.goalReps })}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
            exercise.goalReps
              ? 'bg-accent-green/15 text-accent-green border-accent-green/30'
              : 'bg-gray-100 text-gray-400 border-transparent'
          }`}
        >
          <span className="text-sm">↑</span> reps
        </button>

        <div className="flex-1" />

        <button
          onClick={() => toggleMutation.mutate({ isActive: !exercise.isActive })}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border bg-gray-100 text-secondary border-transparent"
        >
          {inactive ? <><span>▷</span> Paused</> : <><span>⏸</span> Active</>}
        </button>
      </div>
    </div>
  );
}
