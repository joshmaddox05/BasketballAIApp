// ModuleGrid.js - DBE module cards for a role's home.
// Generalised from the player home's DBEHub card row. Each card respects
// subscription tier gating: locked modules show a lock badge and route to the
// Subscription upgrade screen instead of the module.
//
// layout="row"  (default) — compact horizontal scroll (used inside other screens).
// layout="grid"          — 2-column wrapped cards with descriptions, for the Module Hub
//                          where the grid is the primary surface.
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { canAccessFeature } from '../../utils/subscription';

export default function ModuleGrid({
  modules = [],
  subscription = 'free',
  theme,
  navigation,
  title,
  navParams,
  layout = 'row',
}) {
  if (!modules.length) return null;

  const handlePress = (mod, unlocked) =>
    navigation.navigate(unlocked ? mod.key : 'Subscription', unlocked ? navParams : undefined);

  if (layout === 'grid') {
    return (
      <View style={styles.section}>
        {title ? <Text style={[styles.title, { color: theme.text }]}>{title}</Text> : null}
        <View style={styles.gridWrap}>
          {modules.map((mod) => {
            const unlocked = canAccessFeature(mod.feature, subscription);
            return (
              <TouchableOpacity
                key={mod.key}
                style={[styles.gridCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => handlePress(mod, unlocked)}
                activeOpacity={0.85}
              >
                <View style={[styles.icon, { backgroundColor: mod.color + '22' }]}>
                  <Ionicons name={mod.icon} size={24} color={mod.color} />
                  {!unlocked && (
                    <View style={[styles.lockBadge, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Ionicons name="lock-closed" size={10} color={theme.textSecondary} />
                    </View>
                  )}
                </View>
                <Text style={[styles.gridLabel, { color: theme.text }]} numberOfLines={1}>{mod.label}</Text>
                {mod.description ? (
                  <Text style={[styles.gridDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                    {mod.description}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {title ? <Text style={[styles.title, { color: theme.text }]}>{title}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        <View style={styles.row}>
          {modules.map((mod) => {
            const unlocked = canAccessFeature(mod.feature, subscription);
            return (
              <TouchableOpacity
                key={mod.key}
                style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => handlePress(mod, unlocked)}
                activeOpacity={0.8}
              >
                <View style={[styles.icon, { backgroundColor: mod.color + '22' }]}>
                  <Ionicons name={mod.icon} size={22} color={mod.color} />
                  {!unlocked && (
                    <View style={[styles.lockBadge, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Ionicons name="lock-closed" size={10} color={theme.textSecondary} />
                    </View>
                  )}
                </View>
                <Text style={[styles.label, { color: theme.text }]} numberOfLines={2}>{mod.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  scroll: { marginHorizontal: -16 },
  row: { flexDirection: 'row', paddingHorizontal: 16, gap: 10 },
  card: { width: 88, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: 'center', gap: 8 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  lockBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 10, fontWeight: '600', textAlign: 'center', lineHeight: 13 },

  // Grid layout (Module Hub)
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  gridLabel: { fontSize: 15, fontWeight: '700' },
  gridDesc: { fontSize: 12, lineHeight: 16 },
});
