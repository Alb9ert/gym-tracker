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
      <h1 className="text-2xl font-bold tracking-tight text-primary mb-1">Progress</h1>
      <p className="text-secondary text-sm mb-8">Exercises with no change in the last 14 days</p>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-accent rounded-full animate-spin" />
        </div>
      ) : stagnant && stagnant.length > 0 ? (
        <div className="flex flex-col gap-3">
          {stagnant.map(({ exercise, daysSinceChange }) => (
            <button
              key={exercise._id}
              onClick={() => navigate(`/exercise/${exercise._id}`)}
              className="bg-white rounded-2xl px-5 py-4 border border-border-subtle shadow-sm text-left w-full active:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-primary truncate">{exercise.name}</p>
                  <div className="flex gap-2 mt-1.5">
                    <span className="bg-gray-100 text-secondary text-xs font-semibold px-2 py-0.5 rounded-md">
                      {exercise.sets} sets · {exercise.reps} reps
                    </span>
                    {exercise.weight != null && (
                      <span className="bg-gray-100 text-secondary text-xs font-semibold px-2 py-0.5 rounded-md">
                        {exercise.weight} kg
                      </span>
                    )}
                  </div>
                </div>
                <div className="ml-3 text-right flex-shrink-0">
                  <span className="text-accent-orange font-bold text-base">
                    {daysSinceChange != null ? `${daysSinceChange}d` : '—'}
                  </span>
                  <p className="text-secondary text-xs font-medium">no change</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border-subtle px-5 py-14 text-center shadow-sm">
          <p className="text-3xl mb-3">💪</p>
          <p className="font-bold text-primary">All exercises progressing!</p>
          <p className="text-secondary text-sm mt-1">No stagnant exercises in the last 14 days</p>
        </div>
      )}
    </div>
  );
}
