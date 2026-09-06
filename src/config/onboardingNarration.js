// onboardingNarration.js — the spoken guide through onboarding.
//
// Onboarding asks a new athlete for eight things in a row — role, skill level,
// goals, grade, position, height, training days, focus areas — and tells them
// almost nothing about why. Position and height decide their archetype, which
// decides every drill they are ever shown. Someone tapping through blind has no
// way to know any of it matters, and a wrong answer is expensive precisely
// because it is invisible.
//
// So these lines exist to say what each step is FOR. They are written to be
// heard, not read: shorter sentences than the on-screen copy, contractions,
// no bullet structure, and never a word-for-word reading of the text the user is
// already looking at — a voice that only reads the screen aloud is noise.
//
// THIS PHASE IS ALL BASKETBALL. The player-facing lines explain basketball
// consequences and nothing else. In particular they never explain that grade
// governs the guardian gate on coach links: a minor told which answer removes an
// approval step has been handed a reason to misreport, and the safety mechanism
// only works on an honest answer. Every field here has a real basketball reason
// to be accurate, so that is the reason the voice gives. Consent mechanics are
// explained where they belong — to the guardian, on the screen that asks them to
// approve something.
//
// GENERATION: `npm run narration` scrapes `narrationId` + `script` pairs out of
// this file (it is listed in scripts/generateNarration.mjs `sources`) and
// produces assets/narration/<id>.mp3. Until that runs, narrationService speaks
// these through the OS voice instead — so the flow is never silent just because
// the audio has not been produced yet.
//
// Ids are namespaced `onboarding.*` and must not collide with `tour.*` or
// `intro.*`; the generator hard-errors on a duplicate.

/** Spoken once when the athlete lands on the role picker. */
export const ONBOARDING_NARRATION = {
  role: {
    narrationId: 'onboarding.role',
    script:
      "Welcome to DBE HoopIQ. First, tell us who you are, because the app is genuinely different for each one. Players get training and evaluation. Coaches get film and game plans. Parents follow their athlete's progress and stay connected with their coach.",
  },

  // Points at the quiz, because the screen now leads with it. Naming the three
  // labels here would undo that — hearing "beginner, intermediate, advanced"
  // invites the listener to pick one before they have looked at the screen.
  //
  // Tone: an invitation, not an instruction. An earlier draft opened "Take the
  // quiz" and closed on a warning about building bad habits — accurate, and it
  // read like a teacher standing over you on your first day. The honesty nudge is
  // still here, but it is carried by the payoff ("somewhere the work actually
  // pays off") instead of the threat, and by lowering the stakes first: no wrong
  // answers, nothing locked in.
  skill: {
    narrationId: 'onboarding.skill',
    script:
      "Let's find out where your game is right now. It's five quick questions about how you actually play, and it takes about a minute. There's no wrong answer here, and nothing's locked in. Just answer the way your last few runs really went, and we'll start you somewhere the work actually pays off.",
  },

  // The invited variant. Athletes arriving on a coach's link skip role selection
  // entirely, so the skill quiz is the FIRST screen they see — and the welcome
  // that lives on the role screen never plays for them. Without this they get a
  // cold open into a quiz, having just tapped a link, with nobody having said
  // hello.
  //
  // It cannot name the coach. Narration is pre-generated per narrationId at build
  // time (scripts/generateNarration.mjs), so any name in the script would be
  // baked into one audio file and spoken to every athlete on every team. The
  // banner on screen carries the name; the voice carries the welcome.
  //
  // "Connecting with them is already handled" is deliberately vaguer than "you're
  // on their roster" — for a high-school athlete the link sits pending a guardian,
  // and promising the roster would be a small lie told in the first ten seconds.
  skillInvited: {
    narrationId: 'onboarding.skill-invited',
    script:
      "Welcome to DBE HoopIQ. Your coach sent you here, so connecting with them is already handled. All that's left is showing us how you play. Five quick questions, about a minute, and there's no wrong answer. Just answer the way your last few runs really went.",
  },

  goals: {
    narrationId: 'onboarding.goals',
    script:
      "Now pick what you're actually chasing. Your goals change which workouts get recommended to you, so choose the ones you'd genuinely put the work in for, not the ones that sound best.",
  },

  // Grade is deliberately framed as a BASKETBALL input, not a consent input.
  // The earlier draft explained that grade decides whether a guardian has to
  // approve a coach link — which, said out loud to a sixteen-year-old, is a
  // recipe for picking the answer that removes the gate. Height is genuinely
  // scored against the athlete's own year (HEIGHT_BANDS_BY_GRADE in
  // archetypeAssignment.js), so this framing is both true and points the
  // incentive the right way: misreport your year and your own evaluation is
  // wrong. Nothing in this phase of the flow mentions consent mechanics.
  personalization: {
    narrationId: 'onboarding.personalization',
    script:
      "Take your time with this one. Your position and height set your archetype — the type of player we develop you into, and it decides every drill you get. Your grade matters because we measure your size against players in your own year, not against grown men, so be straight with it. And your training days set how big your weekly plan is.",
  },

  archetype: {
    narrationId: 'onboarding.archetype',
    script:
      "Based on your size and the spot you play, here's the type of player we'll develop you into. Your archetype decides which shots count as good ones for you and how your plan is built. If it doesn't sound like you, pick a different one — nothing here is locked.",
  },

  features: {
    narrationId: 'onboarding.features',
    script:
      "Here's what you just unlocked. Record a shot and get real form feedback. See where you stand with a verified grade. Follow a plan built from your own data. Take a quick look, then let's get started.",
  },

  // Role-aware finish. Everyone reaches this screen, including the roles that
  // skip the middle of the flow entirely.
  completePlayer: {
    narrationId: 'onboarding.complete-player',
    script:
      "You're set up. Everything from here is built around what you just told us, and it sharpens as you train. Your first workout is already picked out and waiting on your home screen. Go get to work.",
  },
  completeCoach: {
    narrationId: 'onboarding.complete-coach',
    script:
      "Your coaching hub is ready. Upload film, tag what you see, and it turns into scouting reports and game plans you can assign. Add athletes with an invite code whenever you're ready.",
  },
  completeScout: {
    narrationId: 'onboarding.complete-scout',
    script:
      "Your scouting toolkit is ready. Search verified high-school prospects, build a watchlist, and write reports. Remember that reaching an athlete goes through their guardian first.",
  },
  completeParent: {
    narrationId: 'onboarding.complete-parent',
    script:
      "You're all set. You'll see your athlete's training and progress here, and anyone who wants to connect with them comes through you first. Link to them with the invite code from their profile.",
  },
};

/** The right closing line for a role. Unknown roles get the player line. */
export const completionNarrationFor = (role) => {
  switch (role) {
    case 'coach':
      return ONBOARDING_NARRATION.completeCoach;
    case 'scout':
      return ONBOARDING_NARRATION.completeScout;
    case 'parent':
      return ONBOARDING_NARRATION.completeParent;
    default:
      return ONBOARDING_NARRATION.completePlayer;
  }
};
