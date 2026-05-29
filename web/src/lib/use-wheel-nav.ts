import { useEffect, useRef } from "react";

/**
 * Trackpad navigation, like Google Calendar: a two-finger swipe steps the
 * calendar back/forward.
 *
 * Attach the returned ref to the scroll container. Horizontal swipes always
 * navigate. Vertical swipes navigate only when `vertical` is true (month view,
 * where there's no time grid to scroll) — otherwise they pass through so the
 * week/day time grid keeps scrolling normally.
 *
 * A small threshold + short cooldown keeps it snappy while still mapping one
 * physical flick to one step.
 */
export function useWheelNav<T extends HTMLElement>(
  onStep: (direction: -1 | 1) => void,
  options?: { vertical?: boolean },
) {
  const ref = useRef<T>(null);
  // Mirror the latest values into refs so the (passive: false) listener never
  // needs re-attaching when they change.
  const onStepRef = useRef(onStep);
  const verticalRef = useRef(options?.vertical ?? false);
  useEffect(() => {
    onStepRef.current = onStep;
    verticalRef.current = options?.vertical ?? false;
  }, [onStep, options?.vertical]);

  const accum = useRef(0);
  const cooling = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const THRESHOLD = 28; // px of travel before a step fires (lower = snappier)
    const COOLDOWN_MS = 220; // gap before the next step can fire

    function onWheel(e: WheelEvent) {
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      let delta: number;
      if (horizontal) {
        delta = e.deltaX;
      } else if (verticalRef.current) {
        delta = e.deltaY;
      } else {
        return; // vertical scroll passes through (time grid, etc.)
      }

      // Claim the gesture so the browser doesn't navigate history/over-scroll.
      e.preventDefault();
      if (cooling.current) return;

      accum.current += delta;
      if (Math.abs(accum.current) < THRESHOLD) return;

      const direction = accum.current > 0 ? 1 : -1;
      accum.current = 0;
      cooling.current = true;
      window.setTimeout(() => {
        cooling.current = false;
      }, COOLDOWN_MS);

      onStepRef.current(direction);
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return ref;
}
