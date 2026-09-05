// ScreenTour.js — a tour that lives inside one screen.
//
// The existing tours are mounted per navigator and walk across tabs. Two screens
// now need a tour and neither is a tab: the game plan builder and the film
// library are both pushed routes on the Playbook stack. TourProvider's
// `navigateToStep` only ever calls `navigate(step.tab)`, which cannot push a
// nested stack screen — so a cross-tab tour physically cannot reach either one.
//
// Rather than teach the engine to navigate into nested stacks (a change that
// would touch every existing tour), a screen mounts its own provider. TourStep
// resolves through `useTour()` to the nearest provider, so every anchor inside
// this subtree registers here instead of with the navigator's tour, and every
// step is on the screen already — `tab: null`, nothing to navigate to. The
// engine, the overlay, the tooltip and the narration are all reused unchanged.
//
// The tradeoff: while a screen tour is running, the navigator's tour is shadowed
// for this subtree. That is exactly what we want — two spotlights on one screen
// would be incoherent — and in practice they never run at once, because a screen
// tour only auto-starts on first visit to a screen you had to navigate to.
import React, { useEffect, useRef } from 'react';
import { TourProvider, useTour } from './TourProvider';
import TourOverlay from './TourOverlay';

// Fires the tour once the screen has settled. The delay matches the navigators'
// (1000ms): the anchors have to be laid out and measurable before the first
// spotlight is cut, and a push transition is still animating before then.
const AUTOSTART_DELAY = 900;

function AutoStart({ enabled }) {
  const { startTour, hasSeenTour, isLoading, isTourActive } = useTour();
  // startTour writes the "seen" flag immediately, but the flag is read once on
  // mount — so without this guard a re-render mid-tour could queue a second start.
  const fired = useRef(false);

  useEffect(() => {
    if (!enabled || isLoading || hasSeenTour || isTourActive || fired.current) return undefined;
    fired.current = true;
    const timer = setTimeout(() => startTour(), AUTOSTART_DELAY);
    return () => clearTimeout(timer);
  }, [enabled, isLoading, hasSeenTour, isTourActive, startTour]);

  return null;
}

/**
 * @param {Array}   steps      step definitions, same shape as tourConfig's
 * @param {string}  storageKey AsyncStorage key holding "seen" for this tour
 * @param {object}  theme      the app theme, for the overlay
 * @param {boolean} enabled    false suppresses autostart (e.g. while loading)
 */
export default function ScreenTour({ steps, storageKey, theme, enabled = true, children }) {
  return (
    <TourProvider steps={steps} storageKey={storageKey}>
      {children}
      <AutoStart enabled={enabled} />
      <TourOverlay theme={theme} />
    </TourProvider>
  );
}
