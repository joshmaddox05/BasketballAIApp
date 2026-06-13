// MentorshipScreen.js
import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { canAccessFeature } from '../../utils/subscription';

const MOCK_MENTORS = [
  {
    id: '1',
    name: 'Coach D. Rivera',
    initials: 'DR',
    color: '#FF6B00',
    role: 'Shooting Coach',
    specialty: 'Mid-range & 3-point',
    rating: 4.9,
    sessions: 312,
    availability: 'Available',
  },
  {
    id: '2',
    name: 'Marcus Webb',
    initials: 'MW',
    color: '#0284C7',
    role: 'Pro Player',
    specialty: 'Guard Skills',
    rating: 4.8,
    sessions: 147,
    availability: 'Limited',
  },
  {
    id: '3',
    name: 'Coach T. Simmons',
    initials: 'TS',
    color: '#059669',
    role: 'Coach',
    specialty: 'Defense & IQ',
    rating: 4.7,
    sessions: 228,
    availability: 'Available',
  },
  {
    id: '4',
    name: 'Aaliyah Cross',
    initials: 'AC',
    color: '#7C3AED',
    role: 'Pro Player',
    specialty: 'Post & Finishing',
    rating: 4.9,
    sessions: 89,
    availability: 'Available',
  },
  {
    id: '5',
    name: 'Coach R. Okafor',
    initials: 'RO',
    color: '#DC2626',
    role: 'Coach',
    specialty: 'Athleticism & Speed',
    rating: 4.6,
    sessions: 194,
    availability: 'Busy',
  },
  {
    id: '6',
    name: 'Devon Nash',
    initials: 'DN',
    color: '#B45309',
    role: 'Pro Player',
    specialty: 'Ball Handling',
    rating: 4.8,
    sessions: 113,
    availability: 'Available',
  },
];

const MOCK_MY_MENTORS = [
  {
    id: '1',
    name: 'Coach D. Rivera',
    initials: 'DR',
    color: '#FF6B00',
    role: 'Shooting Coach',
    specialty: 'Mid-range & 3-point',
    lastMessage: 'Great session yesterday — keep working on that follow-through.',
    lastSeen: '2h ago',
    unread: 1,
  },
  {
    id: '3',
    name: 'Coach T. Simmons',
    initials: 'TS',
    color: '#059669',
    role: 'Coach',
    specialty: 'Defense & IQ',
    lastMessage: 'Check out the defensive footwork drill I sent over.',
    lastSeen: '1d ago',
    unread: 0,
  },
];

const AVAILABILITY_COLOR = {
  Available: '#059669',
  Limited: '#D97706',
  Busy: '#6B7280',
};

const TABS = ['Find Mentors', 'My Mentors'];

