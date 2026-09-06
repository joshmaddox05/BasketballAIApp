// moduleIntros.js — the first-open explainer for each DBE module.
//
// Keyed by the same module key as MODULE_META in roleModules.js, so the two stay
// in lockstep without duplicating the module list. Kept in its own file because
// this is copy, and mixing several screens' worth of prose into the module
// registry would bury the registry.
//
// SHAPE
//   videoUrl  when set, the intro plays that video instead of the card sequence.
//             Producing a video later is therefore a copy edit, not a code change.
//   steps     3 cards: what it is / what it does for you / how to use it.
//   script    the spoken line for a card, authored separately from the on-screen
//             body — see the narration note in tourConfig.js.
//
// A module with no entry here simply opens without an intro.

export const MODULE_INTROS = {
  Blueprint360: {
    headline: 'Your plan, built from your own numbers',
    videoUrl: null,
    steps: [
      {
        icon: 'map-outline',
        title: 'What Blueprint360 is',
        body: 'Built from your evaluation, not a template.',
        narrationId: 'intro.blueprint360.1',
        script: 'Blueprint360 is your training plan, generated from your own evaluation rather than picked off a shelf.',
      },
      {
        icon: 'trending-up-outline',
        title: 'What it does for you',
        body: 'Weeks laid out day by day, weighted to your gaps.',
        narrationId: 'intro.blueprint360.2',
        script: 'It lays out your weeks day by day, leaning into your weakest areas and anything that has not been measured yet.',
      },
      {
        icon: 'checkmark-circle-outline',
        title: 'How to use it',
        body: 'Do today’s session. It credits itself.',
        narrationId: 'intro.blueprint360.3',
        script: 'Just do the session it puts in front of you. Finishing it credits the day and feeds straight back into your next evaluation.',
      },
    ],
  },

  EvalRank: {
    headline: 'An honest read on where you stand',
    videoUrl: null,
    steps: [
      {
        icon: 'stats-chart',
        title: 'What EvalRank is',
        body: 'Your grade across skill, shooting, IQ and athleticism.',
        narrationId: 'intro.evalrank.1',
        script: 'EvalRank is your grade across four pillars — skill, shooting, basketball I Q, and athleticism.',
      },
      {
        icon: 'eye-off-outline',
        title: 'It never guesses',
        body: 'Unmeasured shows as unmeasured — never as a zero.',
        narrationId: 'intro.evalrank.2',
        script: 'It never guesses. Anything nobody has measured shows as unmeasured, not as a zero and not as a failure.',
      },
      {
        icon: 'flag-outline',
        title: 'How to move it',
        body: 'Each pillar names the drill that fills it.',
        narrationId: 'intro.evalrank.3',
        script: 'Each pillar tells you exactly which drill produces its missing input. Log that work and your grade updates itself.',
      },
    ],
  },

  ShotDNA: {
    headline: 'Your shot, broken down',
    videoUrl: null,
    steps: [
      {
        icon: 'scan-outline',
        title: 'What ShotDNA is',
        body: 'Release, footwork, arc and balance, from your video.',
        narrationId: 'intro.shotdna.1',
        script: 'ShotDNA breaks down your shooting mechanics — your release, footwork, arc and balance.',
      },
      {
        icon: 'videocam-outline',
        title: 'What it does for you',
        body: 'See what you can currently only feel.',
        narrationId: 'intro.shotdna.2',
        script: 'It turns something you can only feel into something you can actually see, and compare over time.',
      },
      {
        icon: 'repeat-outline',
        title: 'How to use it',
        body: 'Record a set. Repeat it in a few weeks.',
        narrationId: 'intro.shotdna.3',
        script: 'Record a set of shots from a fixed angle, then record the same set again after a few weeks of work.',
      },
    ],
  },

  SimCoach: {
    headline: 'Train the decision, not just the shot',
    videoUrl: null,
    steps: [
      {
        icon: 'game-controller-outline',
        title: 'What SimCoach is',
        body: 'Whiteboard reps, on your phone.',
        narrationId: 'intro.simcoach.1',
        script: 'SimCoach gives you game situations to read and respond to — whiteboard reps, on your phone.',
      },
      {
        icon: 'bulb-outline',
        title: 'What it does for you',
        body: 'The only place your IQ gets measured.',
        narrationId: 'intro.simcoach.2',
        script: 'Basketball I Q is a quarter of your EvalRank grade, and this is the only place it gets measured.',
      },
      {
        icon: 'people-outline',
        title: 'How to use it',
        body: 'Commit to a read, then see why.',
        narrationId: 'intro.simcoach.3',
        script: 'Work through a scenario, commit to your read, then see the explanation. Your coach can send you their own game plans here too.',
      },
    ],
  },

  ScoutLab: {
    headline: 'How scouts actually find you',
    videoUrl: null,
    steps: [
      {
        icon: 'search-outline',
        title: 'What ScoutLab is',
        body: 'Whether scouts can find you, and what they see.',
        narrationId: 'intro.scoutlab.1',
        script: 'ScoutLab is your recruiting visibility — whether scouts can find you, and what they see when they do.',
      },
      {
        icon: 'shield-checkmark-outline',
        title: 'Nothing happens without consent',
        body: 'Your guardian approves every scout, one by one.',
        narrationId: 'intro.scoutlab.2',
        script: 'Nothing happens without consent. Your guardian approves every scout individually.',
      },
      {
        icon: 'lock-open-outline',
        title: 'How to open doors',
        body: 'Earned through measured work, not posting.',
        narrationId: 'intro.scoutlab.3',
        script: 'Exposure is earned through measured work, not through posting. Clear the gates and your profile unlocks itself.',
      },
    ],
  },

  ScoutLabSearch: {
    headline: 'Find prospects who consented to be found',
    videoUrl: null,
    steps: [
      {
        icon: 'search-outline',
        title: 'What this is',
        body: 'High-school athletes whose guardians opted in.',
        narrationId: 'intro.scoutsearch.1',
        script: 'This is a directory of high school athletes whose guardians opted them in. Everyone listed here chose to be.',
      },
      {
        icon: 'funnel-outline',
        title: 'What it does for you',
        body: 'Filter, then save the search for alerts.',
        narrationId: 'intro.scoutsearch.2',
        script: 'Filter by position, grade, region and platform grade, then save the search to be alerted when a new match appears.',
      },
      {
        icon: 'key-outline',
        title: 'How access works',
        body: 'Request access; the guardian decides.',
        narrationId: 'intro.scoutsearch.3',
        script: 'Public profiles are deliberately thin. Request access, and the athlete’s guardian decides. You will be told either way.',
      },
    ],
  },

  ScoutReports: {
    headline: 'Your evaluations, on one rubric',
    videoUrl: null,
    steps: [
      {
        icon: 'document-text-outline',
        title: 'What reports are',
        body: 'Your evaluations, on one shared rubric.',
        narrationId: 'intro.scoutreports.1',
        script: 'Reports are your own written evaluations, on a standard rubric so they stay comparable across your organisation.',
      },
      {
        icon: 'git-compare-outline',
        title: 'Yours is separate from the platform grade',
        body: 'Your grade never overwrites the platform’s.',
        narrationId: 'intro.scoutreports.2',
        script: 'The platform ranking stays authoritative. Your grade is your own read, and it never overwrites it.',
      },
      {
        icon: 'time-outline',
        title: 'How to use it',
        body: 'Write one per viewing. The trail is the value.',
        narrationId: 'intro.scoutreports.3',
        script: 'Write one after every viewing. The value is in the trail — what you thought then, against what happened since.',
      },
    ],
  },

  ParentScoutLab: {
    headline: 'You hold the keys',
    videoUrl: null,
    steps: [
      {
        icon: 'megaphone-outline',
        title: 'What this is',
        body: 'Nothing is shared until you allow it.',
        narrationId: 'intro.parentscout.1',
        script: 'This is your control room for your athlete’s recruiting visibility. Nothing is shared until you allow it.',
      },
      {
        icon: 'toggle-outline',
        title: 'What you control',
        body: 'Control visibility, categories and each scout.',
        narrationId: 'intro.parentscout.2',
        script: 'You control whether scouts can find them at all, which categories are shared, and which individual scouts get access.',
      },
      {
        icon: 'shield-outline',
        title: 'Everything is logged',
        body: 'Every decision is logged. Revoke any time.',
        narrationId: 'intro.parentscout.3',
        script: 'Every approval, denial and revoke is timestamped, and you can withdraw a scout’s access at any time.',
      },
    ],
  },

  CoachMarket: {
    headline: 'Coaching worth paying for',
    videoUrl: null,
    steps: [
      {
        icon: 'storefront-outline',
        title: 'What CoachMarket is',
        body: 'Drills and series from real coaches, with video.',
        narrationId: 'intro.coachmarket.1',
        script: 'CoachMarket is drills and training series published by real coaches, with video and coaching points.',
      },
      {
        icon: 'pricetag-outline',
        title: 'How pricing works',
        body: 'Single drills capped at $5. Series priced by the coach.',
        narrationId: 'intro.coachmarket.2',
        script: 'Single drills are capped at five dollars. Series are priced by the coach who made them.',
      },
      {
        icon: 'download-outline',
        title: 'What you get',
        body: 'What you buy stays yours.',
        narrationId: 'intro.coachmarket.3',
        script: 'Anything you buy stays yours, and you can open it any time from your library.',
      },
    ],
  },

  HoopCommunity: {
    headline: 'Work is easier with other people',
    videoUrl: null,
    steps: [
      {
        icon: 'people-outline',
        title: 'What HoopCommunity is',
        body: 'Challenges, streaks, and who you train alongside.',
        narrationId: 'intro.hoopcommunity.1',
        script: 'HoopCommunity is challenges, streaks, and the people you train alongside.',
      },
      {
        icon: 'flame-outline',
        title: 'What it does for you',
        body: 'A reason to pick up a ball on light days.',
        narrationId: 'intro.hoopcommunity.2',
        script: 'Daily challenges give you a reason to pick up a ball on the days your plan is light.',
      },
      {
        icon: 'trophy-outline',
        title: 'How to use it',
        body: 'Join in, keep the streak, see where you stand.',
        narrationId: 'intro.hoopcommunity.3',
        script: 'Join a challenge, keep your streak alive, and see how your work stacks up against people at your level.',
      },
    ],
  },

  LegacyVault: {
    headline: 'The reasoning behind the work',
    videoUrl: null,
    steps: [
      {
        icon: 'library-outline',
        title: 'What LegacyVault is',
        body: 'Why the drills are built the way they are.',
        narrationId: 'intro.legacyvault.1',
        script: 'LegacyVault is the knowledge library — why the drills are built the way they are.',
      },
      {
        icon: 'book-outline',
        title: 'What it does for you',
        body: 'Knowing why is most of real training.',
        narrationId: 'intro.legacyvault.2',
        script: 'Understanding why you are doing something is most of what separates a rep from real training.',
      },
      {
        icon: 'bookmark-outline',
        title: 'How to use it',
        body: 'Ten minutes on this week’s focus.',
        narrationId: 'intro.legacyvault.3',
        script: 'Read the entry for whatever your plan has you working on this week. Ten minutes is enough.',
      },
    ],
  },
};

/**
 * The intro for a module, or null when it has none.
 * @param {string} moduleKey a MODULE_META key
 */
export const getModuleIntro = (moduleKey) => MODULE_INTROS[moduleKey] || null;

/** AsyncStorage key marking a module's intro as seen. */
export const introSeenKey = (moduleKey) => `seenModuleIntro:${moduleKey}`;
