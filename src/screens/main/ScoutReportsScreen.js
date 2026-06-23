// ScoutReportsScreen.js - Scout's scouting reports: list, create, edit
import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import { canAccessFeature } from '../../utils/subscription';
import {
  getScoutingReports,
  saveScoutingReport,
  deleteScoutingReport,
} from '../../services/firestoreService';

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];
const GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D'];
const RECOMMENDATIONS = ['Offer', 'Watch', 'Pass', 'Follow Up'];

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

const GRADE_COLOR = (g) => {
  if (!g) return '#9CA3AF';
  if (g.startsWith('A')) return '#22C55E';
  if (g.startsWith('B')) return '#3B82F6';
  if (g.startsWith('C')) return '#F59E0B';
  return '#EF4444';
};

function ReportCard({ report, theme, onEdit, onDelete }) {
  const gradeColor = GRADE_COLOR(report.evalGrade);
  const isSubmitted = report.status === 'submitted';

  return (
    <View style={[styles.reportCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.reportHeader}>
        <View style={[styles.gradeCircle, { borderColor: gradeColor, backgroundColor: gradeColor + '18' }]}>
          <Text style={[styles.gradeText, { color: gradeColor }]}>{report.evalGrade}</Text>
        </View>
        <View style={styles.reportMeta}>
          <Text style={[styles.athleteName, { color: theme.text }]}>{report.athleteName}</Text>
          <Text style={[styles.positionDate, { color: theme.textSecondary }]}>
            {report.position} · {report.date}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: isSubmitted ? '#22C55E18' : '#F59E0B18' }]}>
          <Text style={[styles.statusText, { color: isSubmitted ? '#22C55E' : '#F59E0B' }]}>
            {isSubmitted ? 'Submitted' : 'Draft'}
          </Text>
        </View>
      </View>

      <View style={[styles.recRow, { backgroundColor: theme.background }]}>
        <Ionicons name="flag-outline" size={13} color={theme.primary} />
        <Text style={[styles.recText, { color: theme.primary }]}>Recommendation: {report.recommendation}</Text>
      </View>

      <Text style={[styles.notesText, { color: theme.textSecondary }]} numberOfLines={2}>
        {report.notes}
      </Text>

      <View style={styles.reportActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.primary + '18' }]}
          onPress={() => onEdit(report)}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={15} color={theme.primary} />
          <Text style={[styles.actionBtnText, { color: theme.primary }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#EF444418' }]}
          onPress={() => onDelete(report.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={15} color="#EF4444" />
          <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ReportFormModal({ visible, onClose, onSave, initial, theme }) {
  const [athleteName, setAthleteName] = useState(initial?.athleteName || '');
  const [position, setPosition] = useState(initial?.position || 'PG');
  const [evalGrade, setEvalGrade] = useState(initial?.evalGrade || 'B');
  const [notes, setNotes] = useState(initial?.notes || '');
  const [recommendation, setRecommendation] = useState(initial?.recommendation || 'Watch');
  const [status, setStatus] = useState(initial?.status || 'draft');

  const handleSave = () => {
    if (!athleteName.trim()) {
      Alert.alert('Required', 'Please enter the athlete name.');
      return;
    }
    onSave({ athleteName: athleteName.trim(), position, evalGrade, notes, recommendation, status });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.text }]}>
            {initial ? 'Edit Report' : 'New Report'}
          </Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={[styles.modalSave, { color: theme.primary }]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalScroll}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Athlete Name</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
            value={athleteName}
            onChangeText={setAthleteName}
            placeholder="Full name"
            placeholderTextColor={theme.textSecondary}
          />

          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Position</Text>
          <View style={styles.chipRow}>
            {POSITIONS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.chip, { borderColor: position === p ? theme.primary : theme.border, backgroundColor: position === p ? theme.primary + '18' : 'transparent' }]}
                onPress={() => setPosition(p)}
              >
                <Text style={[styles.chipText, { color: position === p ? theme.primary : theme.textSecondary }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>EvalRank Grade</Text>
          <View style={styles.chipRow}>
            {GRADES.map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.chip, { borderColor: evalGrade === g ? GRADE_COLOR(g) : theme.border, backgroundColor: evalGrade === g ? GRADE_COLOR(g) + '18' : 'transparent' }]}
                onPress={() => setEvalGrade(g)}
              >
                <Text style={[styles.chipText, { color: evalGrade === g ? GRADE_COLOR(g) : theme.textSecondary }]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Recommendation</Text>
          <View style={styles.chipRow}>
            {RECOMMENDATIONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.chip, { borderColor: recommendation === r ? theme.primary : theme.border, backgroundColor: recommendation === r ? theme.primary + '18' : 'transparent' }]}
                onPress={() => setRecommendation(r)}
              >
                <Text style={[styles.chipText, { color: recommendation === r ? theme.primary : theme.textSecondary }]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Notes</Text>
          <TextInput
            style={[styles.textInput, styles.notesInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Strengths, weaknesses, observations…"
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Status</Text>
          <View style={styles.chipRow}>
            {['draft', 'submitted'].map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, { borderColor: status === s ? theme.primary : theme.border, backgroundColor: status === s ? theme.primary + '18' : 'transparent' }]}
                onPress={() => setStatus(s)}
              >
                <Text style={[styles.chipText, { color: status === s ? theme.primary : theme.textSecondary }]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function ScoutReportsScreen({ navigation }) {
  const { user, userData, theme, isDarkMode } = useAppContext();
  const scoutUid = user?.uid;
  const subscription = userData?.subscription || 'free';
  const hasAccess = canAccessFeature('scoutLab', subscription);

  const [reports, setReports] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingReport, setEditingReport] = useState(null);

  const loadReports = useCallback(async () => {
    if (!scoutUid) return;
    const saved = await getScoutingReports(scoutUid);
    setReports(saved.map((r) => ({ ...r, date: formatReportDate(r.updatedAt || r.createdAt) })));
  }, [scoutUid]);

  useFocusEffect(
    useCallback(() => {
      if (hasAccess) loadReports();
    }, [hasAccess, loadReports])
  );

  const handleNew = useCallback(() => {
    setEditingReport(null);
    setModalVisible(true);
  }, []);

  const handleEdit = useCallback((report) => {
    setEditingReport(report);
    setModalVisible(true);
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
    setModalVisible(false);
    setEditingReport(null);
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
          <Ionicons name="lock-closed" size={48} color={theme.textSecondary} />
          <Text style={[styles.lockTitle, { color: theme.text }]}>Scout Reports</Text>
          <Text style={[styles.lockSub, { color: theme.textSecondary }]}>
            Upgrade to PRO to create and manage scouting reports.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const submittedCount = reports.filter((r) => r.status === 'submitted').length;
  const draftCount = reports.filter((r) => r.status === 'draft').length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Scouting Reports</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>
            {submittedCount} submitted · {draftCount} draft
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: theme.primary }]}
          onPress={handleNew}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {reports.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={44} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No reports yet</Text>
            <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
              Tap + to create your first scouting report.
            </Text>
          </View>
        ) : (
          reports.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              theme={theme}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <ReportFormModal
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setEditingReport(null); }}
        onSave={handleSave}
        initial={editingReport}
        theme={theme}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },
  newBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: { padding: 16 },

  reportCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  gradeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: { fontSize: 15, fontWeight: '900' },
  reportMeta: { flex: 1 },
  athleteName: { fontSize: 15, fontWeight: '700' },
  positionDate: { fontSize: 12, marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },

  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  recText: { fontSize: 12, fontWeight: '600' },

  notesText: { fontSize: 13, lineHeight: 19, marginBottom: 12 },

  reportActions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnText: { fontSize: 13, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 14, textAlign: 'center' },

  lockCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  lockTitle: { fontSize: 22, fontWeight: '700' },
  lockSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalSave: { fontSize: 16, fontWeight: '700' },
  modalScroll: { padding: 16 },

  fieldLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  notesInput: { height: 100, paddingTop: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
});
