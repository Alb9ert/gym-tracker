import apiClient from './client';
import type { User } from '@/types';

interface AuthResponse { accessToken: string; user: User; }

export const authApi = {
  register: (email: string, password: string, name: string) =>
    apiClient.post<{ success: true; data: AuthResponse }>('/api/auth/register', { email, password, name }),

  login: (email: string, password: string) =>
    apiClient.post<{ success: true; data: AuthResponse }>('/api/auth/login', { email, password }),

  logout: () => apiClient.post('/api/auth/logout'),

  refresh: () =>
    apiClient.post<{ success: true; data: AuthResponse }>('/api/auth/refresh'),

  me: () =>
    apiClient.get<{ success: true; data: User }>('/api/auth/me'),
};
