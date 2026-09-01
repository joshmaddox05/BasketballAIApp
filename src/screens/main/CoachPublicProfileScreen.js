// CoachPublicProfileScreen.js - Public view of a coach: bio, live listings, stats.
import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import { getUserProfile, getCoachListings } from '../../services/firestoreService';

const COACH_TYPE_LABEL = { org: 'Organization Coach', trainer: 'Skills Trainer' };

const initialsOf = (name) =>
  (name || 'Coach').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

export default function CoachPublicProfileScreen({ navigation, route }) {
  const coachUid = route.params?.coachUid;
  const { theme, isDarkMode } = useAppContext();

  const [coach, setCoach] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!coachUid) { setLoading(false); return; }
      let active = true;
      (async () => {
        setLoading(true);
        const [profile, all] = await Promise.all([
          getUserProfile(coachUid).catch(() => null),
          getCoachListings(coachUid),
        ]);
        if (!active) return;
        setCoach(profile);
        setListings(all.filter((l) => (l.status || 'live') === 'live'));
        setLoading(false);
      })();
      return () => { active = false; };
    }, [coachUid])
  );

  const name = coach?.displayName || coach?.name || 'Coach';
  const totalSales = listings.reduce((sum, l) => sum + (l.sales || 0), 0);
  const rated = listings.filter((l) => l.rating != null);
  const avgRating = rated.length ? rated.reduce((s, l) => s + l.rating, 0) / rated.length : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Coach Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 48 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Identity */}
          <View style={styles.identity}>
            {coach?.photoURL ? (
              <Image source={{ uri: coach.photoURL }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.primary + '22' }]}>
                <Text style={[styles.avatarText, { color: theme.primary }]}>{initialsOf(name)}</Text>
              </View>
            )}
            <Text style={[styles.name, { color: theme.text }]}>{name}</Text>
            <View style={[styles.typeBadge, { backgroundColor: theme.primary + '18', borderColor: theme.primary }]}>
              <Ionicons name="shield-checkmark-outline" size={13} color={theme.primary} />
              <Text style={[styles.typeBadgeText, { color: theme.primary }]}>
                {COACH_TYPE_LABEL[coach?.coachType] || 'Coach'}
              </Text>
            </View>
            {!!coach?.bio && (
              <Text style={[styles.bio, { color: theme.textSecondary }]}>{coach.bio}</Text>
            )}
          </View>

          {/* Stats */}
          <View style={[styles.statsRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{listings.length}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Listings</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{totalSales.toLocaleString()}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Sales</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <View style={styles.ratingRow}>
                <Text style={[styles.statValue, { color: theme.text }]}>{avgRating.toFixed(1)}</Text>
                <Ionicons name="star" size={13} color="#FFD700" style={{ marginLeft: 3 }} />
              </View>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Rating</Text>
            </View>
          </View>

          {/* Listings */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Listings</Text>
          {listings.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                This coach has no live listings yet.
              </Text>
            </View>
          ) : (
            listings.map((l) => (
              <TouchableOpacity
                key={l.id}
                style={[styles.listingCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => navigation.navigate('CoachMarketListing', { listing: { ...l, coachName: name } })}
                activeOpacity={0.85}
              >
                <View style={[styles.listingIcon, { backgroundColor: theme.primary + '18' }]}>
                  <Ionicons name="basketball-outline" size={20} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listingTitle, { color: theme.text }]} numberOfLines={2}>{l.title}</Text>
                  <Text style={[styles.listingMeta, { color: theme.textSecondary }]}>
                    {l.category || 'General'} · ${(l.price || 0).toFixed(0)}
                    {l.sales ? ` · ${l.sales} sold` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            ))
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 2 },
  headerTitle: { fontSize: 19, fontWeight: '700' },
  scroll: { padding: 16 },
  identity: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 12 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 30, fontWeight: '800' },
  name: { fontSize: 23, fontWeight: '800' },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 8,
  },
  typeBadgeText: { fontSize: 14, fontWeight: '700' },
  bio: { fontSize: 16, lineHeight: 21, textAlign: 'center', marginTop: 12 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    marginBottom: 20,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 21, fontWeight: '800' },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  statLabel: { fontSize: 13, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.4 },
  statDivider: { width: 1, height: 34 },
  sectionTitle: { fontSize: 17.5, fontWeight: '700', marginBottom: 10 },
  emptyCard: { borderRadius: 12, borderWidth: 1, padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 20 },
  listingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  listingIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  listingTitle: { fontSize: 16, fontWeight: '700' },
  listingMeta: { fontSize: 14, marginTop: 2 },
});
