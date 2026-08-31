// HeroTile.js — the system's "this is the thing" surface.
//
// A burgundy gradient plane at hero radius with an optional shimmer sweep and white
// content. DESIGN.md specifies the gradient (['#8A1C22','#4C0F14'] at 135°, via
// start={{x:0,y:0}} end={{x:1,y:1}}) and names module tiles as its use case; the app
// had been hand-rolling that exact combination at eight call sites (ScoutHome,
// CoachHome, CoachMarket, EvalRank, ShotDNA ×2, ShotDNAArchetype, AssignWorkout)
// without ever extracting it. This is that shape, once.
//
// Content is white by contract — the plane is dark in both appearances, so it does not
// take theme text colours. Secondary copy tints down from the foreground rather than
// going grey, which is what keeps it legible on the gradient.
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppContext } from '../../context/AppContext';
import { SHAPE, TYPE } from '../../utils/typography';
import { Shimmer } from './Shimmer';

export const HERO_FG = '#FFFFFF';
export const HERO_FG_MUTED = 'rgba(255, 255, 255, 0.72)';
export const HERO_FG_DIM = 'rgba(255, 255, 255, 0.55)';

/**
 * HeroTile
 * @param {boolean} [shimmer=true]  the slow light sweep; off for dense//repeated tiles
 * @param {'accent'|'steel'} [tone] steel renders the neutral second voice instead
 */
export function HeroTile({
  children,
  onPress,
  shimmer = true,
  tone = 'accent',
  style,
  contentStyle,
  accessibilityLabel,
  accessibilityHint,
}) {
  const { theme } = useAppContext();
  const colors = tone === 'steel' ? theme.steelGradient || theme.heroGradient : theme.heroGradient;

  const body = (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.tile, style]}
    >
      {/* Parent has overflow:'hidden', which the sweep requires. */}
      {shimmer ? <Shimmer color={theme.shimmer} /> : null}
      <View style={contentStyle}>{children}</View>
    </LinearGradient>
  );

  if (!onPress) return body;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      {body}
    </TouchableOpacity>
  );
}

/** Title + supporting line, the shape most hero tiles want. */
export function HeroTileText({ title, sub, style }) {
  return (
    <View style={style}>
      <Text style={[TYPE.cardTitle, { color: HERO_FG }]} numberOfLines={1}>
        {title}
      </Text>
      {sub ? (
        <Text style={[TYPE.cardBody, { color: HERO_FG_MUTED, marginTop: 4 }]} numberOfLines={2}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: SHAPE.radiusHero,
    padding: 16,
    overflow: 'hidden',
  },
});

export default HeroTile;
