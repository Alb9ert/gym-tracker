import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import { workoutDaysApi } from '@/api/workoutDays.api';
import { exercisesApi } from '@/api/exercises.api';
import { getErrorMessage } from '@/utils/errors';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { ExerciseRow } from '@/components/exercise/ExerciseRow';
import { ExerciseForm } from '@/components/exercise/ExerciseForm';
import { ExercisePicker } from '@/components/exercise/ExercisePicker';
import type { Exercise } from '@/types';

type AddTab = 'new' | 'existing';

export function WorkoutDay() {
  const { dayId } = useParams<{ dayId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState<AddTab>('new');
  const [editExercise, setEditExercise] = useState<Exercise | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [ordered, setOrdered] = useState<Exercise[]>([]);

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

  const { data: allExercises } = useQuery({
    queryKey: ['exercises-all'],
    queryFn: () => exercisesApi.getAll().then((r) => r.data.data),
    enabled: addOpen && addTab === 'existing',
  });

  useEffect(() => {
    if (exercises) setOrdered(exercises);
  }, [exercises]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOrdered((items) => {
      const oldIndex = items.findIndex((e) => e._id === active.id);
      const newIndex = items.findIndex((e) => e._id === over.id);
      const reordered = arrayMove(items, oldIndex, newIndex);

      exercisesApi
        .reorder(dayId!, reordered.map((e) => e._id))
        .catch(() => queryClient.invalidateQueries({ queryKey: ['exercises', dayId] }));

      return reordered;
    });
  }

  const createMutation = useMutation({
    mutationFn: (data: { name: string; sets: number; reps: string; weight: number | null; note: string | null; muscleGroups: string[] }) =>
      exercisesApi.create(dayId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises', dayId] });
      queryClient.invalidateQueries({ queryKey: ['exercises-all'] });
      setAddOpen(false);
      setFormError(null);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const linkMutation = useMutation({
    mutationFn: (exerciseId: string) => exercisesApi.linkToDay(dayId!, exerciseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises', dayId] });
      setAddOpen(false);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Exercise> }) =>
      exercisesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises', dayId] });
      queryClient.invalidateQueries({ queryKey: ['exercises-all'] });
      setEditExercise(null);
      setFormError(null);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => exercisesApi.removeFromDay(dayId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises', dayId] });
      queryClient.invalidateQueries({ queryKey: ['exercises-all'] });
    },
  });

  const linkedIds = new Set((ordered ?? []).map((e) => e._id));

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
      ) : ordered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-border-subtle">
          <p className="text-base font-semibold text-primary">No exercises yet</p>
          <p className="text-sm text-secondary mt-1">Add your first exercise below</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={ordered.map((e) => e._id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {ordered.map((exercise) => (
                <ExerciseRow
                  key={exercise._id}
                  exercise={exercise}
                  dayId={dayId!}
                  onEdit={() => { setEditExercise(exercise); setFormError(null); }}
                  onDelete={() => {
                    if (confirm(`Remove "${exercise.name}" from this day?`)) {
                      deleteMutation.mutate(exercise._id);
                    }
                  }}
                  onViewProgress={() => navigate(`/exercise/${exercise._id}`)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Button onClick={() => { setAddOpen(true); setAddTab('new'); setFormError(null); }} className="w-full mt-5 gap-2">
        <Plus size={16} strokeWidth={2.5} />
        Add exercise
      </Button>

      {/* Add exercise sheet */}
      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Add exercise">
        {/* Tab switcher */}
        <div className="flex rounded-xl bg-gray-100 p-1 mb-5">
          {(['new', 'existing'] as AddTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => { setAddTab(tab); setFormError(null); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                addTab === tab
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-secondary'
              }`}
            >
              {tab === 'new' ? 'Create new' : 'Pick existing'}
            </button>
          ))}
        </div>

        {addTab === 'new' ? (
          <ExerciseForm
            error={formError}
            loading={createMutation.isPending}
            onSubmit={(data) => createMutation.mutate(data)}
            submitLabel="Add exercise"
          />
        ) : (
          <ExercisePicker
            exercises={allExercises ?? []}
            alreadyLinkedIds={linkedIds}
            onPick={(ex) => linkMutation.mutate(ex._id)}
            loading={linkMutation.isPending}
          />
        )}
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
