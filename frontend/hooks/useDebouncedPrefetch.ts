import { useRef, useCallback } from "react";

/**
 * Returns a debounced wrapper around a prefetch function.
 * Prevents firing a burst of prefetch requests when the user scrolls
 * rapidly with the mouse over list rows.
 *
 * @param prefetchFn  The prefetch function to call (e.g. prefetchThread)
 * @param delay       Debounce delay in ms — defaults to 150ms
 */
export function useDebouncedPrefetch(
  prefetchFn: (id: string) => void,
  delay = 150,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onHover = useCallback(
    (id: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        prefetchFn(id);
        timerRef.current = null;
      }, delay);
    },
    [prefetchFn, delay],
  );

  /** Cancel any pending prefetch (call on mouseLeave if desired). */
  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return { onHover, cancel };
}
