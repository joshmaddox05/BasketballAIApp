// ModuleGrid.js - DBE module cards for a role's home.
//
// This is the app's primary surface for the player and the parent: the modules-first
// IA means the hub *is* the home. It used to render every module as the same
// icon-heading-description card, so eight equal tiles said nothing about which one you
// should open — and it carried no data at all, while the scout and coach homes (which
// hand-roll their own module sections) already led with a hero tile and fed each cell a
// live subtitle. The grid was the one primary surface opting out of the system's
// strongest moves. Now:
//
//   • one LEAD module on a HeroTile — the first unlocked module in the role's ordered
//     list, which ROLE_MODULES already orders deliberately ("fold hosts lead")
//   • the rest as a quieter 2-up field, so the section has a peak and a catalog rather
//     than one flat mat
//   • `subtitleFor` lets the caller supply truth ("3 drills assigned") in place of the
//     static description — the same escape hatch ScoutHomeScreen invented
//   • the gate states itself: locked modules read in the steel voice with an explicit
//     PRO chip, because the interface has to make the gate and its reason legible
//     rather than hiding a dead end
//
// COLOUR: two voices only — accent when the module is yours, steel when it is gated.
// Modules used to carry a per-module hue each, producing a nine-colour rainbow of
// category tiles: the design system's named anti-reference. Icon and label do the
// distinguishing.
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { canAccessFeature } from '../../utils/subscription';
import { TYPE, SHAPE } from '../../utils/typography';
import { Entrance, HeroTile, HERO_FG, HERO_FG_MUTED } from '../dbe';

export default function ModuleGrid({
  modules = [],
  subscription = 'free',
  theme,
  navigation,
  title,
  navParams,
  // Optional (mod) => string. Return live state for a module and it replaces the
  // static description; return nothing and the description stands.
  subtitleFor,
  // Optional module key to lead with, when a screen has computed a better answer than
  // "first unlocked".
  leadKey,
}) {
  const unlockedOf = (mod) => canAccessFeature(mod.feature, subscription);

  // The lead is computed, never arbitrary: the role's list is already ordered by
  // intent, so the first module you can actually open is the one to start from. A
  // locked module never leads — the primary surface is not a paywall.
  const { lead, rest } = useMemo(() => {
    if (!modules.length) return { lead: null, rest: [] };
    const idx = leadKey
      ? modules.findIndex((m) => m.key === leadKey)
      : modules.findIndex(unlockedOf);
    const at = idx >= 0 ? idx : 0;
    return { lead: modules[at], rest: modules.filter((_, i) => i !== at) };
  }, [modules, subscription, leadKey]);

  if (!modules.length) return null;

  const handlePress = (mod, unlocked) =>
    navigation.navigate(unlocked ? mod.key : 'Subscription', unlocked ? navParams : undefined);

  const subFor = (mod) => (subtitleFor && subtitleFor(mod)) || mod.description;

  const leadUnlocked = unlockedOf(lead);

  return (
    <View style={styles.section}>
      {title ? (
        <Text style={[TYPE.sectionLabel, { color: theme.textDim, marginBottom: SHAPE.labelGap }]}>
          {title}
        </Text>
      ) : null}

      {/* ── Lead ─────────────────────────────────────────────────────────────── */}
      <Entrance variant="up">
        <HeroTile
          onPress={() => handlePress(lead, leadUnlocked)}
          accessibilityLabel={leadUnlocked ? lead.label : `${lead.label}, requires Pro`}
          accessibilityHint={subFor(lead)}
          style={styles.lead}
        >
          <View style={styles.leadTop}>
            <View style={styles.leadIcon}>
              <Ionicons name={lead.icon} size={22} color={HERO_FG} />
            </View>
            <Ionicons name="arrow-forward" size={18} color={HERO_FG_MUTED} />
          </View>
          <Text style={[TYPE.statNumberMedium, styles.leadLabel]} numberOfLines={1}>
            {lead.label}
          </Text>
          <Text style={[TYPE.cardBody, styles.leadSub]} numberOfLines={2}>
            {subFor(lead)}
          </Text>
        </HeroTile>
      </Entrance>

      {/* ── The rest ─────────────────────────────────────────────────────────── */}
      <View style={styles.gridWrap}>
        {rest.map((mod, i) => {
          const unlocked = unlockedOf(mod);
          return (
            <Entrance
              key={mod.key}
              variant="cellIn"
              // Capped so a long list does not tail off into a slow cascade.
              delay={120 + Math.min(i, 6) * 80}
              style={styles.gridCell}
            >
              <TouchableOpacity
                style={[styles.gridCard, { backgroundColor: theme.surface, borderColor: theme.hairline }]}
                onPress={() => handlePress(mod, unlocked)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={unlocked ? mod.label : `${mod.label}, requires Pro`}
                accessibilityHint={unlocked ? subFor(mod) : 'Opens the upgrade screen'}
              >
                <View style={styles.cardTop}>
                  <View
                    style={[
                      styles.icon,
                      { backgroundColor: unlocked ? theme.badgeFill : theme.steelFill },
                    ]}
                  >
                    <Ionicons
                      name={mod.icon}
                      size={20}
                      color={unlocked ? theme.accentText : theme.steel}
                    />
                  </View>
                  {!unlocked ? (
                    <View style={[styles.proChip, { backgroundColor: theme.steelFill }]}>
                      <Text style={[TYPE.chipSmall, { color: theme.steel }]}>PRO</Text>
                    </View>
                  ) : null}
                </View>

                <Text
                  style={[TYPE.cardTitle, { color: unlocked ? theme.text : theme.textMuted }]}
                  numberOfLines={1}
                >
                  {mod.label}
                </Text>
                {/* textMuted, not textDim: these lines now carry live state
                    ("Train to earn your first grade"), which makes them body copy
                    rather than a caption. textDim measures 4.11:1 on surface in dark
                    — under the floor; textMuted is 8.23:1 and is what the system
                    assigns to body copy anyway. */}
                <Text style={[TYPE.cardBody, { color: theme.textMuted }]} numberOfLines={2}>
                  {subFor(mod)}
                </Text>
              </TouchableOpacity>
            </Entrance>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 8 },

  // Lead — taller and looser than the field below it, so the section has a peak.
  lead: { paddingVertical: 18 },
  leadTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  leadIcon: {
    width: 40,
    height: 40,
    borderRadius: SHAPE.radiusTile,
    alignItems: 'center',
    justifyContent: 'center',
    // Tinted from the foreground, not a new hue — the plane is already burgundy.
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  leadLabel: { color: HERO_FG },
  leadSub: { color: HERO_FG_MUTED, marginTop: 5, maxWidth: '92%' },

  // Field — tighter, quieter, uniform on purpose. It is a catalog, not a pitch.
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: SHAPE.gridGap,
  },
  gridCell: { width: '48%', marginBottom: SHAPE.gridGap },
  gridCard: {
    borderRadius: SHAPE.radiusCard,
    borderWidth: 1,
    padding: SHAPE.cardPadding,
    gap: 6,
    // Keeps two-line and one-line cells on the same baseline, and clears the 44pt
    // touch-target floor on its own.
    minHeight: 116,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: SHAPE.radiusTile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: SHAPE.radiusBadge,
  },
});
