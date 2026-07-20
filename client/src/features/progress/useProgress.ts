import { api } from '@/api/axios';
import { useAuth } from '@/features/auth/useAuth';
import type { ApiEnvelope, UserProgress } from '@/types/api';
import { useQuery } from '@tanstack/react-query';

export const PROGRESS_KEY = ['progress'] as const;

/**
 * The browser's IANA zone, e.g. 'Asia/Dhaka'.
 *
 * The server buckets streak days by this, because a calendar day is a client concept:
 * at one instant Dhaka and Auckland are on different dates. An unavailable zone is
 * left undefined and the server falls back to UTC rather than rejecting the request.
 */
export function clientTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

/**
 * The authenticated user's reading progress: coverage, khatmah percentage, streak,
 * and server-owned last-read position.
 *
 * Disabled for guests, who have no progress by design and must issue no requests.
 * The streak returned is already the display streak — a lapsed one arrives as 0, so
 * nothing here recomputes staleness client-side.
 */
export function useProgress() {
  const { isAuthenticated } = useAuth();

  const query = useQuery<UserProgress>({
    queryKey: PROGRESS_KEY,
    enabled: isAuthenticated,
    staleTime: 30_000,
    queryFn: async () => {
      const timezone = clientTimezone();
      const res = await api.get<ApiEnvelope<UserProgress>>('/progress', {
        params: timezone ? { timezone } : undefined,
      });
      return res.data.data;
    },
  });

  return {
    progress: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
