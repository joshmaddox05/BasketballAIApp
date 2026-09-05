// TierTag.js — which of the three evidence tiers a number came from.
//
// The scouting feature makes one claim above all others: it never blurs what was
// actually observed on film with what was aggregated from it, or with what was
// projected under a coverage you have not shown yet. This tag is how that claim
// reaches the coach.
//
// It lived as two byte-identical copies, one per screen, on the reasoning that
// Chip and DistributionBar are duplicated the same way. That was fine while it
// was decorative. Now that it opens a definition it is load-bearing, and two
// copies means one of them silently stops explaining itself the next time the
// tiers change.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Explain } from './Explain';
import { FONTS } from '../../utils/typography';

const TIER_CONFIG = {
  observed: { label: 'FROM TAGGED FILM', icon: 'videocam-outline' },
  modeled: { label: 'MODELED TENDENCY', icon: 'analytics-outline' },
  simulated: { label: 'SIMULATED PROJECTION', icon: 'flask-outline' },
};

export default function TierTag({ tier, theme, style }) {
  const config = TIER_CONFIG[tier];
  if (!config) return null;
  const color =
    tier === 'modeled' ? theme.primary : tier === 'simulated' ? '#F59E0B' : theme.textSecondary;

  return (
    <Explain term={tier} style={[styles.tag, style]} hideIcon>
      <Ionicons name={config.icon} size={11} color={color} />
      <Text style={[styles.text, { color }]}>{config.label}</Text>
      <Ionicons name="help-circle-outline" size={11} color={color} />
    </Explain>
  );
}

const styles = StyleSheet.create({
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  text: { fontFamily: FONTS.bodySemiBold || FONTS.body, fontSize: 11, letterSpacing: 0.5 },
});
