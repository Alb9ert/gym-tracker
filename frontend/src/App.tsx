import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/authStore';
import { AppShell } from '@/components/layout/AppShell';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Dashboard } from '@/pages/Dashboard';
import { WorkoutDay } from '@/pages/WorkoutDay';
import { ExerciseDetail } from '@/pages/ExerciseDetail';
import { BodyWeight } from '@/pages/BodyWeight';
import { Analytics } from '@/pages/Analytics';
import { GymVisits } from '@/pages/GymVisits';
import { Strength } from '@/pages/Strength';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function AuthGuard() {
  const { accessToken, isInitialized } = useAuthStore();
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }
  return accessToken ? <Outlet /> : <Navigate to="/login" replace />;
}

function GuestGuard() {
  const { accessToken, isInitialized } = useAuthStore();
  if (!isInitialized) return null;
  return !accessToken ? <Outlet /> : <Navigate to="/" replace />;
}

export function App() {
  const { setAuth, setInitialized } = useAuthStore();

  // On mount: try to restore session via refresh cookie
  useEffect(() => {
    authApi.refresh()
      .then((res) => setAuth(res.data.data.accessToken, res.data.data.user))
      .catch(() => {}) // no cookie = not logged in, that's fine
      .finally(() => setInitialized());
  }, [setAuth, setInitialized]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Guest-only routes */}
          <Route element={<GuestGuard />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* Protected routes */}
          <Route element={<AuthGuard />}>
            <Route element={<AppShell><Outlet /></AppShell>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/workout/:dayId" element={<WorkoutDay />} />
              <Route path="/exercise/:exerciseId" element={<ExerciseDetail />} />
              <Route path="/body-weight" element={<BodyWeight />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/gym" element={<GymVisits />} />
              <Route path="/strength" element={<Strength />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
