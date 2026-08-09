// ChildSwitcher.js - Horizontal avatar selector for a parent's linked children
// (Family Hub). Lets a parent switch the active child and add another.
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const initialsFor = (name = '') =>
  name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

export default function ChildSwitcher({ children = [], selectedUid, onSelect, onAddChild, theme }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {children.map((c) => {
        const active = c.uid === selectedUid;
        return (
          <TouchableOpacity
            key={c.uid}
            style={styles.item}
            onPress={() => onSelect && onSelect(c.uid)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.avatar,
                { backgroundColor: theme.primary + (active ? '33' : '18'), borderColor: active ? theme.primary : 'transparent' },
              ]}
            >
              <Text style={[styles.avatarText, { color: theme.primary }]}>{initialsFor(c.name)}</Text>
            </View>
            <Text
              numberOfLines={1}
              style={[styles.name, { color: active ? theme.text : theme.textSecondary, fontWeight: active ? '700' : '500' }]}
            >
              {(c.name || 'Child').split(' ')[0]}
            </Text>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity style={styles.item} onPress={onAddChild} activeOpacity={0.8}>
        <View style={[styles.avatar, styles.addAvatar, { borderColor: theme.border }]}>
          <Ionicons name="add" size={24} color={theme.primary} />
        </View>
        <Text style={[styles.name, { color: theme.textSecondary }]}>Add</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { marginHorizontal: -16, marginBottom: 16 },
  row: { paddingHorizontal: 16, gap: 16, alignItems: 'flex-start' },
  item: { alignItems: 'center', width: 60 },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 6,
  },
  addAvatar: { backgroundColor: 'transparent', borderStyle: 'dashed' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  name: { fontSize: 12, maxWidth: 58, textAlign: 'center' },
});
