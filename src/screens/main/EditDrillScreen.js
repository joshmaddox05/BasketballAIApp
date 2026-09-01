// EditDrillScreen.js - Coach edits or deletes an existing CoachMarket listing.
// Reachable only for DRAFT listings (live listings must be unpublished first).
import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { updateCoachMarketListing, deleteCoachMarketListing } from '../../services/firestoreService';
import DrillListingForm from '../../components/features/DrillListingForm';

export default function EditDrillScreen({ navigation, route }) {
  const { theme, isDarkMode } = useAppContext();
  const listing = route.params?.listing || {};
  const [saving, setSaving] = useState(false);

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
      <DrillListingForm initial={listing} submitting={saving} onSubmit={handleSubmit} />
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
});
