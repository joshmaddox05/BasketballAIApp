// EditDrillScreen.js - Coach edits or deletes an existing CoachMarket listing.
// Reachable only for DRAFT listings (live listings must be unpublished first).
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { updateCoachMarketListing, deleteCoachMarketListing, getListingMedia } from '../../services/firestoreService';
import DrillListingForm from '../../components/features/DrillListingForm';

export default function EditDrillScreen({ navigation, route }) {
  const { theme, isDarkMode } = useAppContext();
  const listing = route.params?.listing || {};
  const [saving, setSaving] = useState(false);

  // Video URLs no longer live on the listing document — they are in a
  // purchase-gated `media` subcollection. Without re-attaching them here the
  // form would open with empty video slots and the next save would wipe every
  // drill's video. The coach owns this listing, so the rule permits the read.
  const [media, setMedia] = useState(null);
  useEffect(() => {
    if (!listing.id) { setMedia({}); return; }
    let active = true;
    getListingMedia(listing.id).then((m) => { if (active) setMedia(m); });
    return () => { active = false; };
  }, [listing.id]);

  const initial = useMemo(() => {
    if (!media) return null;
    return {
      ...listing,
      drills: (listing.drills || []).map((d, i) => ({
        ...d,
        videoUrl: media[String(i)]?.videoUrl || '',
        storagePath: media[String(i)]?.storagePath || '',
      })),
    };
  }, [listing, media]);

  const handleSubmit = useCallback(async (payload) => {
    if (!listing.id) return;
    setSaving(true);
    try {
      await updateCoachMarketListing(listing.id, payload);
      Alert.alert(
        'Saved',
        payload.status === 'live' ? 'Your listing is now live.' : 'Your changes have been saved as a draft.',
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Error', 'Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [listing.id, navigation]);

  const handleDelete = useCallback(() => {
    Alert.alert('Delete Listing', 'This cannot be undone. Delete this listing?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCoachMarketListing(listing.id);
            navigation.goBack();
          } catch (err) {
            Alert.alert('Error', 'Could not delete. Please try again.');
          }
        },
      },
    ]);
  }, [listing.id, navigation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Edit Listing</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.backBtn}>
          <Ionicons name="trash-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      </View>
      {initial ? (
        <DrillListingForm initial={initial} submitting={saving} onSubmit={handleSubmit} />
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
});
