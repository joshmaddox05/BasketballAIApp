// CoachMarketListingScreen.js - Drill/course detail view for CoachMarket
import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { canAccessFeature } from '../../utils/subscription';

const MOCK_LISTING = {
  id: 'listing_001',
  title: 'Elite Pull-Up Jumper Mechanics: Zero to Consistent',
  category: 'Shooting',
  rating: 4.8,
  ratingCount: 142,
  duration: '38:24',
  price: 19.99,
  description:
    'Master the pull-up jumper from any spot on the floor with a proven 5-step mechanics framework. This drill series breaks down footwork, balance point, and release consistency so you can create your own shot off the dribble at any level.',
  fullDescription:
    'This comprehensive drill course takes you through the complete mechanics of the pull-up jumper used by elite guards and forwards. Coach Marcus Thompson breaks down each phase — from the gather step and hip load through the one-motion release — with slow-motion breakdowns, live reps, and correction cues. Whether you are a youth player building your first pull-up or a high school player trying to make it automatic, this series gives you the framework and the reps to get there.',
  whatYoullLearn: [
    'Proper gather step and footwork for any pull-up situation',
    'How to create balance and elevation off the dribble',
    'One-motion shooting mechanics to improve release consistency',
    'In-game application drills for pull-ups off screens and ISO sets',
  ],
  coach: {
    id: 'coach_marcus',
    name: 'Marcus Thompson',
    title: 'Former D1 Assistant Coach',
    verified: true,
    totalStudents: 2340,
    totalListings: 18,
  },
};

