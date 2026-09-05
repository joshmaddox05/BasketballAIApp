// ShotDNAArchetypeScreen.js - Archetype detail screen (12a companion — burgundy system)
import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppContext } from '../../context/AppContext';
import {
  Entrance,
  Float,
  ScreenHeader,
  SectionLabel,
  Avatar,
  Row,
} from '../../components/dbe';
import { TYPE, SHAPE, FONTS } from '../../utils/typography';

const initialsOf = (name) =>
  (name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

function ListItem({ icon, iconColor, iconFill, text, theme, delay }) {
  return (
    <Entrance variant="slideIn" delay={delay} style={styles.listRow}>
      <View style={[styles.listIcon, { backgroundColor: iconFill }]}>
        <Ionicons name={icon} size={13} color={iconColor} />
      </View>
      <Text style={[TYPE.tooltipBody, { color: theme.textMuted, flex: 1 }]}>{text}</Text>
    </Entrance>
  );
}

export default function ShotDNAArchetypeScreen({ navigation, route }) {
  const { theme, isDarkMode } = useAppContext();
  // Every field below used to fall back to a fabricated "Pure Scorer" profile
  // complete with invented strengths and a claimed 74% similarity to Ray Allen.
  // A real profile missing a section now renders no section, rather than
  // someone else's.
  const profile = route.params?.profile || {};

  const archetype = profile.archetype || null;
  const icon = profile.icon || 'basketball';
  const roleDescription = profile.roleDescription || null;
  const strengths = profile.strengths || [];
  const improvements = profile.improvements || [];
  const historicalComparisons = profile.historicalComparisons || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <ScreenHeader title="Archetype Profile" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Archetype hero badge */}
        <Entrance variant="cardIn">
          <LinearGradient
            colors={theme.heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.badgeCard}
          >
            <Float duration={3400}>
              <View style={styles.badgeIconCircle}>
                <Ionicons name={icon} size={42} color="#FFFFFF" />
              </View>
            </Float>
            <Text style={styles.badgeLabel}>ARCHETYPE</Text>
            <Text style={styles.badgeName}>{archetype || 'Not yet assigned'}</Text>
            {roleDescription ? (
              <Text style={styles.badgeRole}>{roleDescription}</Text>
            ) : (
              <Text style={styles.badgeRole}>
                Analyse a shot to have an archetype assigned.
              </Text>
            )}
          </LinearGradient>
        </Entrance>

        {/* Strengths */}
        {strengths.length > 0 ? (
        <View style={{ marginTop: SHAPE.sectionGap }}>
          <SectionLabel>Strengths</SectionLabel>
          <Entrance
            variant="cardIn"
            delay={100}
            style={[styles.section, { backgroundColor: theme.surface }]}
          >
            {strengths.map((s, i) => (
              <ListItem
                key={i}
                icon="checkmark"
                iconColor={theme.steel}
                iconFill={theme.steelFill}
                text={s}
                theme={theme}
                delay={150 + i * 90}
              />
            ))}
          </Entrance>
        </View>
        ) : null}

        {/* Improvements */}
        {improvements.length > 0 ? (
        <View style={{ marginTop: SHAPE.sectionGap }}>
          <SectionLabel>Areas to improve</SectionLabel>
          <Entrance
            variant="cardIn"
            delay={200}
            style={[styles.section, { backgroundColor: theme.surface }]}
          >
            {improvements.map((item, i) => (
              <ListItem
                key={i}
                icon="arrow-up"
                iconColor={theme.accentText}
                iconFill={theme.badgeFill}
                text={item}
                theme={theme}
                delay={250 + i * 90}
              />
            ))}
          </Entrance>
        </View>
        ) : null}

        {/* Historical comparisons */}
        {historicalComparisons.length > 0 ? (
        <View style={{ marginTop: SHAPE.sectionGap }}>
          <SectionLabel
            action={`${historicalComparisons.length} player${historicalComparisons.length === 1 ? '' : 's'}`}
          >
            Historical lineage
          </SectionLabel>
          {historicalComparisons.map((player, i) => (
            <Entrance key={player.name || i} variant="slideIn" delay={350 + i * 150}>
              <Row
                style={i > 0 ? { marginTop: 8 } : null}
                leading={<Avatar tone="steel" size={34} initials={initialsOf(player.name)} />}
                title={player.name}
                meta={player.era}
                trailing={
                  player.similarity != null ? (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontFamily: FONTS.bodyExtraBold, fontSize: 16, color: theme.accentText }}>
                        {player.similarity}%
                      </Text>
                      <Text style={[TYPE.chipSmall, { color: theme.textDim, marginTop: 1 }]}>
                        SIMILAR
                      </Text>
                    </View>
                  ) : null
                }
              />
            </Entrance>
          ))}
        </View>
        ) : null}

        {/* View full history */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ShotDNAHistory')}
          style={[styles.historyBtn, { backgroundColor: theme.primary }]}
        >
          <Ionicons name="time-outline" size={16} color="#FFFFFF" />
          <Text style={[TYPE.buttonPrimary, { color: '#FFFFFF' }]}>View full history</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: SHAPE.screenPadding, paddingTop: 14, paddingBottom: 40 },
  badgeCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
  },
  badgeIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  badgeLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11.5,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 5,
  },
  badgeName: {
    fontFamily: FONTS.heading,
    fontSize: 25,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  badgeRole: {
    fontFamily: FONTS.body,
    fontSize: 13.5,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
  },
  section: {
    borderRadius: SHAPE.radiusCard,
    padding: SHAPE.cardPadding,
    gap: 10,
  },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  listIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  historyBtn: {
    marginTop: SHAPE.sectionGap,
    borderRadius: SHAPE.radiusTile,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
});
