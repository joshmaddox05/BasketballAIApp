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

const MOCK_PROFILE = {
  archetype: 'Pure Scorer',
  icon: 'basketball',
  roleDescription:
    'A high-efficiency offensive player whose shooting mechanics are optimized for volume scoring. You thrive in isolation and catch-and-shoot scenarios.',
  strengths: [
    'Exceptional shooting consistency from mid-range',
    'Quick, repeatable release point under pressure',
    'Strong offensive footwork and balance',
  ],
  improvements: [
    'Develop off-hand finishing for more balanced attack',
    'Increase arc height on long-range attempts',
    'Improve footwork when attacking left side',
  ],
  historicalComparisons: [
    { name: 'Ray Allen', era: '1996–2014', similarity: 74 },
    { name: 'Reggie Miller', era: '1987–2005', similarity: 68 },
  ],
};

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
  const profile = route.params?.profile || MOCK_PROFILE;

  const archetype = profile.archetype || MOCK_PROFILE.archetype;
  const icon = profile.icon || MOCK_PROFILE.icon;
  const roleDescription = profile.roleDescription || MOCK_PROFILE.roleDescription;
  const strengths = profile.strengths || MOCK_PROFILE.strengths;
  const improvements = profile.improvements || MOCK_PROFILE.improvements;
  const historicalComparisons =
    profile.historicalComparisons || MOCK_PROFILE.historicalComparisons;

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
            <Text style={styles.badgeName}>{archetype}</Text>
            <Text style={styles.badgeRole}>{roleDescription}</Text>
          </LinearGradient>
        </Entrance>

        {/* Strengths */}
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

        {/* Improvements */}
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

        {/* Historical comparisons */}
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