const CoachMarketListingScreen = ({ navigation, route }) => {
  const listing = route.params?.listing || MOCK_LISTING;
  const { userData, theme, isDarkMode } = useAppContext();

  const [purchased, setPurchased] = useState(false);
  const [previewActive, setPreviewActive] = useState(false);

  const handlePurchase = useCallback(() => {
    // In production this would trigger a payment flow
    setPurchased(true);
  }, []);

  const handlePreview = useCallback(() => {
    setPreviewActive(true);
  }, []);

  const handleViewProfile = useCallback(() => {
    navigation.navigate('CoachProfile', { coachId: listing.coach.id });
  }, [navigation, listing.coach.id]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const bg = theme?.background || '#0D0D0D';
  const card = theme?.card || '#1A1A1A';
  const primary = theme?.primary || '#FF6B00';
  const textPrimary = theme?.text || '#FFFFFF';
  const textSecondary = theme?.textSecondary || '#AAAAAA';
  const border = theme?.border || '#2A2A2A';

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    return (
      <View style={styles.starsRow}>
        {Array.from({ length: 5 }).map((_, i) => {
          let name = 'star-outline';
          if (i < fullStars) name = 'star';
          else if (i === fullStars && hasHalf) name = 'star-half';
          return (
            <Ionicons
              key={i}
              name={name}
              size={14}
              color="#FFD700"
              style={{ marginRight: 1 }}
            />
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: bg, borderBottomColor: border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]} numberOfLines={1}>
          Drill Detail
        </Text>
        <TouchableOpacity style={styles.shareBtn} activeOpacity={0.7}>
          <Ionicons name="share-outline" size={22} color={textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Video Preview Placeholder */}
        <View style={[styles.videoPreview, { backgroundColor: '#111' }]}>
          {previewActive ? (
            <View style={styles.videoActivePlaceholder}>
              <Ionicons name="play-circle" size={56} color={primary} />
              <Text style={[styles.videoActiveText, { color: textSecondary }]}>
                Preview playing... (2 min free)
              </Text>
            </View>
          ) : (
            <>
              {/* Simulated video thumbnail gradient */}
              <View style={styles.videoThumbnailOverlay}>
                <View style={[styles.playCircle, { backgroundColor: 'rgba(255,107,0,0.92)' }]}>
                  <Ionicons name="play" size={32} color="#FFF" style={{ marginLeft: 4 }} />
                </View>
              </View>
              {/* Duration badge */}
              <View style={[styles.durationBadge, { backgroundColor: 'rgba(0,0,0,0.75)' }]}>
                <Ionicons name="time-outline" size={12} color="#FFF" />
                <Text style={styles.durationText}>{listing.duration}</Text>
              </View>
            </>
          )}
        </View>

        {/* Title + Category + Rating */}
        <View style={[styles.infoSection, { backgroundColor: card }]}>
          {/* Category chip */}
          <View style={[styles.categoryChip, { backgroundColor: `${primary}22`, borderColor: primary }]}>
            <Text style={[styles.categoryChipText, { color: primary }]}>{listing.category}</Text>
          </View>

          <Text style={[styles.listingTitle, { color: textPrimary }]}>{listing.title}</Text>

          <View style={styles.ratingRow}>
            {renderStars(listing.rating)}
            <Text style={[styles.ratingValue, { color: textPrimary }]}>{listing.rating.toFixed(1)}</Text>
            <Text style={[styles.ratingCount, { color: textSecondary }]}>
              ({listing.ratingCount.toLocaleString()} ratings)
            </Text>
          </View>
        </View>

        {/* Coach Info Row */}
        <View style={[styles.coachCard, { backgroundColor: card, borderColor: border }]}>
          {/* Avatar placeholder */}
          <View style={[styles.coachAvatar, { backgroundColor: primary }]}>
            <Text style={styles.coachAvatarInitials}>
              {listing.coach.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()}
            </Text>
          </View>

          <View style={styles.coachInfo}>
            <View style={styles.coachNameRow}>
              <Text style={[styles.coachName, { color: textPrimary }]}>{listing.coach.name}</Text>
              {listing.coach.verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
            <Text style={[styles.coachTitle, { color: textSecondary }]}>{listing.coach.title}</Text>
            <Text style={[styles.coachMeta, { color: textSecondary }]}>
              {listing.coach.totalStudents.toLocaleString()} students · {listing.coach.totalListings} drills
            </Text>
          </View>

          <TouchableOpacity onPress={handleViewProfile} activeOpacity={0.7}>
            <Text style={[styles.viewProfileLink, { color: primary }]}>View Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Description */}
        <View style={[styles.section, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>About This Drill Series</Text>
          <Text style={[styles.descriptionText, { color: textSecondary }]}>
            {listing.fullDescription}
          </Text>
        </View>

        {/* What You'll Learn */}
        <View style={[styles.section, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>What You'll Learn</Text>
          {listing.whatYoullLearn.map((point, index) => (
            <View key={index} style={styles.bulletRow}>
              <View style={[styles.checkCircle, { backgroundColor: `${primary}22` }]}>
                <Ionicons name="checkmark" size={14} color={primary} />
              </View>
              <Text style={[styles.bulletText, { color: textSecondary }]}>{point}</Text>
            </View>
          ))}
        </View>

        {/* Purchase Section */}
        <View style={[styles.purchaseSection, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.priceRow}>
            <View style={styles.priceLabelCol}>
              <Text style={[styles.priceLabel, { color: textSecondary }]}>One-time purchase</Text>
              <Text style={[styles.priceValue, { color: textPrimary }]}>
                ${listing.price.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.accessBadge, { backgroundColor: `${primary}22` }]}>
              <Ionicons name="infinite-outline" size={14} color={primary} />
              <Text style={[styles.accessBadgeText, { color: primary }]}>Lifetime Access</Text>
            </View>
          </View>

          {purchased ? (
            <View style={[styles.purchasedButton, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
              <Text style={styles.purchasedButtonText}>Purchased — Start Watching</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.purchaseButton, { backgroundColor: primary }]}
              onPress={handlePurchase}
              activeOpacity={0.8}
            >
              <Ionicons name="cart-outline" size={20} color="#FFF" />
              <Text style={styles.purchaseButtonText}>
                Purchase for ${listing.price.toFixed(2)}
              </Text>
            </TouchableOpacity>
          )}

          {!purchased && (
            <TouchableOpacity onPress={handlePreview} activeOpacity={0.7} style={styles.previewLinkWrapper}>
              <Ionicons name="play-circle-outline" size={16} color={primary} />
              <Text style={[styles.previewLink, { color: primary }]}>Preview First 2 Min Free</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default CoachMarketListingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  shareBtn: {
    padding: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },

  // Video preview
  videoPreview: {
    width: '100%',
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  videoThumbnailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#181818',
  },
  playCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  durationText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  videoActivePlaceholder: {
    alignItems: 'center',
    gap: 12,
  },
  videoActiveText: {
    fontSize: 13,
    marginTop: 8,
  },

  // Info section
  infoSection: {
    padding: 16,
    marginTop: 12,
    marginHorizontal: 12,
    borderRadius: 12,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 10,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listingTitle: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 4,
  },
  ratingCount: {
    fontSize: 13,
  },

  // Coach card
  coachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginTop: 10,
    marginHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  coachAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  coachAvatarInitials: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  coachInfo: {
    flex: 1,
  },
  coachNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  coachName: {
    fontSize: 15,
    fontWeight: '700',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  verifiedText: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: '600',
  },
  coachTitle: {
    fontSize: 12,
    marginBottom: 2,
  },
  coachMeta: {
    fontSize: 11,
  },
  viewProfileLink: {
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // Sections
  section: {
    padding: 16,
    marginTop: 10,
    marginHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  bulletText: {
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },

  // Purchase section
  purchaseSection: {
    padding: 16,
    marginTop: 10,
    marginHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  priceLabelCol: {},
  priceLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  accessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  accessBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  purchaseButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 6,
  },
  purchasedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  purchasedButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 6,
  },
  previewLinkWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    gap: 6,
  },
  previewLink: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
    marginLeft: 4,
  },

  bottomSpacer: {
    height: 24,
  },
});
