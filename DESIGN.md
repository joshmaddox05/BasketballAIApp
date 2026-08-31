---
name: DBE HoopIQ
description: A dark burgundy athletic system for a basketball development platform that renders verdicts, not encouragement.
colors:
  ink: "#101013"
  surface: "#1C1C21"
  surface-raised: "#242427"
  burgundy: "#8A1C22"
  burgundy-pressed: "#6F161B"
  signal-rose: "#D4707A"
  steel: "#9AA0AC"
  text: "#E9E9ED"
  text-muted: "#B4B4BB"
  text-dim: "#7C7C86"
  hairline: "rgba(233, 233, 237, 0.12)"
  track: "rgba(233, 233, 237, 0.10)"
  attention-fill: "rgba(138, 28, 34, 0.14)"
  attention-border: "rgba(212, 112, 122, 0.28)"
  badge-fill: "rgba(138, 28, 34, 0.18)"
  avatar-fill: "rgba(212, 112, 122, 0.16)"
  steel-fill: "rgba(154, 160, 172, 0.16)"
  glow-fill: "rgba(212, 112, 122, 0.16)"
  spot-ring: "rgba(212, 112, 122, 0.5)"
  scrim: "rgba(6, 6, 8, 0.76)"
  shimmer: "rgba(255, 255, 255, 0.18)"
  success: "#6DD172"
  warning: "#FFB347"
  error: "#FF6B6B"
  info: "#5CB8FF"
typography:
  display:
    fontFamily: "Archivo_800ExtraBold"
    fontSize: "24px"
    lineHeight: "24px"
  headline:
    fontFamily: "Archivo_800ExtraBold"
    fontSize: "22px"
    lineHeight: "22px"
  headline-sub:
    fontFamily: "Archivo_800ExtraBold"
    fontSize: "17px"
  title:
    fontFamily: "Archivo_800ExtraBold"
    fontSize: "13.5px"
  title-row:
    fontFamily: "Figtree_700Bold"
    fontSize: "13.5px"
  body:
    fontFamily: "Figtree_400Regular"
    fontSize: "10.5px"
    lineHeight: "15px"
  body-large:
    fontFamily: "Figtree_400Regular"
    fontSize: "11.5px"
    lineHeight: "18px"
  label:
    fontFamily: "Figtree_700Bold"
    fontSize: "10.5px"
    letterSpacing: "1.4px"
  label-stat:
    fontFamily: "Figtree_700Bold"
    fontSize: "9.5px"
    letterSpacing: "1.1px"
  button:
    fontFamily: "Figtree_800ExtraBold"
    fontSize: "13.5px"
rounded:
  badge: "8px"
  icon-button: "10px"
  tile: "14px"
  card: "16px"
  hero: "18px"
  pill: "999px"
spacing:
  card-gap: "9px"
  grid-gap: "10px"
  label-gap: "10px"
  card-padding: "12px"
  hero-padding: "14px"
  section-gap: "18px"
  screen-padding: "20px"
components:
  button-primary:
    backgroundColor: "{colors.burgundy}"
    textColor: "#FFFFFF"
    typography: "{typography.button}"
    rounded: "{rounded.tile}"
    padding: "13px 16px"
  button-primary-disabled:
    backgroundColor: "#2E2E33"
    textColor: "#FFFFFF"
    rounded: "{rounded.tile}"
  button-outline:
    textColor: "{colors.text-muted}"
    rounded: "{rounded.tile}"
    padding: "13px 16px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.pill}"
    padding: "6px 11px"
  chip-active:
    backgroundColor: "{colors.burgundy}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "6px 11px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-padding}"
  row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-padding}"
  stat-tile:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-padding}"
  stat-tile-accent:
    backgroundColor: "{colors.attention-fill}"
    textColor: "{colors.signal-rose}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-padding}"
  header-icon-button:
    rounded: "{rounded.icon-button}"
    height: "34px"
    width: "34px"
  avatar:
    backgroundColor: "{colors.avatar-fill}"
    textColor: "{colors.signal-rose}"
    rounded: "{rounded.pill}"
    size: "38px"
---

# Design System: DBE HoopIQ

## Overview

**Creative North Star: "The Film Room"**

