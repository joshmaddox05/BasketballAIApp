# 003 — Adopt the shared EmptyState primitive on seven screens

- **Status**: DONE (executed 2026-08-29; see Post-execution note)
- **Commit**: 417e91a
- **Severity**: LOW
- **Category**: Cohesion & tokens
- **Estimated scope**: 7 files, one mechanical replacement each

> **Read this first.** The motion in this plan is a *side effect*, not the work. The
> shared `EmptyState` primitive already carries a staggered entrance; the task is
> consolidation, and the animation arrives free with it. Do not author any new motion.

## Problem

`src/components/dbe/primitives.js:360` exports `EmptyState`, which renders a burgundy
icon well, an Archivo title, a dim subtitle and one primary CTA — with a staggered
entrance (`Entrance variant="pop"` → `variant="up" delay={90}` → `variant="chipPop"
delay={180}`). Roughly 25 screens use it.

Seven screens hand-roll the same composition instead, and therefore render flat. They
also each carry their own near-identical `styles.emptyState` / `emptyTitle` /
`emptySub` block, which is duplicated styling the system already owns.

Example, `src/screens/main/ScoutWatchlistScreen.js:102–108` — verbatim:

```jsx
          <View style={styles.emptyState}>
            <Ionicons name="bookmark-outline" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No saved prospects</Text>
            <Text style={[styles.emptySub, { color: theme.textSecondary }]}>Use Prospect Search to find and save athletes to your watchlist.</Text>
            <TouchableOpacity style={[styles.searchBtn, { backgroundColor: theme.primary }]} onPress={() => navigation.navigate('ScoutLabSearch')}>
              <Text style={styles.searchBtnText}>Search Prospects</Text>
            </TouchableOpacity>
          </View>
```

That is exactly `EmptyState`'s API, spelled out longhand.

## Target

Each of the seven blocks becomes one `EmptyState` call. **All copy is preserved
verbatim** — this plan never rewrites a user-facing string.

`EmptyState` signature (`src/components/dbe/primitives.js:360`):

```js
EmptyState({ icon = 'basketball-outline', title, sub, ctaLabel, onPress, style })
```

Per-file mapping — use these exact values:

| # | File | `icon` | `title` | `sub` | `ctaLabel` | `onPress` |
|---|---|---|---|---|---|---|
| 1 | `ScoutWatchlistScreen.js:102` | `bookmark-outline` | `No saved prospects` | `Use Prospect Search to find and save athletes to your watchlist.` | `Search Prospects` | `() => navigation.navigate('ScoutLabSearch')` |
| 2 | `HomeScreen.js:274` | `basketball-outline` | `No completed workouts yet` | `Start with Beginner Shooting Basics to build your foundation.` | `Browse Workouts` | `onPress` (the existing prop, unchanged) |
| 3 | `SimCoachFilmLibraryScreen.js:342` | `videocam-outline` | `No films yet` | `Upload game film to start building game plans for your athletes.` | `Upload Film` | `handlePickVideo` |
| 4 | `TrainingCategoryScreen.js:268` | `getCategoryIcon()` | `No Workouts Available` | `` `There are currently no ${category.toLowerCase()} workouts available. Check back later or explore other categories.` `` | `Explore Categories` | `() => navigation.goBack()` |
| 5 | `MentorshipScreen.js:236` | `people-outline` | `No Mentors Yet` | `Connect with coaches and pro players to get personalized guidance for your game.` | `Browse Mentors` | `() => setActiveTab('Find Mentors')` |
| 6 | `ShootingHistoryScreen.js:307` | `basketball-outline` | `No Shooting Sessions Yet` | `Complete shooting workouts to see your history here.` | *(omit — no CTA today)* | *(omit)* |
| 7 | `ShotDNAHistoryScreen.js:139` | `search-outline` | `No analyses found` | `Try a different filter or record your first shot analysis.` | *(omit — no CTA today)* | *(omit)* |

**Row 4 also needs `style={{ flex: 1, justifyContent: 'center' }}`.** It is the only one of
the seven that occupies the slot a filling `FlatList` would otherwise hold, and its old
`emptyState` key carried `flex: 1, justifyContent: 'center'`. Without it the block
collapses to content height at the top of an otherwise empty screen. The other six sit in
normal document flow and need no `style`.

