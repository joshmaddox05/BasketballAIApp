// ChildSwitcher.js - Pill selector for a parent's linked children (Family Hub).
// Lets a parent switch the active child and add another. Swaps selection only —
// never navigates (design handoff 14e).
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TYPE, SHAPE } from '../../utils/typography';

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
            style={[
              styles.pill,
              active
                ? { backgroundColor: theme.surface }
                : { borderWidth: 1, borderColor: theme.hairline },
            ]}
            onPress={() => onSelect && onSelect(c.uid)}
            activeOpacity={0.8}
          >
            <Text
              numberOfLines={1}
              style={[TYPE.chip, { fontSize: 13, color: active ? theme.text : theme.textDim }]}
            >
              {(c.name || 'Child').split(' ')[0]}
            </Text>
            {active ? (
              <Ionicons name="chevron-down" size={11} color={theme.textDim} />
            ) : null}
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={[styles.pill, { borderWidth: 1, borderColor: theme.hairline }]}
        onPress={onAddChild}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={12} color={theme.accentText} />
        <Text style={[TYPE.chip, { fontSize: 13, color: theme.textDim }]}>Add</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { marginHorizontal: -SHAPE.screenPadding, marginBottom: 12, flexGrow: 0 },
  row: { paddingHorizontal: SHAPE.screenPadding, gap: 7, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: SHAPE.radiusPill,
  },
});
