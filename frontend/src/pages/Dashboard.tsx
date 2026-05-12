import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workoutDaysApi } from '@/api/workoutDays.api';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage } from '@/utils/errors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import type { WorkoutDay } from '@/types';

export function Dashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();

  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [editDay, setEditDay] = useState<WorkoutDay | null>(null);
  const [newName, setNewName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['workout-days'],
    queryFn: () => workoutDaysApi.getAll().then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => workoutDaysApi.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-days'] });
      setAddSheetOpen(false);
      setNewName('');
      setFormError(null);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => workoutDaysApi.update(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-days'] });
      setEditDay(null);
      setNewName('');
      setFormError(null);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workoutDaysApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workout-days'] }),
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      clearAuth();
      navigate('/login', { replace: true });
    },
  });

  function openEdit(day: WorkoutDay) {
    setEditDay(day);
    setNewName(day.name);
    setFormError(null);
  }

  function openAdd() {
    setNewName('');
    setFormError(null);
    setAddSheetOpen(true);
  }

  return (
    <div className="px-5 pt-14 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">My Workouts</h1>
          <p className="text-secondary text-sm mt-0.5">{user?.name}</p>
        </div>
        <button
          onClick={() => logoutMutation.mutate()}
          className="text-sm font-semibold text-secondary bg-gray-100 border border-border-subtle px-3 py-1.5 rounded-lg active:bg-gray-200"
        >
          Sign out
        </button>
      </div>

      {/* Workout day list */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-accent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data?.map((day) => (
            <div
              key={day._id}
              className="bg-white rounded-2xl border border-border-subtle shadow-sm overflow-hidden"
            >
              <button
                className="w-full text-left px-5 py-4 active:bg-gray-50 transition-colors"
                onClick={() => navigate(`/workout/${day._id}`)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-primary">{day.name}</span>
                  <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
                </div>
              </button>
              <div className="flex gap-2 px-5 pb-3 border-t border-border-subtle pt-2.5 bg-gray-50">
                <button
                  onClick={() => openEdit(day)}
                  className="text-accent text-sm font-semibold px-3 py-1 bg-accent/10 rounded-lg active:bg-accent/20"
                >
                  Rename
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${day.name}"? This removes all exercises and history.`)) {
                      deleteMutation.mutate(day._id);
                    }
                  }}
                  className="text-accent-red text-sm font-semibold px-3 py-1 bg-accent-red/10 rounded-lg active:bg-accent-red/20"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {data?.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-border-subtle">
              <p className="text-lg font-semibold text-primary">No workout days yet</p>
              <p className="text-sm text-secondary mt-1">Add your first day below</p>
            </div>
          )}
        </div>
      )}

      <Button onClick={openAdd} className="w-full mt-5 gap-2">
        <Plus size={16} strokeWidth={2.5} />
        Add workout day
      </Button>

      {/* Add sheet */}
      <Sheet open={addSheetOpen} onClose={() => setAddSheetOpen(false)} title="New workout day">
        <div className="flex flex-col gap-4">
          <Input
            label="Day name"
            placeholder="e.g. Push, Pull, Legs, Abs"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <ErrorMessage message={formError} />
          <Button
            onClick={() => createMutation.mutate(newName.trim())}
            loading={createMutation.isPending}
            disabled={!newName.trim()}
            className="w-full"
          >
            Create
          </Button>
        </div>
      </Sheet>

      {/* Edit sheet */}
      <Sheet open={!!editDay} onClose={() => setEditDay(null)} title="Rename day">
        <div className="flex flex-col gap-4">
          <Input
            label="Day name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <ErrorMessage message={formError} />
          <Button
            onClick={() => editDay && updateMutation.mutate({ id: editDay._id, name: newName.trim() })}
            loading={updateMutation.isPending}
            disabled={!newName.trim()}
            className="w-full"
          >
            Save
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