A dark room with the tape running. The interface is near-black and recedes on purpose, so
the only things that glow are the numbers, the rings, and the burgundy light falling on
what matters. Everything here is evidence being reviewed. The room does not have an
opinion about how you feel; it has the footage, and it plays it back.

The mood is **elite, institutional, and earned**. This is credentialed infrastructure for
a product whose entire claim is that its evaluation is authoritative — so the surfaces
carry the weight of a program with standards, not the friendliness of an app trying to be
liked. Type is tight and confident (Archivo carrying every number and heading, Figtree
doing all the talking). Density is high and deliberate: 10.5–13.5pt body sizes, 9–12pt
padding, hairline borders instead of separations. Color is rationed severely — one
burgundy voice, one steel counter-voice, and a great deal of dark.

The confirmed anti-reference is the **consumer social sports app**: bright multicolor
category tiles, playful rounded illustration, emoji-led empty states, badge showers. Also
rejected by implication is the gamified fitness idiom — confetti, streak flames, rainbow
progress rings. When this product tells an athlete something, it is a verdict, and the
visual system must never undercut that with applause.

**Key Characteristics:**

- Near-black room (`#101013`) with two tonal surface steps and no shadows outside the tour tooltip
- Exactly two color voices: burgundy for signal, steel for the neutral second opinion
- Archivo for every number and heading; Figtree for everything that is read as language
- Uppercase micro-labels with wide tracking (1.1–1.4) as the system's connective tissue
- Motion is measurement resolving — rings draw, bars fill, counts rise into place
- Depth comes from tone and hairlines, never from lift

## Colors

A severely rationed palette: one accent hue in two lightnesses, one neutral counter-voice,
and a deep tonal stack of near-blacks. Every tint in the system is composed from those
four values at fixed opacities — the system never introduces a new hue.

The **dark theme is normative**. The values in the frontmatter and below are the dark
reference set, which is where the system was designed. `src/utils/theme.js` also carries a
light theme: the same burgundy system re-contrasted for light backgrounds (near-white
surfaces, ink text, black-based hairlines). `getTheme(isDark)` resolves which one a screen
receives. When the two disagree, the dark value is the design intent and the light value is
a derivation.

### Primary

- **Dried Blood Burgundy** (`#8A1C22`): the system's only accent. It appears as *fill* —
  primary buttons, active chips, progress-bar fills, ring strokes, the badge dot, the
  loading spinner. On dark backgrounds it is deliberately too dark to read as text, and
  that is the point: it is a surface color, not a lettering color.
- **Burgundy Pressed** (`#6F161B`): the pressed state beneath a primary button. Never used
  as a resting fill.
- **Signal Rose** (`#D4707A`): burgundy raised into a readable lightness. This is accent
  *text and icons* on dark — section-label actions, accent stat numbers, the active tab
  tint, the tour progress pill, the "Top 12% regional" badge label. It is not a second
  brand color; it is the same voice made legible.

### Secondary

- **Gymnasium Steel** (`#9AA0AC`): the neutral second voice. Steel says *observed but not
  flagged* — "view only" tags, secondary bars, neutral avatars, a C grade. Its job is to
  be the alternative to burgundy that is not an alarm and not an absence.

### Neutral

- **Court-Dark Ink** (`#101013`): the room. Screen background and tab-bar background.
- **Surface** (`#1C1C21`): every card, row, and tile. The first step up out of the room.
- **Raised Surface** (`#242427`): the second and final step — tooltips, film thumbnails,
  spotlit tiles. There is no third step.
- **Text** (`#E9E9ED`): primary reading color.
- **Text Muted** (`#B4B4BB`): body copy and secondary labels.
- **Text Dim** (`#7C7C86`): meta, captions, and every uppercase section label.
- **Hairline** (`rgba(233, 233, 237, 0.12)`): all borders, dividers, outline buttons, the
  header rule, and the tab-bar top edge. One border value for the entire system.
- **Track** (`rgba(233, 233, 237, 0.10)`): progress-bar tracks and chart gridlines.

### Composed Tints

These are the only permitted derivations. Compose from them; do not invent new ones.