Row 4's `sub` is a template literal in the current code spanning two source lines; join
it into a single template literal with one space where the line break was. Do not change
the words.

Rows 6 and 7 have no CTA today. **Do not invent one.** Omit `ctaLabel` and `onPress`;
`EmptyState` already renders nothing for them.

## Repo conventions to follow

- Import: `import { EmptyState } from '../../components/dbe';` from files in
  `src/screens/main/`. Several of these files already import from `'../../components/dbe'`
  — if so, add `EmptyState` to the existing import rather than adding a second one.
- **Exemplar to imitate**: `src/screens/main/HoopCommunityScreen.js` already imports and
  uses `EmptyState` from the kit in exactly this way.
- Icon sizes differ today (40/44/48/60). `EmptyState` renders its icon at a fixed 28dp
  inside a 64×64 well. That normalisation is intended — do not try to preserve the old
  sizes.
- **Losing the container chrome is also intended.** Four of these blocks sit in a card
  today (`HomeScreen` bordered card, `ShotDNAHistoryScreen` dashed-border box,
  `ShootingHistoryScreen` filled card). `DESIGN.md` specifies the empty state as *centred
  content with 44dp vertical padding* — not a card — so the chrome was the drift and
  dropping it is the point. Do not reintroduce it via `style`.
  **Placement is a different matter from chrome**: where the old style carried `flex` or
  `justifyContent`, that must be preserved through the `style` prop. See row 4.
- Colours: `EmptyState` reads theme internally. Drop the `{ color: theme.textSecondary }`
  overrides; do not pass colour props (there are none).

## Steps

For each of the seven rows in the table above, in order:

1. Add `EmptyState` to that file's `components/dbe` import (or add the import if absent).
2. Replace the whole `<View style={…styles.emptyState…}> … </View>` block — icon, texts,
   and CTA `TouchableOpacity` inclusive — with a single `<EmptyState … />` using the
   exact props from the table.
3. Delete the style keys that the replacement orphans **in that file only**, and only if
   a repo-wide check shows they are now unreferenced. For each candidate key run:
   ```bash
   grep -c 'styles\.<keyName>\b' <that file>
   ```
   Delete only when the count is `0`. Typical orphans: `emptyState`, `emptyTitle`,
   `emptySub`, `emptySubtitle`, `emptyText`, `emptyStateTitle`, `emptyStateDescription`,
   `searchBtn`, `searchBtnText`, `emptyBtn`, `emptyBtnText`, `emptyUploadBtn`,
   `emptyUploadText`, `exploreButton`, `exploreButtonText`, `emptyAction`,
   `emptyActionText`, `emptyIconWrap`.
   **Some of these keys are used by other blocks in the same file** — the grep is what
   decides, not the name.

## Boundaries

- Touch **only** these seven files. Nothing else.
- Do **NOT** modify `src/components/dbe/primitives.js`. `EmptyState` is correct as-is.
- Do **NOT** change any user-facing string. Copy is preserved verbatim, including
  capitalisation and punctuation.
- Do **NOT** add a CTA to rows 6 and 7.
- Do **NOT** author any new animation. The entrance comes from the primitive.
- Do **NOT** migrate the other empty states in this repo. Specifically **excluded**, with
  reason:
  - `ConnectionsScreen.js:169`, `SimCoachScreen.js:105`, `AchievementsScreen.js:289`,
    `AllChallengesScreen.js:1058`, `SimCoachFilmTaggingScreen.js:289` — these render an
    icon plus **one combined sentence** with no separate title. Mapping them onto
    `EmptyState`'s `title` + `sub` requires splitting the copy, which is a writing
    decision, not an execution step. Leave them alone.
  - `CoachPublicProfileScreen.js` — no `styles.emptyState` block; different shape.
  - `TrainingScreen.js:444` — text only, no icon.
- Do **NOT** add dependencies.
- If a cited block does not match the excerpt, **STOP and report**. The working tree is
  dirty relative to `417e91a`; line numbers here were written against the **working
  tree**, so verify against the file on disk.

