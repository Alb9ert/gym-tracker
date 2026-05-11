import { create } from 'zustand';
import type { User } from '@/types';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isInitialized: boolean;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  setInitialized: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isInitialized: false,
  setAuth: (accessToken, user) => set({ accessToken, user }),
  clearAuth: () => set({ accessToken: null, user: null }),
  setInitialized: () => set({ isInitialized: true }),
}));
