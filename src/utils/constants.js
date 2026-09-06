// constants.js - Centralized app constants
// Single source of truth for AsyncStorage keys, level titles, and other shared values.

export const STORAGE_KEYS = {
  IS_DARK_MODE: 'isDarkMode',
  USE_SYSTEM_THEME: 'useSystemTheme',
  LANGUAGE: 'language',
  BOOKMARKED_VIDEOS: 'bookmarkedVideos',
  HAS_SEEN_TOUR: 'hasSeenTour',
  HAS_SEEN_COACH_TOUR: 'hasSeenCoachTour',
  HAS_SEEN_PARENT_TOUR: 'hasSeenParentTour',
  // Screen-scoped tours (see components/tour/ScreenTour.js) — these fire on first
  // visit to one screen rather than on first launch of a role's whole shell.
  HAS_SEEN_GAMEPLAN_TOUR: 'hasSeenGamePlanTour',
  HAS_SEEN_FILM_TOUR: 'hasSeenFilmTour',
  // A coach invite code captured from a link BEFORE the athlete has an account.
  // It has to outlive signup and the whole of onboarding, because it cannot be
  // claimed until the athlete's grade is known — grade is what decides whether
  // the coach gets a live connection or a request pending a guardian.
  PENDING_COACH_INVITE: 'pendingCoachInvite',
  TOUR_VOICE_MUTED: 'tourVoiceMuted',
  SELECTED_CHILD_UID: 'selectedChildUid',
  AI_ANALYSIS_CACHE: 'ai_analysis_cache',
  AI_MODELS_CACHE: 'ai_models_cache',
  YOUTUBE_VIDEOS_CACHE: 'youtube_videos_cache',
};

export const LEVEL_TITLES = {
  1: 'Rookie',
  2: 'Beginner',
  3: 'Amateur',
  4: 'Intermediate',
  5: 'Skilled',
  6: 'Advanced',
  7: 'Expert',
  8: 'Pro',
  9: 'Elite',
  10: 'All-Star',
  11: 'Superstar',
  12: 'MVP',
  13: 'Hall of Famer',
  14: 'Legend',
  15: 'GOAT',
};

export const getLevelTitle = (level) =>
  LEVEL_TITLES[Math.min(Math.max(level || 1, 1), 15)] || 'Rookie';

export const WEEKLY_WORKOUT_GOAL = 3; // default target workouts per week

// Support contact — single source of truth. The app previously carried five
// different addresses across three domains (basketballai.com,
// basketballaitraining.com, dbeapp.com), and the privacy policy pointed at a
// different one than the account-deletion flow told users to write to.
export const SUPPORT_EMAIL = 'support@dbeapp.com';
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;

// ─── Grade level ────────────────────────────────────────────────────────────
//
// One source of truth. GRADE_LEVELS was previously copy-pasted verbatim into
// three editors and GRADE_LABEL into five scout screens, which is how the two
// drifted: GRADE_LEVELS carried a `0` option that GRADE_LABEL had no entry for,
// so a "Not HS" athlete rendered as a blank.
//
// `0` used to mean "Not HS", which collapsed a college athlete and a 7th
// grader into the same value — exactly the distinction the pilot depends on,
// since one is an adult and the other cannot lawfully be served at all. It is
// now split three ways:
//
//   9–12  minor, high school     → guardian approval required on a coach link,
//                                  and the only cohort scouts can discover
//   13    college                → adult; no guardian gate
//   0     below 9th grade        → BLOCKED at onboarding (see COPPA note below)
//
// COPPA applies to users under 13 and requires verifiable parental consent,
// which this app does not implement. Asking for grade is a neutral age screen:
// it does not telegraph a "correct" answer the way "are you over 13?" does, and
// selecting below-9th stops account setup rather than collecting anything. That
// is compliance by exclusion. Admitting middle schoolers later means building
// verifiable parental consent first — it is not a matter of changing this list.
export const GRADE_BELOW_HS = 0;
export const GRADE_COLLEGE = 13;

