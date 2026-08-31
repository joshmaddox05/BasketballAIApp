// ScoutReportsScreen.js - Scout's scouting reports (design 14d).
// Two modes on one screen (local state switch, no new route):
//   'list'    — the report archive (existing behavior, restyled)
//   'compose' — the report composer: rate and recommend (replaces the old modal)
// Report shape unchanged: { athleteName, recommendation, status: 'draft'|'submitted', updatedAt }.
import React, { useState, useCallback, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import { TYPE, SHAPE } from '../../utils/typography';
import {
  ScreenHeader,
  HeaderIconButton,
  SectionLabel,
  Avatar,
  Row,
  PrimaryButton,
  OutlineButton,
  EmptyState,
} from '../../components/dbe';
import { evalColorFor, evalFillFor } from './ScoutHomeScreen';
import { canAccessFeature } from '../../utils/subscription';
import {
  getScoutingReports,
  saveScoutingReport,
  deleteScoutingReport,
  getWatchlist,
  SCOUTING_RUBRIC,
} from '../../services/firestoreService';

const GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D'];
const RECOMMENDATIONS = ['Offer', 'Watch', 'Pass', 'Follow Up'];
const RUBRIC_MAX = 5;

const toDate = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const formatReportDate = (value) => {
  const d = toDate(value) || new Date();
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const initialsOf = (name) =>
  (name || '?')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

// ─── List mode: report row ────────────────────────────────────────────────────

function ReportRow({ report, theme, onEdit, onDelete, style }) {
  const isSubmitted = report.status === 'submitted';
  const gradeColor = evalColorFor(report.evalGrade, theme);
  return (
    <Row
      style={style}
      onPress={() => onEdit(report)}
      leading={
        <View style={[styles.gradeSquare, { backgroundColor: evalFillFor(report.evalGrade, theme) }]}>
          <Text style={[styles.gradeSquareText, { color: gradeColor }]}>{report.evalGrade || '—'}</Text>
        </View>
      }
      title={report.athleteName}
      meta={[report.recommendation, report.position, report.date].filter(Boolean).join(' · ')}
      trailing={
        <View style={styles.rowTrailing}>
          <View
            style={[
              styles.statusChip,
              { backgroundColor: isSubmitted ? theme.badgeFill : theme.steelFill },
            ]}
          >
            <Text
              style={[
                styles.statusChipText,
                { color: isSubmitted ? theme.accentText : theme.steel },
              ]}
            >
              {isSubmitted ? 'SUBMITTED' : 'DRAFT'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => onDelete(report.id)}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={15} color={theme.textDim} />
          </TouchableOpacity>
        </View>
      }
    />
  );
}

// ─── Compose mode: segmented 1–5 rating bar ───────────────────────────────────

function RatingBar({ label, value = 0, onChange, theme }) {
  return (
    <View style={styles.ratingBlock}>
      <View style={styles.ratingHead}>
        <Text style={[styles.ratingLabel, { color: theme.textMuted }]}>{label}</Text>
        <Text style={[styles.ratingValue, { color: theme.text }]}>{value || '—'}</Text>
      </View>
      <View style={styles.ratingSegments}>
        {Array.from({ length: RUBRIC_MAX }, (_, i) => i + 1).map((n) => (
          <TouchableOpacity
            key={n}
            style={styles.ratingSegmentTap}
            onPress={() => onChange(n)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8 }}
          >
            <View
              style={[
                styles.ratingSegment,
                { backgroundColor: n <= value ? theme.primary : theme.track },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Compose mode: the composer (design 14d) ──────────────────────────────────

function ReportComposer({ onClose, onSave, initial, prospects, presetProspect, theme }) {
  const lockProspect = !!initial; // editing → prospect is fixed
  const initialProspect = initial
    ? { id: initial.prospectUid, name: initial.athleteName, position: initial.position }
    : presetProspect || null;

  const [selected, setSelected] = useState(initialProspect);
  const [evalGrade, setEvalGrade] = useState(initial?.evalGrade || 'B');
  const [notes, setNotes] = useState(initial?.notes || '');
  const [recommendation, setRecommendation] = useState(initial?.recommendation || 'Watch');
  const [rubric, setRubric] = useState(initial?.rubric || {});

  const buildPayload = (status) => ({
    prospectUid: selected.id || selected.uid,
    athleteName: selected.name || 'Athlete',
    position: selected.position || '—',
    evalGrade,
    recommendation,
    notes,
    status,
    rubric,
  });

  const handleSave = (status) => {
    if (!selected) {
      Alert.alert('Select a prospect', 'Pick a prospect from your watchlist to report on.');
      return;
    }
    onSave(buildPayload(status));
  };

  const isDraft = (initial?.status || 'draft') === 'draft';

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        title="Scouting report"
        subtitle={selected ? selected.name : 'New report'}
        onBack={onClose}
        right={
          <View
            style={[
              styles.statusChip,
              styles.headerStatusChip,
              { backgroundColor: isDraft ? theme.steelFill : theme.badgeFill },
            ]}
          >
            <Text
              style={[
                styles.statusChipText,
                { color: isDraft ? theme.steel : theme.accentText },
              ]}
            >
              {isDraft ? 'DRAFT' : 'SUBMITTED'}
            </Text>
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.composerScroll} keyboardShouldPersistTaps="handled">
        {/* Prospect — fixed card when selected, watchlist picker otherwise */}
        {selected ? (
          <Row
            leading={<Avatar initials={initialsOf(selected.name)} size={36} tone="accent" />}
            title={selected.name}
            meta={[selected.position, evalGrade ? `EvalRank ${evalGrade}` : null].filter(Boolean).join(' · ')}
            trailing={
              !lockProspect ? (
                <TouchableOpacity onPress={() => setSelected(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.changeLink, { color: theme.accentText }]}>Change</Text>
                </TouchableOpacity>
              ) : null
            }
          />
        ) : prospects.length === 0 ? (
          <Text style={[styles.emptyPicker, { color: theme.textDim }]}>
            No prospects in your watchlist yet. Add prospects from search to report on them.
          </Text>
        ) : (
          <View style={{ gap: 8 }}>
            {prospects.map((p) => (
              <Row
                key={p.id}
                onPress={() => setSelected(p)}
                leading={<Avatar initials={initialsOf(p.name)} size={36} tone="steel" />}
                title={p.name}
                meta={p.position || '—'}
                trailing={<Ionicons name="chevron-forward" size={16} color={theme.textDim} />}
              />
            ))}
          </View>
        )}

        {/* Recommendation — segmented, active solid primary */}
        <View style={styles.section}>
          <SectionLabel>Recommendation</SectionLabel>
          <View style={styles.segmentRow}>
            {RECOMMENDATIONS.map((r) => {
              const active = recommendation === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.segmentBtn,
                    active
                      ? { backgroundColor: theme.primary }
                      : { borderWidth: 1, borderColor: theme.hairline },
                  ]}
                  onPress={() => setRecommendation(r)}
                  activeOpacity={0.8}
                >
                  <Text
                    numberOfLines={1}
                    style={[styles.segmentText, { color: active ? '#FFFFFF' : theme.textMuted }]}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Ratings — standardized rubric, 1–5 segmented bars */}
        <View style={styles.section}>
          <SectionLabel>Ratings</SectionLabel>
          <View style={{ gap: 13 }}>
            {SCOUTING_RUBRIC.map((dim) => (
              <RatingBar
                key={dim.key}
                label={dim.label}
                value={rubric[dim.key] || 0}
                onChange={(v) => setRubric((r) => ({ ...r, [dim.key]: v }))}
                theme={theme}
              />
            ))}
          </View>
        </View>

        {/* EvalRank grade */}
        <View style={styles.section}>
          <SectionLabel>EvalRank grade</SectionLabel>
          <View style={styles.gradeRow}>
            {GRADES.map((g) => {
              const active = evalGrade === g;
              return (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.gradeChip,
                    active
                      ? { backgroundColor: theme.primary }
                      : { borderWidth: 1, borderColor: theme.hairline },
                  ]}
                  onPress={() => setEvalGrade(g)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.gradeChipText, { color: active ? '#FFFFFF' : theme.textMuted }]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <SectionLabel>Notes</SectionLabel>
          <TextInput
            style={[styles.notesInput, { backgroundColor: theme.surface, color: theme.text }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Strengths, weaknesses, observations…"
            placeholderTextColor={theme.textDim}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Save draft | Submit */}
      <View style={styles.footer}>
        <OutlineButton label="Save draft" style={{ flex: 1 }} onPress={() => handleSave('draft')} />
        <PrimaryButton label="Submit" style={{ flex: 1 }} onPress={() => handleSave('submitted')} />
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ScoutReportsScreen({ navigation, route }) {
  const { user, userData, theme, isDarkMode } = useAppContext();
  const scoutUid = user?.uid;
  const subscription = userData?.subscription || 'free';
  const hasAccess = canAccessFeature('scoutLab', subscription);

  const [mode, setMode] = useState('list'); // 'list' | 'compose'
  const [reports, setReports] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [editingReport, setEditingReport] = useState(null);
  const [presetProspect, setPresetProspect] = useState(null);

  const loadReports = useCallback(async () => {
    if (!scoutUid) return;
    const [saved, wl] = await Promise.all([getScoutingReports(scoutUid), getWatchlist(scoutUid)]);
    setReports(saved.map((r) => ({ ...r, date: formatReportDate(r.updatedAt || r.createdAt) })));
    setWatchlist(wl.map((w) => ({ ...w, id: w.prospectUid || w.id })));
  }, [scoutUid]);

  useFocusEffect(
    useCallback(() => {
      if (hasAccess) loadReports();
    }, [hasAccess, loadReports])
  );

  // Opened via "Write Report" from a prospect detail → prefill that prospect.
  useEffect(() => {
    const p = route?.params?.prospect;
    if (p && hasAccess) {
      setPresetProspect({ id: p.id || p.uid, name: p.name, position: p.position });
      setEditingReport(null);
      setMode('compose');
      navigation.setParams({ prospect: undefined });
    }
  }, [route?.params?.prospect, hasAccess]);

  const handleNew = useCallback(() => {
    setEditingReport(null);
    setPresetProspect(null);
    setMode('compose');
  }, []);

  const handleEdit = useCallback((report) => {
    setEditingReport(report);
    setMode('compose');
  }, []);

  const closeComposer = useCallback(() => {
    setMode('list');
    setEditingReport(null);
    setPresetProspect(null);
  }, []);

  const handleDelete = useCallback((id) => {
    Alert.alert('Delete Report', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setReports((prev) => prev.filter((r) => r.id !== id));
          try {
            await deleteScoutingReport(scoutUid, id);
          } catch (error) {
            Alert.alert('Error', error.message || 'Could not delete report.');
            loadReports();
          }
        },
      },
    ]);
  }, [scoutUid, loadReports]);

  const handleSave = useCallback(async (data) => {
    const payload = editingReport ? { ...data, id: editingReport.id } : data;
    setMode('list');
    setEditingReport(null);
    setPresetProspect(null);
    try {
      await saveScoutingReport(scoutUid, payload);
      await loadReports();
    } catch (error) {
      Alert.alert('Error', error.message || 'Could not save report.');
    }
  }, [editingReport, scoutUid, loadReports]);

  if (!hasAccess) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={styles.lockCenter}>
          <EmptyState
            icon="lock-closed"
            title="Scout Reports"
            sub="Upgrade to PRO to create and manage scouting reports."
            ctaLabel="Upgrade"
            onPress={() => navigation.navigate('Subscription')}
          />
        </View>
      </SafeAreaView>
    );
  }

  const submittedCount = reports.filter((r) => r.status === 'submitted').length;
  const draftCount = reports.filter((r) => r.status === 'draft').length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {mode === 'compose' ? (
        <ReportComposer
          key={editingReport?.id || presetProspect?.id || 'new'}
          onClose={closeComposer}
          onSave={handleSave}
          initial={editingReport}
          prospects={watchlist}
          presetProspect={presetProspect}
          theme={theme}
        />
      ) : (
        <>
          <ScreenHeader
            title="Scouting reports"
            subtitle={`${submittedCount} submitted · ${draftCount} draft${draftCount === 1 ? '' : 's'}`}
            onBack={() => navigation.goBack()}
            right={<HeaderIconButton icon="add" onPress={handleNew} />}
          />

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {reports.length === 0 ? (
              <EmptyState
                icon="document-text-outline"
                title="No reports yet"
                sub="Rate and recommend a prospect from your watchlist."
                ctaLabel="New report"
                onPress={handleNew}
              />
            ) : (
              reports.map((r, i) => (
                <ReportRow
                  key={r.id}
                  report={r}
                  theme={theme}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  style={i > 0 ? { marginTop: 8 } : null}
                />
              ))
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  scrollContent: {
    paddingHorizontal: SHAPE.screenPadding,
    paddingTop: 14,
  },

  // List rows
  gradeSquare: {
    width: 38,
    height: 38,
    borderRadius: SHAPE.radiusBadge + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeSquareText: { fontFamily: TYPE.cardTitle.fontFamily, fontSize: 13 },
  rowTrailing: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: SHAPE.radiusBadge,
  },
  headerStatusChip: { alignSelf: 'center' },
  statusChipText: { fontFamily: TYPE.chip.fontFamily, fontSize: 9.5, letterSpacing: 0.4 },

  // Composer
  composerScroll: {
    paddingHorizontal: SHAPE.screenPadding,
    paddingTop: 14,
  },
  section: { marginTop: SHAPE.sectionGap },

  changeLink: { fontFamily: TYPE.buttonSecondary.fontFamily, fontSize: 12 },
  emptyPicker: { fontFamily: TYPE.tooltipBody.fontFamily, fontSize: 12, lineHeight: 18 },

  segmentRow: { flexDirection: 'row', gap: 7 },
  segmentBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: { fontFamily: TYPE.buttonSecondary.fontFamily, fontSize: 10.5 },

  ratingBlock: {},
  ratingHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  ratingLabel: { fontFamily: TYPE.greeting.fontFamily, fontSize: 11.5 },
  ratingValue: { fontFamily: TYPE.cardTitle.fontFamily, fontSize: 11.5 },
  ratingSegments: { flexDirection: 'row', gap: 4 },
  ratingSegmentTap: { flex: 1 },
  ratingSegment: { height: 5, borderRadius: 3 },

  gradeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  gradeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: SHAPE.radiusPill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeChipText: { fontFamily: TYPE.chip.fontFamily, fontSize: 10.5 },

  notesInput: {
    borderRadius: SHAPE.radiusTile,
    padding: 13,
    minHeight: 96,
    fontFamily: TYPE.tooltipBody.fontFamily,
    fontSize: 11.5,
    lineHeight: 18,
  },

  footer: {
    flexDirection: 'row',
    gap: SHAPE.cardGap,
    paddingHorizontal: SHAPE.screenPadding,
    paddingBottom: 8,
    paddingTop: 6,
  },

  lockCenter: { flex: 1, justifyContent: 'center' },
});
