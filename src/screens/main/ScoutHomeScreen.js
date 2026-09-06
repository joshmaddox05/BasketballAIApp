// ScoutHomeScreen.js - Scout board (design 14a: "new since you last looked").
// Presentational redesign only — data loading unchanged. Motion intent: scout —
// ONLY the new/changed rows animate in; everything else renders static.
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import { TYPE, SHAPE } from '../../utils/typography';
import {
  Entrance,
  Shimmer,
  AttentionDot,
  ScreenHeader,
  HeaderIconButton,
  SectionLabel,
  Avatar,
  Row,
  BarFill,
} from '../../components/dbe';
import { getModulesForRole } from '../../config/roleModules';
import ModuleIntro from '../../components/modules/ModuleIntro';
import { useModuleIntro } from '../../hooks/useModuleIntro';
import { canAccessFeature } from '../../utils/subscription';
import {
  getWatchlist,
  getScoutingReports,
  searchScoutLabProspects,
  getScoutAccessStatuses,
  listenToUnreadNotificationCount,
} from '../../services/firestoreService';
import { GRADE_LABEL } from '../../utils/constants';

// ─── Data mapping helpers ──────────────────────────────────────────────────────

const toDate = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const shortDate = (value) => {
  const d = toDate(value);
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
};


// Grade → color, remapped to the burgundy palette (README 14c note):
// A→accentText, B→accentText, C→steel, else textDim.
export const evalColorFor = (score, theme) => {
  const g = String(score || '').toUpperCase();
  if (g.startsWith('A')) return theme.accentText;
  if (g.startsWith('B')) return theme.accentText;
  if (g.startsWith('C')) return theme.steel;
  return theme.textDim;
};

// Matching badge fill for the grade color.
export const evalFillFor = (score, theme) => {
  const g = String(score || '').toUpperCase();
  if (g.startsWith('A') || g.startsWith('B')) return theme.badgeFill;
  return theme.steelFill;
};

const initialsOf = (name) =>
  (name || '?')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

const mapWatchUpdate = (w) => ({
  id: w.prospectUid || w.id,
  prospectName: w.name || 'Prospect',
  update: [w.position, w.region, shortDate(w.savedAt)].filter(Boolean).join(' · '),
  evalGrade: w.evalGrade || '—',
  raw: w,
});

const mapReport = (r) => ({
  id: r.id,
  title: `${r.athleteName || 'Athlete'} — ${r.recommendation || 'Report'}`,
  prospect: r.athleteName || 'Athlete',
  date: shortDate(r.updatedAt || r.createdAt),
  pages: 1,
  status: r.status === 'submitted' ? 'Final' : 'Draft',
});

// Grade → trending-bar fill (presentational encoding of the existing grade only).
const gradePct = (score) => {
  const g = String(score || '').toUpperCase();
  if (g.startsWith('A')) return 0.86;
  if (g.startsWith('B')) return 0.68;
  if (g.startsWith('C')) return 0.5;
  return 0.34;
};

// ─── Grade badge ──────────────────────────────────────────────────────────────