- `rgba(138, 28, 34, 0.14)` — attention/flagged card fill
- `rgba(138, 28, 34, 0.18)` — accent badge fill, empty-state icon square
- `rgba(212, 112, 122, 0.16)` — accent avatar fill, consent glow halo
- `rgba(212, 112, 122, 0.28)` — attention card border
- `rgba(154, 160, 172, 0.16)` — steel badge and neutral avatar fill
- Hero gradients: `['#8A1C22', '#4C0F14']` at 135° (module tiles) and `['#8A1C22',
  '#591116']` at 150° (the parent's child card), via `expo-linear-gradient` with
  `start={{x:0,y:0}} end={{x:1,y:1}}`

### Named Rules

**The Two Voices Rule.** Burgundy and steel are the entire chromatic vocabulary. Status
colors (`success`, `warning`, `error`, `info`) exist in the theme for system messaging —
validation, destructive confirmation, connectivity — and are never recruited for data
display, category coding, or emphasis.

**The Never A Rainbow Rule.** Grades and scores map to the two voices, never to a
red-yellow-green scale. A/B → Signal Rose on `badge-fill`; C → Gymnasium Steel on
`steel-fill`; anything lower or absent → Text Dim on `track`. This is implemented as
`gradeTone()` in `EvalRankScreen.js`; reuse it rather than re-deriving a mapping. A failing
grade is rendered as *dim*, not as *red* — the system reports, it does not scold.

**The Fill-Versus-Letter Rule.** `burgundy` fills; `signal-rose` letters. Burgundy text on
a dark surface fails contrast and reads as a bug. Any accent-colored text or icon on dark
uses `accentText` (Signal Rose), which is why that token exists separately from `primary`.

## Typography

**Display Font:** Archivo — `Archivo_800ExtraBold`, with `Archivo_700Bold` available
**Body Font:** Figtree — Regular 400 / Medium 500 / SemiBold 600 / Bold 700 / ExtraBold 800

Both load through `@expo-google-fonts` in `src/App.js`. Sizes below are React Native
unitless dp, written with `px` in the frontmatter because dp maps 1:1 to logical px at the
system's 393pt reference width (iPhone 15 Pro).

**Character:** Archivo is the scoreboard — condensed-feeling, extra-bold, used for every
number and every heading so that quantities read as declarations. Figtree is the voice —
neutral, highly legible at very small sizes, carrying all language including button labels.
The pairing is deliberately unromantic: nothing here is a serif, nothing is expressive, and
the personality comes from the weight contrast between an 800 Archivo number and an 11pt
Figtree caption sitting underneath it.

### Hierarchy

- **Display** (Archivo 800, 24 / lh 24): the big stat number — scores, counts, earnings.
  A medium variant at 21 exists for denser tile rows.
- **Headline** (Archivo 800, 22 / lh 22): top-level screen titles, with an optional 12pt
  Figtree Medium greeting 3dp beneath in Text Dim.
- **Headline Sub** (Archivo 800, 17): sub-screen titles, the variant paired with a back chevron.
- **Title** (Archivo 800, 13.5): card titles. **Title Row** (Figtree 700, 13.5) is the
  sibling used for list-row titles — rows are language, cards are objects.
- **Body** (Figtree 400, 10.5 / lh 15): card body copy. **Body Large** (Figtree 400, 11.5 /
  lh 18) for tooltips and any sustained reading.
- **Label** (Figtree 700, 10.5, tracking 1.4, UPPERCASE): section labels in Text Dim. This
  is the system's most recognizable typographic gesture.
- **Label Stat** (Figtree 700, 9.5, tracking 1.1, UPPERCASE): the caption under a stat number.
- **Button** (Figtree 800, 13.5): primary button labels, always `#FFFFFF`. Secondary
  buttons drop to Figtree 700 at 13 in Text Muted.

### Named Rules

**The Baked Weight Rule.** Never pair `fontWeight` with these families. Weight is carried
in the family name (`Figtree_700Bold`, not `Figtree` + `fontWeight: '700'`). Setting both
makes Android synthesize a second bold on top of the real one and the type renders
double-weighted. Compose from the `TYPE` presets in `src/utils/typography.js`; do not
assemble `fontFamily` + `fontSize` by hand.

**The Tracked Label Rule.** Every uppercase label in the system carries letter-spacing
between 1.1 and 1.4. Uppercase without tracking is not part of this system.

**The Archivo-Is-For-Numbers Rule.** If it is a quantity, a grade, or a heading, it is
Archivo. If it is a sentence, a label, or a button, it is Figtree. A number set in Figtree
reads as metadata; a sentence set in Archivo reads as a mistake.

## Layout

Single-column, portrait, phone-first, at a 393pt reference width. There is no tablet or
landscape layout, and the app is locked to portrait.

**Spatial rhythm.** Screen horizontal padding is 20. Sibling cards in a row sit 9 apart;
grids use 10. Vertical space between sections is 18, and a section label sits 10 above its
content. Card padding is 12 for rows and stat tiles, 14–16 for hero cards and tooltips.
These are the only spacing values in the system — the density is tight on purpose, and
loosening it is the fastest way to make a screen stop looking like this product.

**Screen skeleton.** Every screen is `SafeAreaView` → `ScreenHeader` → `ScrollView`. The
header is a title block plus up to two trailing 34×34 icon buttons, `paddingVertical: 10`,
closed by a 1dp hairline bottom border. Content below scrolls; the header does not
collapse or transform.

**Section pattern.** Content is organized as: uppercase `SectionLabel` (with an optional
Signal Rose text action on the right) → a surface card or a card stack → 18 of air → the
next label. Two-up stat tiles use `flex: 1` with a 10 gap. The module hub is a 2-column
wrapped grid at 48% width with 12 vertical spacing.

**Tab bar.** 66 tall, four or fewer items, a 1dp hairline top border, 20dp icon over a
Figtree SemiBold 9 label. Active tint is Signal Rose; inactive is Text Dim. All four role
navigators share `dbeTabBarOptions(theme)` — there is one tab bar in this product, not four.

### Named Rules

**The Twenty-Twenty Rule.** Screen content lives inside 20dp horizontal padding. Full-bleed
elements are the exception and must earn it — currently only the header hairline and the
tab bar cross that line.

## Elevation & Depth

**This system is flat by doctrine.** Depth is built from three stacked tones — room
(`#101013`), surface (`#1C1C21`), raised surface (`#242427`) — separated by 12%-opacity
hairlines. There are no ambient shadows, no elevation ramps, and no glassmorphism anywhere
in the DBE kit. A card is distinguished from the background because it is lighter, not
because it floats.

### Shadow Vocabulary

One shadow exists in the entire system:

- **Tour tooltip** (`shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20,
  shadowOffset: { width: 0, height: 18 }, elevation: 12`): used only on the onboarding
  tour tooltip, which must read as physically above a 76%-opacity scrim. Nothing else in
  the product gets a shadow.

### Named Rules

**The One Shadow Rule.** The tour tooltip is the only shadowed surface in the product. If a
new component seems to need elevation, it needs a tone step or a hairline instead. Note
that roughly 154 call sites in older, pre-redesign screens still carry `shadowOpacity` /
`elevation` — that is documented drift from before the burgundy system landed, not
precedent to copy.

**The Two Steps Rule.** There are exactly two surface levels above the room. A tooltip on a
card on a background is the deepest legal stack. Nesting a third tonal step means the
hierarchy is wrong, not that the palette is short a value.

## Shapes

Soft, generous, consistently rounded — the geometry is calm so the data can be sharp. The
radius scale is small and fully enumerated: small badges 8, header icon buttons 10, tiles
and buttons 14, cards 16, large hero cards 18, pills 999, avatars exactly half their size.

Borders are always 1dp and always `hairline`. There is no thick border, no double border,
and no colored border except `attention-border` on a flagged card. Outline buttons are
defined entirely by that hairline — they have no background at all.

Recurring silhouettes: the **rounded square** (a 64×64 icon well at radius 16 in
`badge-fill`, used for every empty state), the **pill** (chips, the active tour dot at
16×5, the home-indicator strip at 120×4), and the **ring** (an 84–86dp circular progress
gauge with a 7dp stroke and round line caps, which is the closest thing this system has to
a logo).

### Named Rules

**The Enumerated Radius Rule.** Six radii exist: 8, 10, 14, 16, 18, 999. A new value is not
a design decision, it is drift. Use `SHAPE` from `src/utils/typography.js`.

## Components

Components are **machined and weightless**. They sit *in* the dark rather than *on* it:
flat fills, hairline edges, generous radii, zero shadow. Precision without bulk. Every one
of them lives in `src/components/dbe/` — compose from that kit rather than restyling from
scratch.

### Buttons

Two voices only. There is no tertiary, no destructive, and no icon-only button variant.

- **Shape:** rounded rectangle at tile radius (14), `paddingVertical: 13`, full-width by
  default, with a 7dp gap to an optional leading 16dp Ionicon.
- **Primary:** Dried Blood Burgundy fill, `#FFFFFF` label in Figtree ExtraBold 13.5. The
  icon is white too. Disabled swaps the fill to `#2E2E33` and keeps the white label.
- **Outline:** no fill at all — a 1dp hairline border, Text Muted label in Figtree Bold 13,
  Text Muted icon.
- **Press:** `activeOpacity: 0.85`. No scale, no shadow, no color animation.

**The Approve-Right Rule.** In any consequential pair, the affirmative action is the solid
primary and sits on the right; the negative action is the outline and sits on the left.
Deny/Cancel is never a second solid button, and never red. This originates in the parent
consent card, where two solid buttons would make denial feel equally endorsed, and it holds
system-wide.

### Chips

- **Style:** pill radius, `paddingHorizontal: 11 / paddingVertical: 6` (8/3 for the small
  variant), Figtree Bold at 10 (or 9 small).
- **Inactive:** surface fill with a 1dp hairline border, Text Muted label.
- **Active:** solid burgundy fill, no border, `#FFFFFF` label.
- Chips enter with `chipPop` — a spring from 0.82 scale, staggered 80ms across a row.

### Cards / Containers

- **Corner style:** 16 for standard cards, 18 for hero cards.
- **Background:** `surface`. Raised or spotlit variants use `surface-raised`.
- **Shadow strategy:** none. See Elevation & Depth.
- **Border:** 1dp hairline when the card needs definition against a busy stack; omitted on
  simple stat tiles, where the tone step is sufficient.
- **Internal padding:** 12 standard, 16 for hero and content-dense cards.
- **Attention variant:** `attention-fill` background with a 1dp `attention-border` and
  Signal Rose text. This is the system's only "flagged" treatment.

### Rows

The workhorse. A surface card at radius 16 and padding 12, laid out as `[leading] [title +
meta] [trailing]` with an 11dp gap. Title is Figtree Bold 13.5 in Text; meta is Figtree
Regular 11 in Text Dim, 2dp beneath. Both are single-line and truncate. The leading slot is
usually an Avatar; the trailing slot is a chip, a chevron, or a small stat.

### Stat Tiles

Big Archivo number over an uppercase tracked caption, 5dp apart, in a flex-1 surface card.
The accent variant flips the background to `attention-fill`, adds the `attention-border`,
and turns both the number and the caption Signal Rose. Tiles enter as a staggered
`cardIn` sequence at 80ms intervals.

### Avatars

Initials on a tinted disc, radius = half the size, default 38dp. Two tones only: `accent`
(Signal Rose letters on `avatar-fill`) and `steel` (Gymnasium Steel letters on
`steel-fill`). The letter is Figtree ExtraBold at 33% of the disc size. There are no
photographic avatars in the DBE surfaces.

### Section Labels

Uppercase Figtree Bold 10.5 at 1.4 tracking in Text Dim, with an optional right-aligned
text action in Signal Rose at 11. Always 10dp above its content. This element does more
structural work than any container in the system.

### Empty & Loading States

- **Empty:** a 64×64 rounded square (radius 16) in `badge-fill` holding a 28dp Signal Rose
  Ionicon, then an Archivo 16 title, then a Figtree 11.5 subtitle in Text Dim, then exactly
  one full-width primary CTA. Centered, 44dp vertical padding. Empty states are restyled,
  never removed.
- **Loading:** a centered large `ActivityIndicator` in burgundy. Nothing else.

### Signature Component: The Ring

`RingProgress` is the system's emblem — an 84–86dp SVG circle, 7dp stroke, round caps,
rotated −90° so it starts at twelve o'clock, drawing its `strokeDashoffset` to target over
1250ms on `Easing.out(Easing.cubic)`. The center holds an Archivo 26 grade letter, colored
by `gradeTone()`. It appears wherever the product renders a verdict: the EvalRank overall
grade, ShotDNA scores, the scout's prospect evaluation. When a ring draws, the product is
delivering its judgment.

### Motion

Motion is **evidence arriving**, not applause. The full vocabulary lives in
`src/components/dbe/motion.js`, `Pulse.js`, `Rings.js`, and `Shimmer.js`; default easing is
`Easing.out(Easing.cubic)` and every entrance runs once on mount.

Entrances: `cardIn` (translateY 16→0, 450ms), `slideIn` (translateX −16→0, 500ms), `up`
(translateY 18→0, 500ms), `cellIn` (translateY 10→0 + scale 0.95→1, 400ms), `chipPop`
(spring from 0.82), `pop` (spring from 0.9), `count` (translateY 7→0, 500ms, wrapping a
number). Stagger siblings at 80–120ms.

Loops: `Float` (translateY 0→−5→0, 2400ms), `Shimmer` (a 50dp light band sweeping a tile
at 8°, 3600ms), `PulseHalo` (scale 1→2.2, opacity 0.55→0, 1900ms), `ConsentGlow` (radius
16 halo, 2800ms), the tour spotlight ring (2400–2600ms).

Draws: `BarFill` (900–1100ms, left-anchored scaleX so it stays on the native driver),
`RingProgress` (1250ms), `DrawnPath` / `Sparkline` (1600ms).

**The Motion Intent Rule.** Motion is assigned by *moment*, not by role. Measurement
surfaces — EvalRank, ShotDNA, progress reports, prospect evaluations — stay evidentiary for
every role: things draw, fill, and count into place, and nothing bounces. Completion
moments — finishing a workout, clearing a gate, hitting a milestone — may celebrate for
every role. Beyond that, each role has a standing register worth preserving: the coach's
attention dots pulse only on athletes below 50% adherence and nothing else celebrates; the
scout's "new since last visit" rows are the only ones that animate in; and on parent
surfaces the consent card is the single pulsing element on the screen.

## Do's and Don'ts

### Do:

- **Do** compose from `src/components/dbe/` and the `TYPE` / `SHAPE` presets in
  `src/utils/typography.js`. Every value in this document already exists there.
- **Do** read colors from the theme object (`theme.surface`, `theme.accentText`,
  `theme.hairline`) so screens work in both appearances.
- **Do** use `accentText` for any accent-colored text or icon, and `primary` only for fills.
- **Do** route grade and score coloring through `gradeTone()` — Signal Rose for A/B, steel
  for C, dim for everything below.
- **Do** keep uppercase labels tracked at 1.1–1.4 and dim.
- **Do** put the affirmative action on the right as the solid primary and the negative on
  the left as the outline.
- **Do** stagger sibling entrances at 80–120ms; a whole screen arriving at once looks broken.
- **Do** verify new screens at 393pt width, in both light and dark.

### Don't:

- **Don't** pair `fontWeight` with Archivo or Figtree. The weight is in the family name and
  Android will double-bold it.
- **Don't** add a shadow. The tour tooltip is the only shadowed surface in the product.
- **Don't** introduce a new hue. If something needs to be distinguished, use burgundy,
  steel, or a tone step — status colors are for system messaging only.
- **Don't** color a failing grade red. Low grades render dim; the system reports rather than
  scolds.
- **Don't** invent a radius or a spacing value outside the enumerated scales.
- **Don't** put burgundy `#8A1C22` on dark as text — it fails contrast. That is what Signal
  Rose is for.
- **Don't** ship two solid buttons in a consequential pair.
- **Don't** add confetti, streak flames, badge showers, rainbow rings, emoji-led empty
  states, or multicolor category tiles. That is the confirmed anti-reference.
- **Don't** treat the ~49 swept legacy screens (hard-coded burgundy hex, `fontWeight`,
  shadows) or `ModuleGrid.js` (per-module accent colors, raw `fontSize`/`fontWeight`) as
  precedent. They are documented drift awaiting tokenization, not examples to follow.
