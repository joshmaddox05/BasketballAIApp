// ViewingBanner.js — makes it unmistakable whose data is on screen.
//
// The module screens can now render an athlete other than the viewer. Without a
// persistent marker, a coach looking at a roster member's EvalRank is one glance
// away from reading it as their own — which is precisely the bug this replaces.

import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { TYPE, FONTS, SHAPE } from '../../utils/typography';

export default function ViewingBanner({ name, style }) {
  const { theme } = useAppContext();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderRadius: SHAPE.radiusCard,
          backgroundColor: theme.steelFill,
          paddingHorizontal: 13,
          paddingVertical: 10,
        },
        style,
      ]}
      accessibilityRole="header"
      accessibilityLabel={`Viewing ${name}. Read only.`}
    >
      <Ionicons name="eye-outline" size={15} color={theme.steel} />
      <Text style={{ flex: 1, fontFamily: FONTS.bodySemiBold, fontSize: 12, color: theme.steel }}>
        Viewing {name}
      </Text>
      <Text style={[TYPE.chip, { color: theme.steel }]}>READ ONLY</Text>
    </View>
  );
}
