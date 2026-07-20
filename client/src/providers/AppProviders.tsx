import { AuthProvider } from '@/context/AuthContext';
import { PlayerProvider } from '@/context/PlayerContext';
import { FavouritesMigration } from '@/features/bookmarks/FavouritesMigration';
import { queryClient } from '@/lib/queryClient';
import { PreferencesSync } from '@/providers/PreferencesSync';
import { ProgressSync } from '@/providers/ProgressSync';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/** Composes every app-wide provider in dependency order. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <PlayerProvider>
            <PreferencesSync />
            <ProgressSync />
            <FavouritesMigration />
            {children}
          </PlayerProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
