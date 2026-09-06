// CourtLegend.js — says which shape is which side.
//
// There was no legend anywhere in the product. A coach opening the builder had to
// infer from a grid of blue discs and red rings which set was their own team, and
// the athlete reading an assigned play had exactly the same problem with none of
// the context. Inference is not a design: the first report this produced was that
// the colors were backwards, when what was actually missing was the key.
//
// It reads its swatches from CourtDiagram's palette so it can never drift from
// what the court actually draws — a legend that disagrees with the diagram is
// worse than no legend.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TOKEN_COLORS } from './CourtDiagram';
import { FONTS } from '../../utils/typography';

export default function CourtLegend({ theme, style }) {
  const label = { color: theme?.textSecondary || '#8A8A8E' };

  return (
    <View style={[styles.row, style]} accessibilityRole="summary">
      <View style={styles.item}>
        <View style={[styles.swatch, styles.offense]} />
        <Text style={[styles.text, label]}>Your offense</Text>
      </View>

      <View style={styles.item}>
        {/* Hollow, exactly as the court draws it. */}
        <View style={[styles.swatch, styles.defense]} />
        <Text style={[styles.text, label]}>Defense</Text>
      </View>

      <View style={styles.item}>
        <View style={[styles.swatch, styles.ball]}>
          <Ionicons name="basketball" size={9} color={TOKEN_COLORS.ballGlyph} />
        </View>
        <Text style={[styles.text, label]}>Ball</Text>
      </View>
    </View>
  );
}

const SIZE = 14;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 10,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offense: { backgroundColor: TOKEN_COLORS.offense, borderWidth: 1.5, borderColor: '#1D4ED8' },
  defense: { backgroundColor: 'transparent', borderWidth: 2, borderColor: TOKEN_COLORS.defense },
  ball: { backgroundColor: TOKEN_COLORS.ball, borderWidth: 1.5, borderColor: TOKEN_COLORS.ballGlyph },
  text: { fontFamily: FONTS.body, fontSize: 12.5 },
});
