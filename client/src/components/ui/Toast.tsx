import { AlertTriangle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  onDismiss: () => void;
}

/** A single transient message. Presentational only — lifetime lives in ToastProvider. */
export function Toast({ message, onDismiss }: ToastProps) {
  return (
    <div className="pointer-events-auto flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
      <p className="text-sm text-stone-700 dark:text-slate-200">{message}</p>
      <button
        onClick={onDismiss}
        className="ml-auto shrink-0 rounded-md p-1 text-stone-400 hover:bg-stone-100 dark:hover:bg-slate-700"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
