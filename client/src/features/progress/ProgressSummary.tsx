import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth/useAuth';
import { useProgress } from '@/features/progress/useProgress';
import type { UserProgress } from '@/types/api';
import { BookOpen, Flame } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

const CARD =
  'rounded-xl border border-stone-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800';

/** One labelled figure. Presentational only — every value is handed in. */
function Stat({
  icon: Icon,
  label,
  value,
  caption,
  children,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  caption?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col gap-1">
      <div className="flex items-center gap-2 text-stone-500 dark:text-slate-400">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium tracking-wide uppercase">{label}</span>
      </div>
      <span className="text-2xl font-bold text-stone-800 dark:text-slate-100">{value}</span>
      {caption && <span className="text-xs text-stone-500 dark:text-slate-400">{caption}</span>}
      {children}
    </div>
  );
}

/**
 * Percentage read of the whole Qur'an. Trailing '.0' is dropped so a round number
 * does not read as false precision, but a decimal is kept below 10% where whole
 * numbers would show long stretches of reading as no movement at all.
 */
function formatPercent(percent: number): string {
  const rounded = percent < 10 ? Math.round(percent * 10) / 10 : Math.round(percent);
  return `${rounded}%`;
}

function KhatmahBar({ percent }: { percent: number }) {
  return (
    <div
      className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-slate-700"
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Khatmah progress"
    >
      <div
        className="h-full rounded-full bg-primary dark:bg-emerald-400"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

function ProgressStats({ progress }: { progress: UserProgress }) {
  const { current, longest } = progress.streak;

  return (
    <div className={`flex flex-wrap items-start gap-6 ${CARD}`}>
      <Stat
        icon={Flame}
        label="Streak"
        value={current === 1 ? '1 day' : `${current} days`}
        caption={longest > 0 ? `Best ${longest} ${longest === 1 ? 'day' : 'days'}` : undefined}
      />
      <Stat
        icon={BookOpen}
        label="Khatmah"
        value={formatPercent(progress.khatmahPercent)}
        caption="of the Qur'an read"
      >
        <KhatmahBar percent={progress.khatmahPercent} />
      </Stat>
    </div>
  );
}

/**
 * Streak and khatmah progress for the signed-in user.
 *
 * The streak shown is the server's display streak — already zeroed when it has
 * lapsed — so nothing here recomputes staleness. Guests are invited to sign in
 * rather than shown zeroes or an error, since having no progress is the correct
 * state for them, not a failure.
 */
export function ProgressSummary() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { progress, isLoading, isError, refetch } = useProgress();

  if (isAuthLoading) {
    return <Skeleton className="h-24 w-full rounded-xl" />;
  }

  if (!isAuthenticated) {
    return (
      <div className={`flex flex-wrap items-center justify-between gap-3 ${CARD}`}>
        <div className="flex items-center gap-3">
          <Flame className="h-5 w-5 text-primary dark:text-emerald-300" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-stone-700 dark:text-slate-200">
              Track your reading streak
            </span>
            <span className="text-xs text-stone-500 dark:text-slate-400">
              Create an account to record what you have read across devices.
            </span>
          </div>
        </div>
        <Link
          to="/register"
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Create account
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <Skeleton className="h-24 w-full rounded-xl" />;
  }

  if (isError || !progress) {
    return (
      <div className={CARD}>
        <ErrorState
          title="Could not load your progress"
          message="Your reading is still being recorded."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  // Signed in but nothing recorded yet: a streak of 0 and no active day is the
  // "never read" state, not a lapsed one.
  if (progress.streak.lastActiveDay === null && progress.khatmahPercent === 0) {
    return (
      <div className={`flex items-center gap-3 ${CARD}`}>
        <BookOpen className="h-5 w-5 text-stone-400 dark:text-slate-500" />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-stone-700 dark:text-slate-200">
            No reading recorded yet
          </span>
          <span className="text-xs text-stone-500 dark:text-slate-400">
            Open any surah — your streak starts with your first read.
          </span>
        </div>
      </div>
    );
  }

  return <ProgressStats progress={progress} />;
}
