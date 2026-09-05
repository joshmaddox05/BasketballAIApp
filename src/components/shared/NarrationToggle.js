// NarrationToggle.js — the mute switch for the onboarding voice.
//
// Non-negotiable for a screen that starts talking on its own. Someone opening
// this in a classroom, on a bus, or next to a sleeping baby needs to silence it
// in one tap, without hunting through settings they have not been shown yet —
// they are three screens into their first session.
//
// It was a bare 20pt icon absolutely positioned in the top-right corner, which
// failed on both counts a control like this has to meet. It sat in the status-bar
// corner — the single hardest place on a phone to reach with the hand holding it —
// and with no label it read as decoration rather than as something to press. It
// is now a labelled pill that sits in the layout under each screen's header:
// lower, wider than the 44pt touch minimum, and saying in words what it does.
//
// It writes the same `voiceMuted` preference the tour uses, so muting here also
// mutes the tour and every module intro. One decision, made once.
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { FONTS } from '../../utils/typography';

/**
 * @param {string} [color] icon and label tint
 * @param {string} [fill]  pill background
 * @param {string} [border] pill border
 * @param {object} [style] applied to the row, for spacing at the call site
 */
export default function NarrationToggle({
  color = '#666',
  fill = 'transparent',
  border = 'rgba(128,128,128,0.35)',
  style,
}) {
  const { voiceMuted, toggleVoiceMuted } = useAppContext();

  return (
    <View style={[styles.row, style]}>
      <TouchableOpacity
        onPress={toggleVoiceMuted}
        style={[styles.pill, { backgroundColor: fill, borderColor: border }]}
        // The pill already clears 44pt; this extends the target past its edges
        // rather than making up for a small one.
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.7}
        accessibilityRole="switch"
        accessibilityState={{ checked: !voiceMuted }}
        accessibilityLabel={voiceMuted ? 'Turn the voice guide on' : 'Turn the voice guide off'}
      >
        <Ionicons name={voiceMuted ? 'volume-mute' : 'volume-medium'} size={17} color={color} />
        <Text style={[styles.label, { color }]}>{voiceMuted ? 'Voice off' : 'Voice on'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 15,
    borderRadius: 999,
    borderWidth: 1,
  },
  label: { fontFamily: FONTS.bodySemiBold, fontSize: 14.5 },
});