const MentorshipScreen = ({ navigation }) => {
  const { userData, theme, isDarkMode } = useAppContext();
  const [activeTab, setActiveTab] = useState('Find Mentors');
  const [searchQuery, setSearchQuery] = useState('');
  const [connectedIds, setConnectedIds] = useState(
    new Set(MOCK_MY_MENTORS.map(m => m.id))
  );

  const handleConnect = useCallback((mentor) => {
    setConnectedIds(prev => {
      const next = new Set(prev);
      if (next.has(mentor.id)) {
        next.delete(mentor.id);
      } else {
        next.add(mentor.id);
      }
      return next;
    });
  }, []);

  const filteredMentors = MOCK_MENTORS.filter(m => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q) ||
      m.specialty.toLowerCase().includes(q)
    );
  });

  const bg = theme.background || '#000000';
  const card = theme.card || '#1C1C1E';
  const textPrimary = theme.text || '#FFFFFF';
  const textSecondary = theme.textSecondary || '#8E8E93';
  const border = theme.border || '#2C2C2E';

  const renderMentorCard = (mentor) => {
    const isConnected = connectedIds.has(mentor.id);
    const availColor = AVAILABILITY_COLOR[mentor.availability] || '#6B7280';

    return (
      <View
        key={mentor.id}
        style={[styles.mentorCard, { backgroundColor: card, borderColor: border }]}
      >
        {/* Avatar + availability dot */}
        <View style={styles.mentorCardAvatarWrap}>
          <View style={[styles.mentorCardAvatar, { backgroundColor: mentor.color }]}>
            <Text style={styles.mentorCardAvatarText}>{mentor.initials}</Text>
          </View>
          <View style={[styles.availDot, { backgroundColor: availColor, borderColor: card }]} />
        </View>

        {/* Name + role */}
        <Text style={[styles.mentorCardName, { color: textPrimary }]} numberOfLines={1}>
          {mentor.name}
        </Text>

        <View style={[styles.rolePill, { backgroundColor: '#FF6B00' + '22' }]}>
          <Text style={styles.rolePillText}>{mentor.role}</Text>
        </View>

        <Text style={[styles.mentorCardSpecialty, { color: textSecondary }]} numberOfLines={1}>
          {mentor.specialty}
        </Text>

        {/* Rating row */}
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color="#FF6B00" />
          <Text style={[styles.ratingText, { color: textPrimary }]}>{mentor.rating}</Text>
          <Text style={[styles.sessionsText, { color: textSecondary }]}>· {mentor.sessions} sessions</Text>
        </View>

        {/* Connect button */}
        <TouchableOpacity
          style={[
            styles.connectBtn,
            isConnected
              ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#FF6B00' }
              : { backgroundColor: '#FF6B00' },
          ]}
          onPress={() => handleConnect(mentor)}
          activeOpacity={0.8}
        >
          <Text style={[styles.connectBtnText, { color: isConnected ? '#FF6B00' : '#FFFFFF' }]}>
            {isConnected ? 'Connected' : 'Connect'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderMyMentorRow = (mentor) => (
    <View
      key={mentor.id}
      style={[styles.myMentorRow, { backgroundColor: card, borderColor: border }]}
    >
      <View style={[styles.myMentorAvatar, { backgroundColor: mentor.color }]}>
        <Text style={styles.myMentorAvatarText}>{mentor.initials}</Text>
      </View>
      <View style={styles.myMentorInfo}>
        <View style={styles.myMentorTopRow}>
          <Text style={[styles.myMentorName, { color: textPrimary }]}>{mentor.name}</Text>
          <Text style={[styles.myMentorLastSeen, { color: textSecondary }]}>{mentor.lastSeen}</Text>
        </View>
        <Text style={[styles.myMentorRole, { color: '#FF6B00' }]}>{mentor.role}</Text>
        <Text style={[styles.myMentorLastMsg, { color: textSecondary }]} numberOfLines={1}>
          {mentor.lastMessage}
        </Text>
      </View>
      <View style={styles.myMentorActions}>
        {mentor.unread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{mentor.unread}</Text>
          </View>
        )}
        <TouchableOpacity style={[styles.messageBtn, { backgroundColor: '#FF6B00' }]}>
          <Ionicons name="chatbubble-ellipses" size={14} color="#FFFFFF" />
          <Text style={styles.messageBtnText}>Message</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyMyMentors = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconWrap, { backgroundColor: card }]}>
        <Ionicons name="people-outline" size={48} color={textSecondary} />
      </View>
      <Text style={[styles.emptyTitle, { color: textPrimary }]}>No Mentors Yet</Text>
      <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
        Connect with coaches and pro players to get personalized guidance for your game.
      </Text>
      <TouchableOpacity
        style={styles.emptyAction}
        onPress={() => setActiveTab('Find Mentors')}
      >
        <Text style={styles.emptyActionText}>Browse Mentors</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: bg, borderBottomColor: border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: card }]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Mentorship</Text>
        <TouchableOpacity style={[styles.infoBtn, { backgroundColor: card }]}>
          <Ionicons name="information-circle-outline" size={22} color={textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Sub-tab row */}
      <View style={[styles.tabRow, { backgroundColor: bg, borderBottomColor: border }]}>
        {TABS.map(tab => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabLabel, { color: isActive ? '#FF6B00' : textSecondary }]}>
                {tab}
              </Text>
              {activeTab === 'My Mentors' && tab === 'My Mentors' && MOCK_MY_MENTORS.length > 0 && (
                <View style={styles.tabCountBadge}>
                  <Text style={styles.tabCountText}>{MOCK_MY_MENTORS.length}</Text>
                </View>
              )}
              {isActive && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      {activeTab === 'Find Mentors' ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Search bar */}
          <View style={[styles.searchBar, { backgroundColor: card, borderColor: border }]}>
            <Ionicons name="search" size={18} color={textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: textPrimary }]}
              placeholder="Search by name, role, or specialty..."
              placeholderTextColor={textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Section label */}
          <View style={styles.sectionLabelRow}>
            <Text style={[styles.sectionLabel, { color: textPrimary }]}>
              {searchQuery ? `Results (${filteredMentors.length})` : 'Featured Mentors'}
            </Text>
            <View style={[styles.availLegend, { backgroundColor: card }]}>
              <View style={[styles.legendDot, { backgroundColor: '#059669' }]} />
              <Text style={[styles.legendText, { color: textSecondary }]}>Available</Text>
            </View>
          </View>

          {/* Grid */}
          {filteredMentors.length > 0 ? (
            <View style={styles.grid}>
              {filteredMentors.map(mentor => renderMentorCard(mentor))}
            </View>
          ) : (
            <View style={styles.noResults}>
              <Ionicons name="search-outline" size={36} color={textSecondary} />
              <Text style={[styles.noResultsText, { color: textSecondary }]}>
                No mentors match "{searchQuery}"
              </Text>
            </View>
          )}

          <View style={styles.bottomPad} />
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, MOCK_MY_MENTORS.length === 0 && styles.scrollContentCentered]}
          showsVerticalScrollIndicator={false}
        >
          {MOCK_MY_MENTORS.length === 0 ? (
            renderEmptyMyMentors()
          ) : (
            <>
              <Text style={[styles.sectionLabel, { color: textPrimary, marginBottom: 12 }]}>
                Active Mentors ({MOCK_MY_MENTORS.length})
              </Text>
              {MOCK_MY_MENTORS.map(mentor => renderMyMentorRow(mentor))}
              <View style={styles.bottomPad} />
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  infoBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '15%',
    right: '15%',
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FF6B00',
  },
  tabCountBadge: {
    position: 'absolute',
    top: 8,
    right: '22%',
    backgroundColor: '#FF6B00',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  scrollContentCentered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  availLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mentorCard: {
    width: '47.5%',
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  mentorCardAvatarWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  mentorCardAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mentorCardAvatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 20,
  },
  availDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 2,
  },
  mentorCardName: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 5,
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 5,
  },
  rolePillText: {
    color: '#FF6B00',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  mentorCardSpecialty: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sessionsText: {
    fontSize: 11,
  },
  connectBtn: {
    width: '100%',
    paddingVertical: 9,
    borderRadius: 20,
    alignItems: 'center',
  },
  connectBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  noResults: {
    alignItems: 'center',
    paddingTop: 48,
    gap: 12,
  },
  noResultsText: {
    fontSize: 14,
  },
  myMentorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  myMentorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  myMentorAvatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 17,
  },
  myMentorInfo: {
    flex: 1,
    marginRight: 10,
  },
  myMentorTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  myMentorName: {
    fontSize: 14,
    fontWeight: '700',
  },
  myMentorLastSeen: {
    fontSize: 11,
  },
  myMentorRole: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 3,
  },
  myMentorLastMsg: {
    fontSize: 12,
  },
  myMentorActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  unreadBadge: {
    backgroundColor: '#FF6B00',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 4,
  },
  messageBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  emptyAction: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 24,
    marginTop: 8,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  bottomPad: {
    height: 32,
  },
});

export default MentorshipScreen;
