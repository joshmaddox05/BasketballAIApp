import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import { EmptyState } from '../../components/dbe';
import {
  getWatchlist,
  removeWatchlistEntry,
  updateWatchlistStatus,
  getScoutAccessStatuses,
  WATCHLIST_STATUSES,
} from '../../services/firestoreService';

const GRADE_COLOR = { 'A+': '#22C55E', 'A': '#22C55E', 'A-': '#22C55E', 'B+': '#8A1C22', 'B': '#F59E0B', 'B-': '#F59E0B', 'C+': '#EF4444', 'C': '#EF4444' };
const GRADE_LABEL = { 9: '9th', 10: '10th', 11: '11th', 12: '12th' };
const STATUS_LABEL = { watching: 'Watching', contacted: 'Contacted', offer: 'Offer', committed: 'Committed', pass: 'Pass' };
const STATUS_COLOR = { watching: '#3B82F6', contacted: '#F59E0B', offer: '#A855F7', committed: '#22C55E', pass: '#EF4444' };

// Parent-consent state, distinct from the recruiting status above. Without this
// on the row, an approved prospect looked exactly like one never requested — the
// scout had to open each detail screen to find out they had been granted access.
const ACCESS_LABEL = {
  approved: 'ACCESS GRANTED',
  pending: 'AWAITING PARENT',
  denied: 'ACCESS DECLINED',
  revoked: 'ACCESS REVOKED',
};
const ACCESS_COLOR = {
  approved: '#22C55E',
  pending: '#F59E0B',
  denied: '#EF4444',
  revoked: '#EF4444',
};

const toDate = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const shortDate = (value) => {
  const d = toDate(value);
  return d ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—';
};

