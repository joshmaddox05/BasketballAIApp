// CoachMarketListingScreen.js - Drill/course detail view for CoachMarket
import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAppContext } from '../../context/AppContext';
import { purchaseCoachMarketListing, getUserCoachMarketPurchases, getListingMedia } from '../../services/firestoreService';
import { useSubscriptionPayment, processCoachMarketPayment } from '../../services/stripePaymentService';

const formatDuration = (sec) => {
  if (!sec || sec <= 0) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// Normalize a Firestore listing (or a purchase record) into the detail shape.
const normalizeListing = (raw = {}) => {
  const drills = Array.isArray(raw.drills) ? raw.drills : [];
  const learn = Array.isArray(raw.learningPoints) && raw.learningPoints.length
    ? raw.learningPoints
    : (Array.isArray(raw.whatYoullLearn) ? raw.whatYoullLearn : []);
  return {
    id: raw.id || raw.listingId || null,
    coachUid: raw.coachUid || null,
    title: raw.title || 'Coaching Drill',
    category: raw.category || 'General',
    type: raw.type || (drills.length > 1 ? 'series' : 'single'),
    level: raw.level || 'All Levels',
    rating: raw.rating || 0,
    ratingCount: raw.sales || 0,
    duration: raw.durationSec ? formatDuration(raw.durationSec) : (raw.duration || '—'),
    price: raw.price || 0,
    fullDescription: raw.description || 'Coaching content from a verified coach on CoachMarket.',
    whatYoullLearn: learn,
    drills,
    coach: {
      name: raw.coachName || 'Coach',
      title: 'CoachMarket Coach',
      verified: true,
      totalStudents: raw.sales || 0,
    },
  };
};

const CoachMarketListingScreen = ({ navigation, route }) => {
  const raw = route.params?.listing || {};
  const listing = normalizeListing(raw);
  const { user, userData, theme, isDarkMode } = useAppContext();

  const [purchased, setPurchased] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [previewActive, setPreviewActive] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);
  // Video URLs live in a purchase-gated subcollection, not on the listing doc.
  // Empty until we know this viewer is entitled — see getListingMedia.
  const [media, setMedia] = useState({});

  const { initializePaymentSheet, openPaymentSheet } = useSubscriptionPayment();

  const isOwnListing = listing.coachUid && listing.coachUid === user?.uid;
  const canWatch = purchased || isOwnListing;
  // `hasVideo` is public metadata; the URL itself is not. This is what keeps
  // the lock icons and "Purchase to watch" copy accurate for a viewer who is
  // not entitled to the URLs.
  const drillsWithVideo = listing.drills.filter((d) => d.hasVideo || d.videoUrl);
  const urlForDrill = (index) => media[String(index)]?.videoUrl || null;

  const player = useVideoPlayer(null, (p) => { p.loop = false; });

  const playVideo = useCallback((url) => {
    if (!url) return;
    setActiveVideoUrl(url);
    try {
      player.replace({ uri: url });
      player.play();
    } catch (_) { /* player not ready */ }
  }, [player]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.uid || !listing.id) return;
      let active = true;
      (async () => {
        const mine = await getUserCoachMarketPurchases(user.uid);
        if (active) setPurchased(mine.some((p) => p.id === listing.id || p.listingId === listing.id));
      })();
      return () => { active = false; };
    }, [user?.uid, listing.id])
  );

  // Fetch the gated media only once this viewer is known to be entitled. The
  // rule would deny it anyway; not asking keeps the console clean and makes the
  // entitlement explicit at the call site.
  useEffect(() => {
    if (!listing.id || !canWatch) { setMedia({}); return; }
    let active = true;
    getListingMedia(listing.id).then((m) => { if (active) setMedia(m); });
    return () => { active = false; };
  }, [listing.id, canWatch]);

  const handlePurchase = useCallback(async () => {
    if (purchasing || !listing.id) return;
    setPurchasing(true);
    try {
      if (listing.price > 0) {
        // Paid listing → Stripe payment sheet (destination charge to the coach).
        // The purchase record is written server-side by the webhook on success.
        const email = userData?.email || user?.email;
        const result = await processCoachMarketPayment(
          listing.id,
          email,
          initializePaymentSheet,
          openPaymentSheet
        );
        if (result.success) {
          setPurchased(true);
          Alert.alert('Success! 🎉', 'Payment complete — you now have lifetime access.');
        }
      } else {
        // Free listing → immediate enroll.
        await purchaseCoachMarketListing(
          { uid: user?.uid, displayName: userData?.displayName },
          raw
        );
        setPurchased(true);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not complete. Please try again.');
    } finally {
      setPurchasing(false);
    }
  }, [purchasing, listing.id, listing.price, user?.uid, user?.email, userData?.displayName, userData?.email, raw, initializePaymentSheet, openPaymentSheet]);

  const handlePreview = useCallback(() => {
    setPreviewActive(true);
  }, []);

  const handleViewProfile = useCallback(() => {
    if (listing.coachUid) {
      navigation.navigate('CoachPublicProfile', { coachUid: listing.coachUid });
    }
  }, [navigation, listing.coachUid]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const bg = theme?.background || '#0D0D0D';
  const card = theme?.card || '#1A1A1A';
  const primary = theme?.primary || '#8A1C22';
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
        {/* Video area — plays real video once owned; otherwise a thumbnail. */}
        <View style={[styles.videoPreview, { backgroundColor: '#111' }]}>
          {activeVideoUrl ? (
            <VideoView player={player} style={styles.videoPlayer} allowsFullscreen contentFit="contain" />
          ) : (
            <>
              <TouchableOpacity
                style={styles.videoThumbnailOverlay}
                activeOpacity={0.85}
                onPress={() => {
                  const firstIdx = listing.drills.findIndex((d) => d.hasVideo || d.videoUrl);
                  const url = firstIdx >= 0 ? urlForDrill(firstIdx) : null;
                  return canWatch && url ? playVideo(url) : handlePreview();
                }}
              >
                <View style={[styles.playCircle, { backgroundColor: 'rgba(138, 28, 34,0.92)' }]}>
                  <Ionicons name={canWatch ? 'play' : 'lock-closed'} size={30} color="#FFF" style={{ marginLeft: canWatch ? 4 : 0 }} />
                </View>
                {!canWatch && (
                  <Text style={[styles.videoActiveText, { color: textSecondary, marginTop: 10 }]}>
                    {drillsWithVideo.length > 0 ? 'Purchase to watch' : 'No preview available'}
                  </Text>
                )}
              </TouchableOpacity>
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
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            {listing.type === 'series' ? 'About This Drill Series' : 'About This Drill'}
          </Text>
          <Text style={[styles.descriptionText, { color: textSecondary }]}>
            {listing.fullDescription}
          </Text>
        </View>

        {/* Drills — series shows the full list; each is playable once owned. */}
        {listing.type === 'series' && listing.drills.length > 0 && (
          <View style={[styles.section, { backgroundColor: card, borderColor: border }]}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>
              {listing.drills.length} Drill{listing.drills.length === 1 ? '' : 's'}
            </Text>
            {listing.drills.map((d, i) => {
              const url = urlForDrill(i);
              const hasVideo = d.hasVideo || !!d.videoUrl;
              const isActive = !!url && url === activeVideoUrl;
              const playable = canWatch && !!url;
              return (
                <TouchableOpacity
                  key={i}
                  style={styles.drillRow}
                  activeOpacity={playable ? 0.7 : 1}
                  onPress={() => playable && playVideo(url)}
                >
                  <View style={[styles.drillIndex, { backgroundColor: `${primary}22` }]}>
                    <Ionicons
                      name={playable ? (isActive ? 'pause' : 'play') : (hasVideo ? 'lock-closed' : 'ellipse-outline')}
                      size={14}
                      color={primary}
                    />
                  </View>
                  <Text style={[styles.drillRowTitle, { color: textPrimary }]} numberOfLines={1}>
                    {d.title || `Drill ${i + 1}`}
                  </Text>
                  <Text style={[styles.drillRowMeta, { color: textSecondary }]}>{formatDuration(d.durationSec)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* What You'll Learn */}
        {listing.whatYoullLearn.length > 0 && (
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
        )}

        {/* Purchase Section */}
        <View style={[styles.purchaseSection, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.priceRow}>
            <View style={styles.priceLabelCol}>
              <Text style={[styles.priceLabel, { color: textSecondary }]}>
                {listing.price > 0 ? 'Listed price' : 'Free access'}
              </Text>
              <Text style={[styles.priceValue, { color: textPrimary }]}>
                ${listing.price.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.accessBadge, { backgroundColor: `${primary}22` }]}>
              <Ionicons name="infinite-outline" size={14} color={primary} />
              <Text style={[styles.accessBadgeText, { color: primary }]}>Lifetime Access</Text>
            </View>
          </View>

          {isOwnListing ? (
            <View style={[styles.purchasedButton, { backgroundColor: border }]}>
              <Ionicons name="person-outline" size={20} color={textSecondary} />
              <Text style={[styles.purchasedButtonText, { color: textSecondary }]}>This is your listing</Text>
            </View>
          ) : purchased ? (
            <View style={[styles.purchasedButton, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
              <Text style={styles.purchasedButtonText}>You have access</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.purchaseButton, { backgroundColor: primary }]}
              onPress={handlePurchase}
              disabled={purchasing}
              activeOpacity={0.8}
            >
              {purchasing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="cart-outline" size={20} color="#FFF" />
                  <Text style={styles.purchaseButtonText}>
                    {listing.price > 0 ? `Buy · $${listing.price.toFixed(2)}` : 'Get Access'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {!purchased && !isOwnListing && (
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
    fontSize: 18,
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
  videoPlayer: {
    width: '100%',
    height: 220,
  },
  drillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  drillIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillRowTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  drillRowMeta: {
    fontSize: 14,
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
    shadowColor: '#8A1C22',
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
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  videoActivePlaceholder: {
    alignItems: 'center',
    gap: 12,
  },
  videoActiveText: {
    fontSize: 15,
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
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listingTitle: {
    fontSize: 21,
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
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 4,
  },
  ratingCount: {
    fontSize: 15,
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
    fontSize: 17.5,
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
    fontSize: 16.5,
    fontWeight: '700',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  verifiedText: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '600',
  },
  coachTitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  coachMeta: {
    fontSize: 13,
  },
  viewProfileLink: {
    fontSize: 15,
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
    fontSize: 17.5,
    fontWeight: '700',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 23,
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
    fontSize: 16,
    lineHeight: 23,
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
    fontSize: 14,
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
    fontSize: 14,
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
    fontSize: 18,
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
    fontSize: 18,
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
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
    marginLeft: 4,
  },

  bottomSpacer: {
    height: 24,
  },
});
