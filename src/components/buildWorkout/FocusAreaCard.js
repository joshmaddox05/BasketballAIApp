// FocusAreaCard.js - Multi-selectable card for focus area selection
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FocusAreaCard = ({
  focusArea,
  isSelected,
  onToggle,
  animatedScale
}) => {
  const { id, name, icon, color, description } = focusArea;

  return (
    <Animated.View style={{ transform: [{ scale: animatedScale || 1 }] }}>
      <TouchableOpacity
        style={[
          styles.card,
          isSelected && styles.cardSelected,
          isSelected && { borderColor: color }
        ]}
        onPress={() => onToggle(id)}
        activeOpacity={0.7}
      >
        {/* Icon Container */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${color}20` },
            isSelected && { backgroundColor: `${color}30` }
          ]}
        >
          <Ionicons name={icon} size={28} color={color} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={[styles.name, isSelected && { color }]}>{name}</Text>
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        </View>

        {/* Selection Checkbox */}
        <View
          style={[
            styles.checkbox,
            isSelected && styles.checkboxSelected,
            isSelected && { backgroundColor: color, borderColor: color }
          ]}
        >
          {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#2A2A2A'
  },
  cardSelected: {
    backgroundColor: '#1F1F1F'
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14
  },
  content: {
    flex: 1
  },
  name: {
    fontSize: 17.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2
  },
  description: {
    fontSize: 15,
    color: '#888888',
    lineHeight: 19
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#3A3A3A',
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10
  },
  checkboxSelected: {
    borderWidth: 0
  }
});

export default FocusAreaCard;
