// SharedReportsSection.js — reports scouts have shared, as the athlete or their
// parent sees them.
//
// One component for both because the content is identical; only the framing
// differs ("about you" vs "about your athlete"). Renders nothing when there are
// no shared reports, so it never occupies a slot on an empty profile.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TYPE, SHAPE, FONTS } from '../../utils/typography';
import { Entrance } from '../dbe';

const formatDate = (value) => {
  if (!value) return '';
  const d = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function SharedReportsSection({ reports, theme, onOpen, childName, style }) {
  if (!reports || reports.length === 0) return null;

  return (
    <View style={[styles.section, style]}>
      <Text style={[TYPE.sectionLabel, { color: theme.textDim, marginBottom: SHAPE.labelGap }]}>
        {childName ? `Scout reports on ${childName}` : 'Scout reports on you'}
      </Text>

      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        {reports.map((report, i) => (
          <Entrance key={report.id} variant="slideIn" delay={60 + i * 70}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onOpen(report)}
              style={[
                styles.row,
                i < reports.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.hairline,
                },
              ]}
            >
              <View style={[styles.gradeSquare, { backgroundColor: theme.badgeFill }]}>
                <Text style={[styles.gradeText, { color: theme.accentText }]}>
                  {report.evalGrade || '—'}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={[TYPE.rowTitle, { color: theme.text }]}>
                  {report.scoutName || 'Scout'}
                </Text>
                <Text numberOfLines={1} style={[TYPE.rowMeta, { color: theme.textDim }]}>
                  {[report.recommendation, formatDate(report.sharedAt || report.updatedAt)]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
            </TouchableOpacity>
          </Entrance>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 22 },
  card: { borderRadius: SHAPE.radiusCard, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  gradeSquare: {
    width: 42,
    height: 42,
    borderRadius: SHAPE.radiusTile || 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: { fontFamily: FONTS.bodyBold, fontSize: 16 },
});