## Verification

- **Mechanical**:
  - Parse check each of the seven files — expect `PARSE OK` for all:
    ```bash
    for f in src/screens/main/ScoutWatchlistScreen.js src/screens/main/HomeScreen.js \
             src/screens/main/SimCoachFilmLibraryScreen.js src/screens/main/TrainingCategoryScreen.js \
             src/screens/main/MentorshipScreen.js src/screens/main/ShootingHistoryScreen.js \
             src/screens/main/ShotDNAHistoryScreen.js; do
      node -e "const b=require('@babel/core');const f='$f';
      try{b.transformSync(require('fs').readFileSync(f,'utf8'),{filename:require('path').resolve(f),configFile:'./babel.config.js',caller:{name:'metro',platform:'ios',isDev:true,supportsStaticESM:true}});console.log('PARSE OK  ','$f')}catch(e){console.log('FAIL','$f',e.message.split('\n')[0])}"
    done
    ```
  - Expect `7`:
    ```bash
    grep -l '<EmptyState' src/screens/main/ScoutWatchlistScreen.js src/screens/main/HomeScreen.js src/screens/main/SimCoachFilmLibraryScreen.js src/screens/main/TrainingCategoryScreen.js src/screens/main/MentorshipScreen.js src/screens/main/ShootingHistoryScreen.js src/screens/main/ShotDNAHistoryScreen.js | wc -l
    ```
  - No orphaned style references in any touched file (expect no output):
    ```bash
    python3 - <<'PY'
    import re
    for p in ['src/screens/main/ScoutWatchlistScreen.js','src/screens/main/HomeScreen.js',
              'src/screens/main/SimCoachFilmLibraryScreen.js','src/screens/main/TrainingCategoryScreen.js',
              'src/screens/main/MentorshipScreen.js','src/screens/main/ShootingHistoryScreen.js',
              'src/screens/main/ShotDNAHistoryScreen.js']:
        s=open(p).read()
        used=set(re.findall(r'styles\.([A-Za-z0-9_]+)',s))
        b=s[s.find('StyleSheet.create('):]
        defined=set(re.findall(r'^\s{2,4}([A-Za-z0-9_]+):\s',b,flags=re.M))
        miss=used-defined
        if miss: print(p,'MISSING',sorted(miss))
    PY
    ```
  - Bundle — expect exit 0:
    ```bash
    npx expo export --platform ios --output-dir /tmp/verify-003 --no-minify
    ```

- **Feel check**: each empty state needs its *empty* condition, which is often not the
  account's real state. The two cheapest to reach are `ShotDNAHistoryScreen` (apply a
  filter that matches nothing) and `ScoutWatchlistScreen` (a scout account with an empty
  watchlist). On at least one of them confirm:
  - the icon well pops in first, then the title/subtitle rise, then the CTA — three
    beats, not one;
  - the copy is character-for-character what it was before;
  - with **Reduce Motion** on, the three parts fade in without moving.
  For the remaining five, a static screenshot showing the burgundy icon well and correct
  copy is sufficient — the entrance is the primitive's and is verified once.

- **Done when**: all seven parse; `<EmptyState` appears in all seven; no missing style
  keys; the bundle succeeds; and no user-facing string changed
  (`git diff` shows no altered text content beyond prop reshaping).


---

## Post-execution note (author, after review)

Executed on 2026-08-29. All seven migrated; parse, `<EmptyState` count (7) and the
orphaned-style check all passed.

**One defect in this plan surfaced during execution** and is corrected above: the table
omitted `style` for row 4. `TrainingCategoryScreen`'s empty state occupies the slot its
`FlatList` would otherwise fill, and its old `emptyState` style carried
`flex: 1, justifyContent: 'center'`. Deleting that key per step 3 collapsed the block to
content height at the top of an empty screen.

The executor followed the table as written — correctly — and flagged the loss rather than
silently improvising a `style` prop. The three *other* container losses it flagged
(HomeScreen's card, ShotDNAHistory's dashed box, ShootingHistory's card fill) are
**intended**, per the clarified convention above.
