// ModuleGrid.js - Horizontal row of DBE module cards for a role's home.
// Generalised from the player home's DBEHub card row. Each card respects
// subscription tier gating: locked modules show a lock badge and route to the
// Subscription upgrade screen instead of the module.
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { canAccessFeature } from '../../utils/subscription';

export default function ModuleGrid({ modules = [], subscription = 'free', theme, navigation, title }) {
  if (!modules.length) return null;

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
                onPress={() => navigation.navigate(unlocked ? mod.key : 'Subscription')}
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
});
