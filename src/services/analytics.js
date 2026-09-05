// analytics.js - the app's only telemetry seam.
//
// Nothing outside this file imports Sentry or PostHog directly, so swapping a
// vendor is a one-file change and no screen can accidentally send something it
// shouldn't.
//
// PRIVACY — this is not optional politeness, it is the pilot's premise. The
// test cohort is high-school athletes, most of them minors. Never pass a name,
// an email, a display name, free text an athlete typed, or anything a coach
// wrote about them. Send the Firebase uid and enum-ish values only. `track()`
// strips anything that isn't a primitive, but the real guard is what callers
// choose to pass.
//
// Both SDKs are optional: with no key configured every function here is a
// no-op, so a contributor without the secrets still gets a working app and
// dev-simulator noise never reaches the pilot's data.

import * as Sentry from '@sentry/react-native';
import PostHog from 'posthog-react-native';
import { POSTHOG_API_KEY, POSTHOG_HOST, APP_ENVIRONMENT } from '../config/env';
import logger from '../utils/logger';

let posthog = null;

/** Called once from App.js. Safe to call more than once. */
export const initAnalytics = () => {
  if (posthog || !POSTHOG_API_KEY) return;
  try {
    posthog = new PostHog(POSTHOG_API_KEY, { host: POSTHOG_HOST });
  } catch (error) {
    // Telemetry must never be the reason the app fails to start.
    logger.warn('Analytics init failed; continuing without it.', error);
    posthog = null;
  }
};

// Only primitives survive. An object or array is dropped rather than
// serialised, because that is exactly how a free-text blob or a whole user
// record leaks into an event payload by accident.
const clean = (props = {}) => {
  const out = {};
  for (const [key, value] of Object.entries(props)) {
    const t = typeof value;
    if (value === null || t === 'string' || t === 'number' || t === 'boolean') {
      out[key] = value;
    }
  }
  out.appEnv = APP_ENVIRONMENT;
  return out;
};

/**
 * Record a product event.
 * @param {string} event  a name from EVENTS below
 * @param {object} [props] primitives only — no names, emails, or free text
 */
export const track = (event, props) => {
  if (!posthog) return;
  try {
    posthog.capture(event, clean(props));
  } catch (error) {
    logger.warn(`Analytics track failed for "${event}"`, error);
  }
};

/**
 * Bind telemetry to a signed-in user. Sentry gets the uid ONLY — no email or
 * username, both of which its API would happily accept and attach to every
 * crash report.
 */
export const identifyUser = (uid, traits = {}) => {
  if (!uid) return;
  try {
    Sentry.setUser({ id: uid });
  } catch (error) {
    logger.warn('Sentry setUser failed', error);
  }
  if (!posthog) return;
  try {
    posthog.identify(uid, clean(traits));
  } catch (error) {
    logger.warn('Analytics identify failed', error);
  }
};

/** Clear identity on sign-out so the next account is not attributed to the last. */
export const resetUser = () => {
  try {
    Sentry.setUser(null);
  } catch (error) {
    logger.warn('Sentry clear user failed', error);
  }
  if (!posthog) return;
  try {
    posthog.reset();
  } catch (error) {
    logger.warn('Analytics reset failed', error);
  }
};

/** Report a handled error with context. Unhandled ones are captured natively. */
export const reportError = (error, context = {}) => {
  try {
    Sentry.captureException(error, { extra: clean(context) });
  } catch {
    // Swallowed deliberately: a failure inside error reporting must not
    // recurse into another error report.
  }
};

// The pilot funnel. Names are defined here rather than typed at call sites so
// a rename is one edit and a typo is a missing import instead of a silently
// mis-named event nobody notices until the data is being read.
export const EVENTS = {
  SIGNUP_COMPLETED: 'signup_completed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  WORKOUT_STARTED: 'workout_started',
  WORKOUT_COMPLETED: 'workout_completed',
  COACH_LINK_REQUESTED: 'coach_link_requested',
  COACH_LINK_APPROVED: 'coach_link_approved',
  ASSIGNMENT_SUBMITTED: 'assignment_submitted',
  SHOT_ANALYSIS_RUN: 'shot_analysis_run',
  FILM_TAGGED: 'film_tagged',
};

export default { initAnalytics, track, identifyUser, resetUser, reportError, EVENTS };
