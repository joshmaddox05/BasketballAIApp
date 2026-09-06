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
import { POSTHOG_API_KEY, POSTHOG_HOST, APP_ENVIRONMENT, SENTRY_DSN } from '../config/env';
import logger, { setRemoteSink } from '../utils/logger';

let posthog = null;

// ---------------------------------------------------------------------------
// Tracing
//
// Most of it is already automatic: setting tracesSampleRate in App.js makes the
// SDK add app-start, stall, native-frames and network-request instrumentation
// on its own. React Navigation is the exception — it needs an integration built
// BEFORE Sentry.init and then handed the navigation container once it is ready,
// which is the only reason this lives at module scope.
//
// It is built here rather than in App.js so navigation can register itself
// without importing Sentry (App.js already imports AppNavigator, so the other
// direction would be a cycle).
// ---------------------------------------------------------------------------
export const navigationIntegration = Sentry.reactNavigationIntegration({
  // Time to Initial Display per screen: how long after the tap the athlete
  // actually sees the screen. Native build only, which is already the case for
  // every build that has telemetry at all.
  enableTimeToInitialDisplay: true,
  // The app is tabs-first, and tab navigators preload their screens — without
  // this, only the first visit to each tab is ever measured.
  enableTimeToInitialDisplayForPreloadedRoutes: true,
});

/**
 * Called from AppNavigator's onReady. Must not be called earlier: the container
 * has no ref to attach to until then, and the integration would warn and skip.
 *
 * @param {{ current: any }} containerRef the NavigationContainer ref
 */
export const registerNavigation = (containerRef) => {
  // Same contract as the rest of this file: no key, no telemetry. Registering
  // anyway would attach a listener that runs span machinery on every navigation
  // dispatch in a keyless checkout, for data that can never be sent.
  if (!SENTRY_DSN) return;
  try {
    navigationIntegration.registerNavigationContainer(containerRef);
  } catch (error) {
    logger.warn('Sentry navigation instrumentation failed to register', error);
  }
};

/**
 * Wrap a slow or failure-prone operation in a span. Child spans — including the
 * fetch the callback makes — and any log emitted inside it are attached to it,
 * which is what turns "the analysis took 40 seconds" into "the analysis took 40
 * seconds and 38 of them were the model call".
 *
 * Returns whatever the callback returns; safe to use when Sentry is not
 * configured, in which case it just runs the callback.
 *
 * @example
 *   const results = await startSpan(
 *     'shotAnalysis.comprehensive',
 *     'http.client',
 *     { analysisMode: 'comprehensive' },
 *     () => aiAnalysisService.analyzeComprehensive(videoData),
 *   );
 */
export const startSpan = (name, op, attributes, callback) =>
  // Same attribute rules as logs — primitives only, nulls dropped, and the
  // privacy rule at the top of this file applies here too.
  Sentry.startSpan({ name, op, attributes: logAttributes(attributes) }, callback);

/** Called once from App.js. Safe to call more than once. */
export const initAnalytics = () => {
  // Registered first, and gated on its OWN key: Sentry log forwarding must not
  // depend on PostHog being configured, and the early return below is an easy
  // line to add to without noticing what it also switches off.
  if (SENTRY_DSN) setRemoteSink(forwardToSentry);

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

// ---------------------------------------------------------------------------
// Structured logging (Sentry Logs)
//
// The difference from track(): a PostHog event answers "how many athletes
// finished a workout", a log answers "what happened during this one, and in
// what order". Logs are correlated with the active trace and with any error
// captured in the same session, so they are what you read when an issue in
// Sentry needs the ten seconds before it.
//
// The privacy rule is unchanged and applies harder here, because a log has a
// free-text message as well as attributes: uid and enum-ish values only.
// ---------------------------------------------------------------------------

// Attribute values must be primitives — string, number, boolean. `clean()`
// enforces that; null is dropped on top of it, since an empty column in the
// Logs UI is noise rather than information.
const logAttributes = (attrs) => {
  const out = clean(attrs);
  for (const key of Object.keys(out)) {
    if (out[key] === null) delete out[key];
  }
  return out;
};

const emit = (level, message, attrs) => {
  if (!SENTRY_DSN) return;
  try {
    Sentry.logger[level](message, logAttributes(attrs));
  } catch {
    // Silent on purpose, and it must stay that way: logger.warn/error forward
    // into this function, so calling logger here would loop.
  }
};

/**
 * Six levels, matching Sentry's. Pick by who needs to act on it:
 *   trace/debug — step-by-step internals; dropped in production (see App.js)
 *   info        — business milestones and meaningful state transitions
 *   warn        — recoverable, degraded, or approaching a limit
 *   error       — a failure worth investigating that did not crash the app
 *   fatal       — a subsystem is down
 *
 * @example
 *   log.info('Shot analysis completed', { durationMs: 8200, score: 74 });
 */
export const log = {
  trace: (message, attrs) => emit('trace', message, attrs),
  debug: (message, attrs) => emit('debug', message, attrs),
  info: (message, attrs) => emit('info', message, attrs),
  warn: (message, attrs) => emit('warn', message, attrs),
  error: (message, attrs) => emit('error', message, attrs),
  fatal: (message, attrs) => emit('fatal', message, attrs),
};

/**
 * Tagged template that makes each interpolated value individually searchable
 * in the Logs UI (they land as `message.parameter.N`), instead of baking them
 * into one string nobody can filter on:
 *
 *   log.error(fmt`Analysis failed for drill ${drillId}: ${code}`);
 *
 * Interpolated values are searchable telemetry like any attribute, so the same
 * rule applies — ids and enums, never a name or anything an athlete typed.
 * Must be used as a tagged template; calling fmt(...) produces a plain string.
 */
export const fmt = Sentry.logger.fmt;

// Bridge from utils/logger. Every existing logger.warn / logger.error in the
// app becomes a structured Sentry log through this, without any screen — or
// utils/logger itself — importing Sentry.
const forwardToSentry = (level, message, args) => {
  const attrs = {};
  for (const arg of args) {
    if (arg instanceof Error) {
      // The exception's own message and code, truncated. That is the same
      // exposure captureException already sends; everything else hanging off
      // the object (request bodies, user records) is dropped.
      attrs.errorMessage = String(arg.message || '').slice(0, 200);
      if (arg.code) attrs.errorCode = String(arg.code);
    } else if (arg && typeof arg === 'object') {
      // Callers already pass small context objects; clean() drops anything in
      // there that isn't a primitive.
      Object.assign(attrs, arg);
    }
  }
  emit(level, message, attrs);
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

export default {
  initAnalytics,
  track,
  identifyUser,
  resetUser,
  reportError,
  log,
  fmt,
  startSpan,
  registerNavigation,
  navigationIntegration,
  EVENTS,
};
