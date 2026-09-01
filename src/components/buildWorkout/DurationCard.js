// DurationCard.js - Selectable card for duration selection (Today/Week/Month)
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DurationCard = ({
  duration,
  isSelected,
  onSelect,
  animatedScale
}) => {
  const { id, name, days, icon, color, description, estimatedTime } = duration;

  return (
    <Animated.View style={{ transform: [{ scale: animatedScale || 1 }] }}>
      <TouchableOpacity
        style={[
          styles.card,
          isSelected && styles.cardSelected,
          isSelected && { borderColor: color }
        ]}
        onPress={() => onSelect(id)}
        activeOpacity={0.7}
      >
        {/* Icon Container */}
        <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={32} color={color} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.name}>{name}</Text>
            <View style={[styles.daysBadge, { backgroundColor: `${color}20` }]}>
              <Text style={[styles.daysText, { color }]}>
                {days === 1 ? '1 Day' : `${days} Days`}
              </Text>
            </View>
          </View>

          <Text style={styles.description}>{description}</Text>

          <View style={styles.footer}>
            <Ionicons name="time-outline" size={14} color="#888888" />
            <Text style={styles.timeText}>{estimatedTime}</Text>
          </View>
        </View>

        {/* Selection Indicator */}
        {isSelected && (
          <View style={[styles.checkmark, { backgroundColor: color }]}>
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#2A2A2A'
  },
  cardSelected: {
    backgroundColor: '#1F1F1F',
    borderWidth: 2
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  content: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  name: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  daysBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  daysText: {
    fontSize: 14,
    fontWeight: '600'
  },
  description: {
    fontSize: 16,
    color: '#AAAAAA',
    marginBottom: 8
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  timeText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#888888'
  },
  checkmark: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  }
});

export default DurationCard;
