import axios from 'axios';
import type { ApiError } from '@/types';

export function parseApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err) && err.response?.data?.error) {
    return err.response.data.error as ApiError;
  }
  if (err instanceof Error) {
    return { code: 'SERVER_ERROR', message: err.message };
  }
  return { code: 'SERVER_ERROR', message: 'An unexpected error occurred' };
}

export function getErrorMessage(err: unknown): string {
  return parseApiError(err).message;
}
