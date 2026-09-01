// ScoutReportDetailScreen.js — a scout's report, as the athlete (or their parent) sees it.
//
// Read-only by construction: the scout owns the document, and the player-facing
// rule grants read on explicitly shared, submitted reports only.
//
// Framing matters here. A scout's grade is that scout's opinion — the platform's
// own EvalRank stays the authoritative evaluation (COO policy), and this screen
// says so rather than letting a 1–5 on "Character" read as a verdict.
import React from 'react';
import { SafeAreaView, StyleSheet, View, Text, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { SCOUTING_RUBRIC } from '../../services/firestoreService';
import { TYPE, SHAPE, FONTS } from '../../utils/typography';
import { Entrance, ScreenHeader, EmptyState } from '../../components/dbe';

const RUBRIC_MAX = 5;

const formatDate = (value) => {
  if (!value) return '';
  const d = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

/** 1–5 as filled pips — reads at a glance without a number to decode. */
function RubricRow({ label, value, theme, last }) {
  const score = Number(value) || 0;
  return (
    <View
      style={[
        styles.rubricRow,
        !last && { borderBottomWidth: 1, borderBottomColor: theme.hairline },
      ]}
    >
      <Text style={[styles.rubricLabel, { color: theme.text }]}>{label}</Text>
      <View style={styles.pips}>
        {Array.from({ length: RUBRIC_MAX }, (_, i) => (
          <View
            key={i}
            style={[
              styles.pip,
              { backgroundColor: i < score ? theme.primary : theme.track },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export default function ScoutReportDetailScreen({ navigation, route }) {
  const { theme, isDarkMode } = useAppContext();
  const report = route?.params?.report || null;
  // A parent opening their child's report; absent when the athlete opens their own.
  const forChildName = route?.params?.childName || null;

  if (!report) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <ScreenHeader title="Report" onBack={() => navigation.goBack()} />
        <EmptyState icon="document-text-outline" title="Report unavailable" sub="It may have been withdrawn." />
      </SafeAreaView>
    );
  }

  const rated = SCOUTING_RUBRIC.filter((dim) => Number(report.rubric?.[dim.key]) > 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <ScreenHeader
        title="Scout Report"
        subtitle={forChildName ? `About ${forChildName}` : formatDate(report.sharedAt || report.updatedAt)}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Entrance variant="cardIn">
          <View>
            {/* Who wrote it, and their headline read. */}
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <View style={styles.headRow}>
                <View style={[styles.avatar, { backgroundColor: theme.primary + '22' }]}>
                  <Ionicons name="person" size={18} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.scoutName, { color: theme.text }]}>
                    {report.scoutName || 'Scout'}
                  </Text>
                  <Text style={[styles.date, { color: theme.textDim }]}>
                    {formatDate(report.sharedAt || report.updatedAt)}
                  </Text>
                </View>
                {report.evalGrade ? (
                  <View style={[styles.gradeBadge, { backgroundColor: theme.badgeFill }]}>
                    <Text style={[styles.gradeText, { color: theme.accentText }]}>
                      {report.evalGrade}
                    </Text>
                  </View>
                ) : null}
              </View>

              {report.recommendation ? (
                <Text style={[styles.recommendation, { color: theme.text }]}>
                  {report.recommendation}
                </Text>
              ) : null}
            </View>

            {rated.length > 0 ? (
              <>
                <Text style={[TYPE.sectionLabel, styles.label, { color: theme.textDim }]}>
                  Ratings
                </Text>
                <View style={[styles.card, { backgroundColor: theme.surface, paddingVertical: 4 }]}>
                  {rated.map((dim, i) => (
                    <RubricRow
                      key={dim.key}
                      label={dim.label}
                      value={report.rubric[dim.key]}
                      theme={theme}
                      last={i === rated.length - 1}
                    />
                  ))}
                </View>
              </>
            ) : null}

            {report.notes ? (
              <>
                <Text style={[TYPE.sectionLabel, styles.label, { color: theme.textDim }]}>
                  Notes
                </Text>
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                  <Text style={[styles.notes, { color: theme.textMuted }]}>{report.notes}</Text>
                </View>
              </>
            ) : null}

            {/* The platform ranking stays authoritative; one scout's read is one
                scout's read, and the screen should not blur that. */}
            <View style={[styles.footnote, { backgroundColor: theme.steelFill }]}>
              <Ionicons name="information-circle-outline" size={15} color={theme.steel} />
              <Text style={[styles.footnoteText, { color: theme.textMuted }]}>
                One scout's opinion. Your EvalRank grade is unaffected.
              </Text>
            </View>
          </View>
        </Entrance>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
  label: { marginTop: 18, marginBottom: SHAPE.labelGap },
  card: { borderRadius: SHAPE.radiusCard, padding: 16, marginTop: 12 },

  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scoutName: { fontFamily: FONTS.bodyBold, fontSize: 16 },
  date: { fontFamily: FONTS.body, fontSize: 13, marginTop: 2 },
  gradeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: SHAPE.radiusPill },
  gradeText: { fontFamily: FONTS.bodyBold, fontSize: 15 },
  recommendation: { fontFamily: FONTS.bodySemiBold, fontSize: 16, lineHeight: 23, marginTop: 14 },

  rubricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    gap: 12,
  },
  rubricLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 15, flex: 1 },
  pips: { flexDirection: 'row', gap: 5 },
  pip: { width: 20, height: 7, borderRadius: 4 },

  notes: { fontFamily: FONTS.body, fontSize: 15, lineHeight: 22 },

  footnote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: SHAPE.radiusCard,
    padding: 13,
    marginTop: 18,
  },
  footnoteText: { flex: 1, fontFamily: FONTS.body, fontSize: 13, lineHeight: 18 },
});
