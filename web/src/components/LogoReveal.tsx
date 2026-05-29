import { useEffect, useRef, useState } from "react";

/**
 * Cinematic logo-reveal splash, recreated in pure CSS from the storyboard:
 * black -> moon glow fades in -> silhouette emerges from blur ->
 * details sharpen + contrast rises -> hold -> fade out to reveal the app.
 *
 * Plays once per browser session (sessionStorage) and respects
 * prefers-reduced-motion (collapses to a quick fade).
 *
 * Total runtime is driven by the CSS animations below; the JS timeout is only
 * a safety net so the overlay always unmounts even if `animationend` is missed.
 */

const SESSION_KEY = "mykalender:splash-seen";
const TOTAL_MS = 3600; // keep in sync with .mk-splash animation duration

/**
 * Decide visibility ONCE at module load, before React StrictMode can mount,
 * unmount and remount the component in dev. If we set the flag inside an
 * effect instead, the StrictMode remount would re-read it as "seen" and skip
 * the splash entirely. Marking it here makes the value stable across remounts
 * (and across same-session reloads).
 */
const shouldPlay =
  typeof window !== "undefined" &&
  sessionStorage.getItem(SESSION_KEY) !== "1";
if (shouldPlay) sessionStorage.setItem(SESSION_KEY, "1");

export function LogoReveal() {
  const [show, setShow] = useState(shouldPlay);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!show) return;
    // Safety net: always unmount even if `animationend` is missed.
    timer.current = window.setTimeout(() => setShow(false), TOTAL_MS + 200);
    return () => window.clearTimeout(timer.current);
  }, [show]);

  if (!show) return null;

  return (
    <div
      className="mk-splash"
      aria-hidden="true"
      onAnimationEnd={(e) => {
        // Only react to the container's own fade-out, not the children.
        if (e.animationName === "mk-splash-fade") setShow(false);
      }}
    >
      <div className="mk-splash__glow" />
      <img className="mk-splash__logo" src="/logo.png" alt="" draggable={false} />
    </div>
  );
}
