// FilmSummary.js — how a piece of film identifies itself, everywhere.
//
// Two screens list film: the Film Library, where a coach manages it, and the
// Film Library tab on the SimCoach hub, where they just want to see what they
// have. Only the actions differ. Keeping the identity block — icon, opponent,
// date, duration, tag count, status pill, note — in one place means the tab and
// the library can never disagree about what a film is called or what state it is
// in, which is the failure that matters: a coach seeing "Tagged" on one screen
// and "Uploaded" on the other has no way to know which is true.
//
// Actions are `children`, so each screen supplies its own without this component
// growing a prop per button.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const formatDuration = (sec) => {
  if (!sec || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const formatFilmDate = (createdAt) => {
  const seconds = createdAt?.seconds;
  // An unresolved serverTimestamp means the doc was written moments ago.
  const d = seconds ? new Date(seconds * 1000) : new Date();
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// processingStatus -> status pill (see docs/SIMCOACH_COACH_TECHNICAL_SPEC.md §5).
// 'analyzed' is set by generateOpponentModel on every film that fed the model.
// Older film docs predate the field, so fall back to the 'uploaded' look.
export const STATUS_PILL = {
  uploaded: { label: 'Uploaded', color: '#22C55E' },
  tagging: { label: 'Tagging…', color: '#F59E0B' },
  tagged: { label: 'Tagged', color: '#3B82F6' },
  analyzed: { label: 'Analyzed', color: '#A855F7' },
};

export default function FilmSummary({ film, theme, children, compact = false }) {
  const duration = formatDuration(film.durationSec);
  const pill = STATUS_PILL[film.processingStatus] || STATUS_PILL.uploaded;
  const tagCount = film.taggedEventIds?.length || 0;

  return (
    <>
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: theme.primary + '18' }]}>
          <Ionicons name="videocam" size={compact ? 18 : 22} color={theme.primary} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.opponent, { color: theme.text }]} numberOfLines={1}>
            {film.opponentName}
          </Text>
          <Text style={[styles.meta, { color: theme.textSecondary }]}>
            {formatFilmDate(film.createdAt)}
            {duration ? ` · ${duration}` : ''}
            {tagCount ? ` · ${tagCount} tagged` : ''}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: pill.color + '18' }]}>
          <Ionicons name="checkmark-circle" size={11} color={pill.color} />
          <Text style={[styles.pillText, { color: pill.color }]}>{pill.label}</Text>
        </View>
      </View>

      {!compact && !!film.note && (
        <Text style={[styles.note, { color: theme.textSecondary }]} numberOfLines={2}>
          {film.note}
        </Text>
      )}

      {children}
    </>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  opponent: { fontSize: 16.5, fontWeight: '700' },
  meta: { fontSize: 13.5, marginTop: 2 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: { fontSize: 11, fontWeight: '700' },
  note: { fontSize: 14, marginTop: 10, lineHeight: 19 },
});
