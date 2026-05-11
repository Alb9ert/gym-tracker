import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { progressApi } from '@/api/progress.api';

export function Analytics() {
  const navigate = useNavigate();

  const { data: stagnant, isLoading } = useQuery({
    queryKey: ['stagnant'],
    queryFn: () => progressApi.getStagnant(14).then((r) => r.data.data),
  });

  return (
    <div className="px-5 pt-14 pb-6">
      <h1 className="text-2xl font-bold tracking-tight mb-2">Progress</h1>
      <p className="text-white/40 text-sm mb-8">Exercises with no change in the last 14 days</p>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      ) : stagnant && stagnant.length > 0 ? (
        <div className="flex flex-col gap-3">
          {stagnant.map(({ exercise, daysSinceChange }) => (
            <button
              key={exercise._id}
              onClick={() => navigate(`/exercise/${exercise._id}`)}
              className="bg-zinc-900 rounded-2xl px-5 py-4 text-left w-full"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{exercise.name}</p>
                  <div className="flex gap-2 mt-1 text-sm text-white/40">
                    <span>{exercise.sets} sets · {exercise.reps} reps</span>
                    {exercise.weight != null && <span>· {exercise.weight} kg</span>}
                  </div>
                </div>
                <div className="text-right ml-3">
                  <span className="text-accent-orange text-sm font-medium">
                    {daysSinceChange != null ? `${daysSinceChange}d` : 'No data'}
                  </span>
                  <p className="text-white/30 text-xs">stagnant</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">💪</p>
          <p className="text-white/60 font-medium">All exercises progressing!</p>
          <p className="text-white/30 text-sm mt-1">No stagnant exercises in the last 14 days</p>
        </div>
      )}
    </div>
  );
}