function GradeBadge({ grade, theme }) {
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: SHAPE.radiusBadge,
        backgroundColor: evalFillFor(grade, theme),
      }}
    >
      <Text style={{ fontFamily: TYPE.buttonPrimary.fontFamily, fontSize: 13, color: evalColorFor(grade, theme) }}>
        {grade}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ScoutHomeScreen({ navigation }) {
  const { user, userData, theme, isDarkMode } = useAppContext();
  const scoutUid = user?.uid;

  const name = userData?.displayName || userData?.name || 'Scout';
  const firstName = name.split(' ')[0];

  const [watchlist, setWatchlist] = useState([]);
  const [reports, setReports] = useState([]);
  const [trendingProspects, setTrendingProspects] = useState([]);
  const [prospectCount, setProspectCount] = useState(0);
  const [accessByUid, setAccessByUid] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);

  const loadDashboard = useCallback(async () => {
    if (!scoutUid) return;
    const [savedWatchlist, savedReports, prospects] = await Promise.all([
      getWatchlist(scoutUid),
      getScoutingReports(scoutUid),
      searchScoutLabProspects({}),
    ]);
    setWatchlist(savedWatchlist);
    setReports(savedReports.map(mapReport));
    setTrendingProspects((prospects || []).slice(0, 6));
    setProspectCount((prospects || []).length);

    // Consent state for the watchlist, so approvals surface on the dashboard
    // instead of only inside a single prospect screen.
    const statuses = await getScoutAccessStatuses(
      savedWatchlist.map((w) => w.prospectUid || w.id),
      scoutUid
    ).catch(() => ({}));
    setAccessByUid(statuses);
  }, [scoutUid]);

  // Real unread count — the bell used to carry a hardcoded always-on badge.
  useEffect(() => {
    if (!scoutUid) return;
    const unsubscribe = listenToUnreadNotificationCount(scoutUid, setUnreadCount);
    return () => unsubscribe();
  }, [scoutUid]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  // TODO(product): the "new since last visit" diff needs a per-scout
  // `lastVisitedAt` marker (written on dashboard focus) to be meaningful. Until
  // that field exists we order by savedAt descending and treat the newest 3 as
  // "new" — the pulsing dot is a placeholder for the real last-visit diff.
  // (No new Firestore writes in this redesign.)
  const sortedWatchlist = [...watchlist].sort((a, b) => {
    const da = toDate(a.savedAt)?.getTime() || 0;
    const db = toDate(b.savedAt)?.getTime() || 0;
    return db - da;
  });
  const watchlistUpdates = sortedWatchlist.slice(0, 3).map(mapWatchUpdate);
  const newCount = watchlistUpdates.length;

  // Consent buckets. Approval used to be invisible outside one detail screen, so
  // the scout had no way to know a parent had said yes.
  const accessBuckets = useMemo(() => {
    const unlocked = [];
    const awaiting = [];
    sortedWatchlist.forEach((w) => {
      const uid = String(w.prospectUid || w.id);
      const status = accessByUid[uid];
      if (status === 'approved') unlocked.push(w);
      else if (status === 'pending') awaiting.push(w);
    });
    return { unlocked, awaiting };
  }, [sortedWatchlist, accessByUid]);
  const draftCount = reports.filter((r) => r.status === 'Draft').length;

  const handleProspectPress = useCallback((prospect) => {
    navigation.navigate('ScoutProspectDetail', { prospect });
  }, [navigation]);

  const subscription = userData?.subscription || 'free';
  const modules = getModulesForRole('scout');
  const moduleSub = (mod) => {
    if (mod.key === 'ScoutLabSearch') return `${prospectCount} consented profiles`;
    if (mod.key === 'ScoutReports') return draftCount === 1 ? '1 draft open' : `${draftCount} drafts open`;
    return mod.description;
  };
  // Shares the module-intro gate with ModuleGrid, so an intro fires the first
  // time a scout opens a module here too.
  const { openModule, introProps } = useModuleIntro(navigation);
  const handleModulePress = (mod) => {
    openModule(mod, canAccessFeature(mod.feature, subscription));
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <ScreenHeader
        title="Scout Board"
        subtitle={`Welcome back, ${firstName}`}
        right={
          <>
            <HeaderIconButton icon="chatbubble-outline" onPress={() => navigation.navigate('Messaging')} />
            <HeaderIconButton
              icon="notifications-outline"
              badge={unreadCount > 0}
              onPress={() => navigation.navigate('Notifications')}
            />
          </>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats — static (scout motion: only new rows animate) */}
        <View style={styles.statsRow}>
          <View style={[styles.statTile, { backgroundColor: theme.surface }]}>
            <Text style={[TYPE.statNumber, { color: theme.text }]}>{watchlist.length}</Text>
            <Text style={[TYPE.statCaption, { color: theme.textDim, marginTop: 5 }]}>Watching</Text>
          </View>
          <View style={[styles.statTile, { backgroundColor: theme.surface }]}>
            <Text style={[TYPE.statNumber, { color: theme.text }]}>{reports.length}</Text>
            <Text style={[TYPE.statCaption, { color: theme.textDim, marginTop: 5 }]}>Reports</Text>
          </View>
          <View
            style={[
              styles.statTile,
              { backgroundColor: theme.attentionFill, borderWidth: 1, borderColor: theme.attentionBorder },
            ]}
          >
            <Entrance variant="count" delay={500}>
              <Text style={[TYPE.statNumber, { color: theme.accentText }]}>{newCount}</Text>
            </Entrance>
            <Text style={[TYPE.statCaption, { color: theme.accentText, marginTop: 5 }]}>New</Text>
          </View>
        </View>

        {/* Newly unlocked — a parent approved access. Previously the scout was
            never told and had to re-check each prospect manually. */}
        {accessBuckets.unlocked.length > 0 && (
          <View style={styles.section}>
            <SectionLabel>Unlocked for you</SectionLabel>
            {accessBuckets.unlocked.slice(0, 4).map((w, i) => (
              <Entrance
                key={w.prospectUid || w.id}
                variant="slideIn"
                delay={150 + i * 100}
                style={i > 0 ? { marginTop: 8 } : null}
              >
                <Row
                  onPress={() => handleProspectPress(w)}
                  leading={<Avatar initials={initialsOf(w.name)} tone="steel" />}
                  title={w.name || 'Prospect'}
                  meta="Full profile unlocked"
                  trailing={
                    <Ionicons name="lock-open-outline" size={16} color={theme.primary} />
                  }
                />
              </Entrance>
            ))}
          </View>
        )}

        {/* Requests still with the parent. */}
        {accessBuckets.awaiting.length > 0 && (
          <View style={styles.section}>
            <SectionLabel>Awaiting parent approval</SectionLabel>
            {accessBuckets.awaiting.slice(0, 4).map((w, i) => (
              <Entrance
                key={w.prospectUid || w.id}
                variant="slideIn"
                delay={150 + i * 100}
                style={i > 0 ? { marginTop: 8 } : null}
              >
                <Row
                  onPress={() => handleProspectPress(w)}
                  leading={<Avatar initials={initialsOf(w.name)} tone="steel" />}
                  title={w.name || 'Prospect'}
                  meta="Pending with their guardian"
                  trailing={<Ionicons name="hourglass-outline" size={16} color={theme.steel} />}
                />
              </Entrance>
            ))}
          </View>
        )}

        {/* New on the watchlist — the only rows that animate in */}
        {watchlistUpdates.length > 0 && (
          <View style={styles.section}>
            <SectionLabel action="Watchlist" onAction={() => navigation.navigate('ScoutLabSearch')}>
              New on your watchlist
            </SectionLabel>
            {watchlistUpdates.map((item, i) => (
              <Entrance key={item.id} variant="slideIn" delay={200 + i * 120} style={i > 0 ? { marginTop: 8 } : null}>
                <Row
                  onPress={() => handleProspectPress(item.raw)}
                  leading={
                    <View>
                      <Avatar initials={initialsOf(item.prospectName)} tone="steel" />
                      <AttentionDot
                        size={11}
                        color={theme.primary}
                        haloColor={theme.pulseDot}
                        borderColor={theme.surface}
                        delay={i * 500}
                        style={styles.newDot}
                      />
                    </View>
                  }
                  title={item.prospectName}
                  meta={item.update}
                  trailing={<GradeBadge grade={item.evalGrade} theme={theme} />}
                />
              </Entrance>
            ))}
          </View>
        )}

        {/* Trending prospects — static grid */}
        {trendingProspects.length > 0 && (
          <View style={styles.section}>
            <SectionLabel action="See all" onAction={() => navigation.navigate('ScoutLabSearch')}>
              Trending in your regions
            </SectionLabel>
            <View style={styles.grid}>
              {trendingProspects.slice(0, 4).map((prospect) => {
                const grade = prospect.evaluationScore || prospect.evalGrade || '—';
                const meta = [
                  prospect.position,
                  GRADE_LABEL[prospect.gradeLevel],
                  prospect.region,
                ]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <TouchableOpacity
                    key={prospect.id}
                    style={[styles.trendCell, { backgroundColor: theme.surface }]}
                    activeOpacity={0.8}
                    onPress={() => handleProspectPress(prospect)}
                  >
                    <Text numberOfLines={1} style={[styles.trendName, { color: theme.text }]}>
                      {prospect.name || 'Prospect'}
                    </Text>
                    <Text numberOfLines={1} style={[styles.trendMeta, { color: theme.textDim }]}>
                      {meta || '—'}
                    </Text>
                    <BarFill
                      pct={gradePct(grade)}
                      color={evalColorFor(grade, theme)}
                      trackColor={theme.track}
                      height={3}
                      style={{ marginTop: 9 }}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Your tools — module grid; hero gradient tile for Prospect Search */}
        <View style={styles.section}>
          <SectionLabel>Your tools</SectionLabel>
          <View style={styles.grid}>
            {modules.map((mod, i) =>
              i === 0 ? (
                <TouchableOpacity
                  key={mod.key}
                  style={styles.toolCellWrap}
                  activeOpacity={0.85}
                  onPress={() => handleModulePress(mod)}
                >
                  <LinearGradient
                    colors={theme.heroGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.toolCellHero}
                  >
                    <Shimmer color={theme.shimmer} />
                    <Text style={[TYPE.cardTitle, { color: '#FFFFFF' }]}>{mod.label}</Text>
                    <Text style={[TYPE.cardBody, styles.toolSub, { color: 'rgba(255,255,255,0.72)' }]}>
                      {moduleSub(mod)}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  key={mod.key}
                  style={[styles.toolCell, { backgroundColor: theme.surface }]}
                  activeOpacity={0.85}
                  onPress={() => handleModulePress(mod)}
                >
                  <Text style={[TYPE.cardTitle, { color: theme.text }]}>{mod.label}</Text>
                  <Text numberOfLines={2} style={[TYPE.cardBody, styles.toolSub, { color: theme.textDim }]}>
                    {moduleSub(mod)}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>

      <ModuleIntro {...introProps} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SHAPE.screenPadding,
    paddingTop: 14,
  },

  statsRow: {
    flexDirection: 'row',
    gap: SHAPE.cardGap,
  },
  statTile: {
    flex: 1,
    borderRadius: SHAPE.radiusCard,
    padding: SHAPE.cardPadding,
  },

  section: {
    marginTop: SHAPE.sectionGap,
  },

  newDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SHAPE.gridGap,
  },
  trendCell: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: SHAPE.radiusCard,
    padding: SHAPE.cardPadding,
  },
  trendName: {
    fontFamily: TYPE.cardTitle.fontFamily,
    fontSize: 14.5,
  },
  trendMeta: {
    fontFamily: TYPE.rowMeta.fontFamily,
    fontSize: 12,
    marginTop: 3,
  },

  toolCellWrap: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  toolCellHero: {
    borderRadius: SHAPE.radiusCard,
    padding: 13,
    overflow: 'hidden',
    minHeight: 72,
  },
  toolCell: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: SHAPE.radiusCard,
    padding: 13,
    minHeight: 72,
  },
  toolSub: {
    marginTop: 4,
  },

  bottomPad: {
    height: 32,
  },
});
