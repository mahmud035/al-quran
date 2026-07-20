import { api } from '@/api/axios';
import { clearPending } from '@/features/progress/readingBuffer';
import type { ApiEnvelope, AuthUser } from '@/types/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useMemo, type ReactNode } from 'react';

export interface LoginInput {
  email: string;
  password: string;
}
export interface RegisterInput extends LoginInput {
  name: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ME_KEY = ['auth', 'me'] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Initial session probe. A 401 means "guest" — resolve to null, not an error.
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        const res = await api.get<ApiEnvelope<AuthUser>>('/auth/me');
        return res.data.data;
      } catch {
        return null;
      }
    },
    staleTime: Infinity,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (input: LoginInput) => {
      const res = await api.post<ApiEnvelope<AuthUser>>('/auth/login', input);
      return res.data.data;
    },
    onSuccess: (u) => queryClient.setQueryData(ME_KEY, u),
  });

  const registerMutation = useMutation({
    mutationFn: async (input: RegisterInput) => {
      const res = await api.post<ApiEnvelope<AuthUser>>('/auth/register', input);
      return res.data.data;
    },
    onSuccess: (u) => queryClient.setQueryData(ME_KEY, u),
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSuccess: () => {
      queryClient.setQueryData(ME_KEY, null);
      // Drop user-scoped caches (bookmarks/settings/progress) on logout.
      queryClient.removeQueries({ queryKey: ['bookmarks'] });
      queryClient.removeQueries({ queryKey: ['settings'] });
      queryClient.removeQueries({ queryKey: ['progress'] });
      // Undelivered reads belong to the user who signed out, not the next guest.
      clearPending();
    },
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user ?? null,
      isLoading,
      isAuthenticated: Boolean(user),
      login: async (input) => {
        await loginMutation.mutateAsync(input);
      },
      register: async (input) => {
        await registerMutation.mutateAsync(input);
      },
      logout: async () => {
        await logoutMutation.mutateAsync();
      },
    }),
    [user, isLoading, loginMutation, registerMutation, logoutMutation],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