export const GRADE_LEVELS = [
  { value: 9, label: '9th' },
  { value: 10, label: '10th' },
  { value: 11, label: '11th' },
  { value: 12, label: '12th' },
  { value: GRADE_COLLEGE, label: 'College' },
  { value: GRADE_BELOW_HS, label: 'Younger' },
];

export const GRADE_LABEL = {
  9: '9th',
  10: '10th',
  11: '11th',
  12: '12th',
  [GRADE_COLLEGE]: 'College',
  [GRADE_BELOW_HS]: 'Below 9th',
};

/** Grades 9–12: the scout-discoverable cohort, and the one needing a guardian. */
export const isHighSchoolGrade = (gradeLevel) =>
  Number.isInteger(gradeLevel) && gradeLevel >= 9 && gradeLevel <= 12;

/** True for a grade we cannot serve. Blocks onboarding; see the COPPA note. */
export const isBelowHighSchool = (gradeLevel) => gradeLevel === GRADE_BELOW_HS;

/**
 * Does a coach link to this athlete need guardian approval?
 * Only high-school grades — a college athlete is an adult, and a below-HS user
 * never gets an account in the first place.
 */
export const requiresGuardianConsent = (gradeLevel) => isHighSchoolGrade(gradeLevel);

// ─── Coaching sessions ────────────────────────────────────────────────────────
// A booked session between a coach and a linked athlete (`coachingSessions`).
//
// These four strings were literals scattered across three writers and five
// readers, and they had drifted: 'cancelled' was checked in five different
// filters and written by nobody, because no cancel action existed anywhere in
// the product. A status a reader handles and no writer produces is indis-
// tinguishable from a status a writer produces and no reader handles — the
// second kind silently breaks. Both are why this list is now one declaration
// with a test asserting every value has a writer.
export const SESSION_STATUS = {
  PENDING: 'pending',     // coach proposed it; athlete has not answered
  CONFIRMED: 'confirmed', // athlete accepted
  COMPLETED: 'completed', // coach marked it done
  CANCELLED: 'cancelled', // either side called it off
};

/** Terminal states. A session here never appears in an upcoming list again. */
export const SESSION_CLOSED_STATUSES = [SESSION_STATUS.COMPLETED, SESSION_STATUS.CANCELLED];

/**
 * The single definition of "upcoming", shared by every surface that lists
 * sessions. The coach's Sessions screen and the CoachMarket dashboard used to
 * apply different filters to the same documents — the dashboard did not exclude
 * completed sessions — so a finished session still showed as an upcoming
 * booking on one screen and not the other.
 *
 * A session with no scheduledAt counts as upcoming: it has been proposed but not
 * yet dated, and hiding it would lose it entirely.
 */
export const isUpcomingSession = (session, now = Date.now()) => {
  if (SESSION_CLOSED_STATUSES.includes(session?.status)) return false;
  const when = session?.scheduledAt ? new Date(session.scheduledAt) : null;
  if (!when || Number.isNaN(when.getTime())) return true;
  return when.getTime() >= now;
};

// ─── Position & height ────────────────────────────────────────────────────────
// The archetype engine's two strongest signals: position is 30 of its 120 weight
// and height 15 (src/services/blueprint/archetypeAssignment.js). These option
// lists were copy-pasted into three screens, which is how EditProfileScreen and
// EditAthleteProfileScreen ended up storing height in two different ways — one a
// picker producing `6'2"`, the other a free-text field accepting anything.
export const POSITIONS = [
  { value: 'PG', label: 'PG', long: 'Point Guard' },
  { value: 'SG', label: 'SG', long: 'Shooting Guard' },
  { value: 'SF', label: 'SF', long: 'Small Forward' },
  { value: 'PF', label: 'PF', long: 'Power Forward' },
  { value: 'C', label: 'C', long: 'Center' },
];

export const FEET_OPTIONS = [4, 5, 6, 7];
export const INCH_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

// Height itself — the format, the parser and its inverse — lives with the
// archetype engine (services/blueprint/archetypeAssignment.js), which is the
// module that has to read it. Import composeHeight/splitHeight from there.
