/**
 * Queue state for transient notifications, as a pure function.
 *
 * No React, no timers, no DOM — the client has no React testing library, so a
 * provider cannot be rendered in a test. Keeping the transitions here is what makes
 * capacity, coalescing, and dismissal assertable at all (design D2), the same reason
 * resolveThemePreference and the reading buffer were extracted.
 *
 * Ids and timestamps arrive on the action rather than being generated here, so the
 * reducer stays pure and a test can drive it deterministically.
 */

export interface Toast {
  id: string;
  message: string;
  /**
   * When this message was last raised. Bumped — rather than the entry being replaced —
   * when an identical message coalesces, which is the provider's signal to restart the
   * expiry timer.
   */
  raisedAt: number;
}

export type ToastAction =
  | { type: 'ADD'; id: string; message: string; raisedAt: number }
  /** The user activated the dismiss control. */
  | { type: 'DISMISS'; id: string }
  /** The message's lifetime ran out. */
  | { type: 'EXPIRE'; id: string };

/**
 * How many messages may show at once. The realistic failure is correlated — the network
 * is down and the user changes four settings — so without a cap the stack grows
 * unbounded (design D3).
 */
export const MAX_TOASTS = 3;

const remove = (state: Toast[], id: string): Toast[] => {
  const next = state.filter((toast) => toast.id !== id);
  // Preserve identity when nothing matched, so an unknown id cannot trigger a render.
  return next.length === state.length ? state : next;
};

export function toastQueueReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case 'ADD': {
      // Coalesce on the text: four copies of one sentence is noise, not information.
      // Distinct wording still stacks.
      const existing = state.find((toast) => toast.message === action.message);
      if (existing) {
        return state.map((toast) =>
          toast.id === existing.id ? { ...toast, raisedAt: action.raisedAt } : toast,
        );
      }
      const appended = [...state, { id: action.id, message: action.message, raisedAt: action.raisedAt }];
      return appended.length > MAX_TOASTS ? appended.slice(appended.length - MAX_TOASTS) : appended;
    }
    case 'DISMISS':
    case 'EXPIRE':
      // Same transition, kept as two actions because the call sites mean different
      // things and a future difference (say, announcing only expiry) belongs here.
      return remove(state, action.id);
    default:
      return state;
  }
}
