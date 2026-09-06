// Explain.js — the app's one "what does this mean?" affordance.
//
// Before this there was none. No tooltip, no help icon, no glossary anywhere in
// the product, so every screen that needed to explain something invented a local
// footnote strip or, far more often, explained nothing. The opponent-scouting
// screens are the worst case: `Drop`, `Ice`, `Hedge/Show`, "CONF", and a
// three-way distinction between tagged, modeled and simulated data, all rendered
// as bare labels.
//
// Two pieces:
//   <ExplainProvider>  owns the sheet, so a screen mounts one and every term
//                      under it becomes tappable.
//   <Explain term="…">  wraps any label; tapping opens that entry.
//
// Terms are keys into data/tacticalGlossary.js. A term with no entry renders as
// plain text with no affordance rather than opening an empty sheet — an unhelpful
// silence beats a dead-end tap.
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '../dbe';
import { useAppContext } from '../../context/AppContext';
import { glossaryEntry } from '../../data/tacticalGlossary';
import { TYPE, FONTS, SHAPE } from '../../utils/typography';

const ExplainContext = createContext(null);

export function ExplainProvider({ children }) {
  const { theme } = useAppContext();
  const [term, setTerm] = useState(null);
  const entry = term ? glossaryEntry(term) : null;

  const open = useCallback((key) => {
    if (glossaryEntry(key)) setTerm(key);
  }, []);

  const value = useMemo(() => ({ open }), [open]);

  return (
    <ExplainContext.Provider value={value}>
      {children}
      <BottomSheet visible={!!entry} onClose={() => setTerm(null)}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={[TYPE.subScreenTitle, { color: theme.text, marginBottom: 8 }]}>
            {entry?.label}
          </Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>{entry?.body}</Text>
          <View style={{ height: 12 }} />
        </ScrollView>
      </BottomSheet>
    </ExplainContext.Provider>
  );
}

/**
 * Imperative access to the sheet, for cases where wrapping is not an option.
 *
 * The tagging chips are the motivating case: a chip is already a TouchableOpacity
 * whose tap selects the tag, and nesting it inside another touchable means the
 * inner one wins and the explanation never opens. Those bind `onLongPress` to
 * this instead, so tap still selects and press-and-hold explains.
 *
 * @returns {(term: string) => void} no-op outside an ExplainProvider
 */
export function useExplain() {
  const ctx = useContext(ExplainContext);
  return ctx?.open || (() => {});
}

/**
 * Wrap a label to make it tappable.
 *
 * Do NOT wrap something that is itself touchable — the inner touchable captures
 * the press and this never fires. Use useExplain() with onLongPress there.
 *
 * Outside an ExplainProvider — or with an unknown term — it renders its children
 * untouched. That means adding <Explain> to a screen can never break it, and a
 * mistyped term degrades to the label it already showed.
 */
export function Explain({ term, children, style, hideIcon = false }) {
  const ctx = useContext(ExplainContext);
  const { theme } = useAppContext();

  if (!ctx || !glossaryEntry(term)) return <>{children}</>;

  return (
    <TouchableOpacity
      style={[styles.row, style]}
      onPress={() => ctx.open(term)}
      activeOpacity={0.7}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      accessibilityRole="button"
      accessibilityHint={`Explains what ${term} means`}
    >
      {children}
      {!hideIcon && (
        <Ionicons name="help-circle-outline" size={13} color={theme.textDim || theme.textSecondary} />
      )}
    </TouchableOpacity>
  );
}

/**
 * A standalone explanatory strip, for the cases where the thing needing
 * explanation is not a single word. Modeled on the footnote already in
 * ScoutReportDetailScreen, which was the only place in the app doing this.
 */
export function ExplainNote({ children, theme, icon = 'information-circle-outline', style }) {
  return (
    <View style={[styles.note, { backgroundColor: theme.steelFill || theme.surface2 }, style]}>
      <Ionicons name={icon} size={15} color={theme.steel || theme.textSecondary} />
      <Text style={[styles.noteText, { color: theme.textMuted || theme.textSecondary }]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  body: { fontFamily: FONTS.body, fontSize: 15, lineHeight: 22 },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: SHAPE.radiusBadge || 8,
    marginTop: 10,
  },
  noteText: { flex: 1, fontFamily: FONTS.body, fontSize: 13, lineHeight: 18 },
});

export default Explain;
