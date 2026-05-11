import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workoutDaysApi } from '@/api/workoutDays.api';
import { exercisesApi } from '@/api/exercises.api';
import { getErrorMessage } from '@/utils/errors';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { ExerciseRow } from '@/components/exercise/ExerciseRow';
import { ExerciseForm } from '@/components/exercise/ExerciseForm';
import type { Exercise } from '@/types';

export function WorkoutDay() {
  const { dayId } = useParams<{ dayId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [editExercise, setEditExercise] = useState<Exercise | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: days } = useQuery({
    queryKey: ['workout-days'],
    queryFn: () => workoutDaysApi.getAll().then((r) => r.data.data),
  });
  const day = days?.find((d) => d._id === dayId);

  const { data: exercises, isLoading } = useQuery({
    queryKey: ['exercises', dayId],
    queryFn: () => exercisesApi.getByDay(dayId!).then((r) => r.data.data),
    enabled: !!dayId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; sets: number; reps: string; weight: number | null }) =>
      exercisesApi.create(dayId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises', dayId] });
      setAddOpen(false);
      setFormError(null);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Exercise> }) =>
      exercisesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises', dayId] });
      setEditExercise(null);
      setFormError(null);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => exercisesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exercises', dayId] }),
  });

  return (
    <div className="px-5 pt-14 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate('/')}
          className="text-accent text-sm font-semibold bg-accent/10 px-3 py-1.5 rounded-lg active:bg-accent/20"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-primary flex-1 truncate">
          {day?.name ?? '…'}
        </h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-accent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {exercises?.map((exercise) => (
            <ExerciseRow
              key={exercise._id}
              exercise={exercise}
              onEdit={() => { setEditExercise(exercise); setFormError(null); }}
              onDelete={() => {
                if (confirm(`Delete "${exercise.name}"? History will also be removed.`)) {
                  deleteMutation.mutate(exercise._id);
                }
              }}
              onViewProgress={() => navigate(`/exercise/${exercise._id}`)}
            />
          ))}
          {exercises?.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-border-subtle">
              <p className="text-base font-semibold text-primary">No exercises yet</p>
              <p className="text-sm text-secondary mt-1">Add your first exercise below</p>
            </div>
          )}
        </div>
      )}

      <Button onClick={() => { setAddOpen(true); setFormError(null); }} className="w-full mt-5">
        + Add exercise
      </Button>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="New exercise">
        <ExerciseForm
          error={formError}
          loading={createMutation.isPending}
          onSubmit={(data) => createMutation.mutate(data)}
          submitLabel="Add exercise"
        />
      </Sheet>

      <Sheet open={!!editExercise} onClose={() => setEditExercise(null)} title="Edit exercise">
        {editExercise && (
          <ExerciseForm
            initial={editExercise}
            error={formError}
            loading={updateMutation.isPending}
            onSubmit={(data) => updateMutation.mutate({ id: editExercise._id, data })}
            submitLabel="Save changes"
          />
        )}
      </Sheet>
    </div>
  );
}
