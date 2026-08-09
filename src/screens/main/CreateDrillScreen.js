// CreateDrillScreen.js - Coach creates a new CoachMarket listing (single drill or series).
import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { saveCoachMarketListing } from '../../services/firestoreService';
import DrillListingForm from '../../components/features/DrillListingForm';

// Re-exported for backward compatibility with any importers.
export { DRILL_CATEGORIES } from '../../components/features/DrillListingForm';

export default function CreateDrillScreen({ navigation }) {
  const { user, userData, theme, isDarkMode } = useAppContext();
  const coachUid = user?.uid;
  const coachName = userData?.displayName || userData?.name || 'Coach';
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(async (payload) => {
    setSaving(true);
    try {
      await saveCoachMarketListing(coachUid, {
        ...payload,
        coachName,
        sales: 0,
        rating: null,
      });
      Alert.alert(
        payload.status === 'live' ? 'Published' : 'Saved',
        `"${payload.title}" ${payload.status === 'live' ? 'is now live' : 'saved as draft'}.`,
        // Land on the storefront (works whether launched from a tab root or pushed
        // from the dashboard) so the coach sees the updated listings.
        [{ text: 'Done', onPress: () => navigation.navigate('CoachMarketDashboard') }]
      );
    } catch (err) {
      Alert.alert('Error', 'Could not save your drill. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [coachUid, coachName, navigation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>New Listing</Text>
        <View style={{ width: 24 }} />
      </View>
      <DrillListingForm submitting={saving} onSubmit={handleSubmit} />
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
  headerTitle: { fontSize: 18, fontWeight: '700' },
});
