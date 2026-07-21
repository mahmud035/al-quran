import { Toast } from '@/components/ui/Toast';
import { toastQueueReducer } from '@/providers/toastQueue';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';

interface ToastContextValue {
  /** Raise a message. Identical text already showing refreshes it instead of stacking. */
  notify: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/** Long enough to read a sentence without hunting for the close control. */
const TOAST_DURATION_MS = 8000;

/**
 * Owns the message queue and its timers, and renders the stack. A thin shell over
 * toastQueue.ts, which holds every transition worth asserting (design D2).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(toastQueueReducer, []);

  // Ids and timestamps are minted here rather than in the reducer, which stays pure.
  // A counter, not Date.now(): two failures in the same millisecond would collide.
  const nextId = useRef(0);
  const timers = useRef(new Map<string, { raisedAt: number; timeout: number }>());

  const notify = useCallback((message: string) => {
    nextId.current += 1;
    dispatch({
      type: 'ADD',
      id: `toast-${nextId.current}`,
      message,
      raisedAt: nextId.current,
    });
  }, []);

  const dismiss = useCallback((id: string) => dispatch({ type: 'DISMISS', id }), []);

  // Reconcile one timer per showing message: start one for anything new, restart one
  // whose `raisedAt` moved (a coalesced repeat), and drop timers for messages that have
  // gone. Cleaning up on removal is what stops a dismissed message's timeout firing
  // against an id that has since been reused.
  useEffect(() => {
    const map = timers.current;

    for (const toast of toasts) {
      const existing = map.get(toast.id);
      if (existing?.raisedAt === toast.raisedAt) continue;
      if (existing) clearTimeout(existing.timeout);
      map.set(toast.id, {
        raisedAt: toast.raisedAt,
        timeout: window.setTimeout(
          () => dispatch({ type: 'EXPIRE', id: toast.id }),
          TOAST_DURATION_MS,
        ),
      });
    }

    for (const [id, entry] of map) {
      if (!toasts.some((toast) => toast.id === id)) {
        clearTimeout(entry.timeout);
        map.delete(id);
      }
    }
  }, [toasts]);

  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const entry of map.values()) clearTimeout(entry.timeout);
      map.clear();
    };
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/*
        Rendered unconditionally, empty and all — mounting the live region alongside its
        first message leaves a screen reader nothing to observe changing, and the message
        goes unannounced (design D4). `polite`: a setting that did not sync is not worth
        interrupting what is being read.

        Top placement below the navbar, because PlayerBar owns the bottom edge whenever
        audio is loaded; above z-50 so a modal cannot cover it (design D5). No portal,
        matching Modal. `pointer-events-none` on the stack keeps the page beneath it
        clickable — each Toast re-enables them for itself.
      */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-20 z-[60] mx-auto flex max-w-sm flex-col gap-2 px-4"
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} message={toast.message} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