export default function ScoutWatchlistScreen({ navigation }) {
  const { user, theme, isDarkMode } = useAppContext();
  const scoutUid = user?.uid;

  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watchlist, setWatchlist] = useState([]);

  const loadWatchlist = useCallback(async () => {
    if (!scoutUid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const saved = await getWatchlist(scoutUid);
      // One batched consent lookup for the whole list, so every row can show
      // where its access request actually stands.
      const accessByUid = await getScoutAccessStatuses(
        saved.map((w) => w.prospectUid || w.id),
        scoutUid
      ).catch(() => ({}));

      setWatchlist(
        saved.map((w) => {
          const id = w.prospectUid || w.id;
          return {
            id,
            name: w.name || 'Unknown',
            position: w.position || '—',
            grade: GRADE_LABEL[w.gradeLevel] || w.classYear || '—',
            region: w.region || '—',
            evalGrade: w.evaluationScore || w.evalGrade || '—',
            status: w.status || 'watching',
            accessStatus: accessByUid[String(id)] || 'none',
            addedDate: shortDate(w.savedAt),
            note: w.note || 'No notes added.',
          };
        })
      );
    } finally {
      setLoading(false);
    }
  }, [scoutUid]);

  useFocusEffect(
    useCallback(() => {
      loadWatchlist();
    }, [loadWatchlist])
  );

  const handleRemove = useCallback(
    (prospectId) => {
      setWatchlist((prev) => prev.filter((p) => p.id !== prospectId));
      removeWatchlistEntry(scoutUid, String(prospectId)).catch((error) => {
        Alert.alert('Error', error.message || 'Could not remove prospect.');
        loadWatchlist();
      });
    },
    [scoutUid, loadWatchlist]
  );

  const handleStatus = useCallback(
    (prospectId, status) => {
      setWatchlist((prev) => prev.map((p) => (p.id === prospectId ? { ...p, status } : p)));
      updateWatchlistStatus(scoutUid, prospectId, status).catch((error) => {
        Alert.alert('Error', error.message || 'Could not update status.');
        loadWatchlist();
      });
    },
    [scoutUid, loadWatchlist]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Watchlist</Text>
        <View style={[styles.countBadge, { backgroundColor: theme.primary + '22' }]}>
          <Text style={[styles.countText, { color: theme.primary }]}>{watchlist.length} prospects</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={theme.primary} size="large" style={{ marginTop: 60 }} />
        ) : watchlist.length === 0 ? (
          <EmptyState
            icon="bookmark-outline"
            title="No saved prospects"
            sub="Use Prospect Search to find and save athletes to your watchlist."
            ctaLabel="Search Prospects"
            onPress={() => navigation.navigate('ScoutLabSearch')}
          />
        ) : (
          watchlist.map(p => (
            <TouchableOpacity key={p.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => setSelected(selected === p.id ? null : p.id)} activeOpacity={0.8}>
              <View style={styles.cardTop}>
                <View style={[styles.avatar, { backgroundColor: theme.primary + '22' }]}>
                  <Text style={[styles.avatarText, { color: theme.primary }]}>{p.name.split(' ').map(n => n[0]).join('')}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={[styles.name, { color: theme.text }]}>{p.name}</Text>
                  <Text style={[styles.meta, { color: theme.textSecondary }]}>{p.position} · {p.grade} grade · {p.region}</Text>
                  <View style={styles.pillRow}>
                    <View style={[styles.statusPill, { backgroundColor: (STATUS_COLOR[p.status] || '#888') + '18' }]}>
                      <Text style={[styles.statusPillText, { color: STATUS_COLOR[p.status] || '#888' }]}>{STATUS_LABEL[p.status] || 'Watching'}</Text>
                    </View>
                    {/* Where the parent-consent request stands, visible without
                        opening the prospect. */}
                    {ACCESS_LABEL[p.accessStatus] ? (
                      <View style={[styles.statusPill, { backgroundColor: ACCESS_COLOR[p.accessStatus] + '18' }]}>
                        <Text style={[styles.statusPillText, { color: ACCESS_COLOR[p.accessStatus] }]}>
                          {ACCESS_LABEL[p.accessStatus]}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <View style={[styles.gradeBadge, { backgroundColor: (GRADE_COLOR[p.evalGrade] || '#888') + '22' }]}>
                  <Text style={[styles.gradeText, { color: GRADE_COLOR[p.evalGrade] || '#888' }]}>{p.evalGrade}</Text>
                </View>
              </View>
              {selected === p.id && (
                <View style={[styles.expanded, { borderTopColor: theme.border }]}>
                  <Text style={[styles.statusHeader, { color: theme.textSecondary }]}>Recruiting Status · added {p.addedDate}</Text>
                  <View style={styles.statusRow}>
                    {WATCHLIST_STATUSES.map((s) => {
                      const active = p.status === s;
                      const c = STATUS_COLOR[s];
                      return (
                        <TouchableOpacity
                          key={s}
                          style={[styles.statusChip, { borderColor: active ? c : theme.border, backgroundColor: active ? c + '18' : 'transparent' }]}
                          onPress={() => handleStatus(p.id, s)}
                        >
                          <Text style={[styles.statusChipText, { color: active ? c : theme.textSecondary }]}>{STATUS_LABEL[s]}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <View style={[styles.noteBox, { backgroundColor: theme.background }]}>
                    <Text style={[styles.noteLabel, { color: theme.textSecondary }]}>Scout Note</Text>
                    <Text style={[styles.noteText, { color: theme.text }]}>{p.note}</Text>
                  </View>
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primary }]} onPress={() => navigation.navigate('ScoutProspectDetail', { prospect: p })}>
                      <Text style={styles.actionBtnText}>View Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.removeBtn, { borderColor: '#EF444440' }]} onPress={() => handleRemove(p.id)}>
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      <Text style={[styles.removeBtnText, { color: '#EF4444' }]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 21, fontWeight: '800' },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  countText: { fontSize: 14, fontWeight: '700' },
  scroll: { padding: 16, gap: 12 },
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16.5, fontWeight: '700' },
  info: { flex: 1 },
  name: { fontSize: 16.5, fontWeight: '700' },
  meta: { fontSize: 14, marginTop: 2 },
  gradeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  gradeText: { fontSize: 16, fontWeight: '800' },
  statusPill: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  statusHeader: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  statusChipText: { fontSize: 13, fontWeight: '700' },
  expanded: { borderTopWidth: 1, padding: 14, gap: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statVal: { fontSize: 19, fontWeight: '800' },
  statLabel: { fontSize: 13, marginTop: 2 },
  noteBox: { borderRadius: 10, padding: 12, gap: 4 },
  noteLabel: { fontSize: 13, fontWeight: '700' },
  noteText: { fontSize: 15, lineHeight: 19 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  removeBtnText: { fontSize: 15, fontWeight: '600' },
});
