/**
 * Shared styling for the player bar's `<select>` controls.
 *
 * Fill and text colour are identical in every state, on purpose. An active control is
 * marked with a border and ring only:
 *
 * - Recolouring the text was the original approach and failed WCAG 1.4.3 — `primary`
 *   (#1b4332) is a near-black green that disappears against a dark fill.
 * - Recolouring the fill made the field change background as the selection changed,
 *   which reads as a rendering glitch rather than as state.
 *
 * A border/ring is a non-text indicator, so it only needs 3:1 (WCAG 1.4.11), which
 * `primary` on white and `accent` on slate-800 both clear comfortably.
 */
const base =
  'rounded-lg border px-2 py-1.5 text-xs border-stone-300 bg-white text-stone-700 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';

const activeBorder =
  'border-primary ring-1 ring-primary dark:border-accent dark:ring-accent';

/**
 * Emphasis is carried by font weight alone. The ring stays thin everywhere — widening
 * it made the control heavier than the rest of the bar without reading as any clearer.
 */
const emphasisWeight = { subtle: '', strong: 'font-medium' } as const;

export function playerSelectClass(
  isActive = false,
  emphasis: keyof typeof emphasisWeight = 'subtle',
) {
  return isActive ? `${base} ${activeBorder} ${emphasisWeight[emphasis]}` : base;
}
