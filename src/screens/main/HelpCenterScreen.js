import React, { useRef, useState } from 'react';
import { Animated, LayoutAnimation, Platform, SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, Linking, UIManager } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { Entrance } from '../../components/dbe';
import { MOTION } from '../../utils/typography';

// Height is not transform-animatable in RN, so an expanding card is LayoutAnimation's
// job, not Reanimated's. Android needs the experimental flag opted into explicitly.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQS = [
  { q: 'How do I analyze my shot?', a: 'Go to Training → Analyze Your Shot. Record a video from the side angle. The AI will return your biomechanical score and coaching drills in seconds.' },
  { q: 'What is ShotDNA?', a: 'ShotDNA builds your complete basketball identity from uploaded film. It classifies your archetype (e.g. Rhythm Shooter, Athletic Slasher) and creates a verified profile read by every other module.' },
  { q: 'How does EvalRank work?', a: 'EvalRank converts your training activity, ShotDNA scans, and SimCoach sessions into letter-graded scorecards and regional rankings that update automatically.' },
  { q: 'What is Blueprint360?', a: 'Blueprint360 reads your ShotDNA profile and EvalRank scores to generate a personalized day-by-day training plan. When your scores change, the plan adapts automatically.' },
  { q: 'How do I cancel my subscription?', a: 'Go to Profile → Settings → Manage Subscription. You can cancel anytime. Your Pro access continues through the end of the billing period.' },
  { q: 'Why is my ScoutLab profile private?', a: 'Athlete profiles are private by default for safety. Athletes under 18 require explicit guardian consent before their profile becomes visible to scouts.' },
  { q: 'How do I upgrade to Pro?', a: 'Tap the lock icon on any premium feature, or go to Profile → Subscription. All plans include a 7-day free trial.' },
  { q: 'How do coaches sell content on CoachMarket?', a: 'Switch your account role to Coach in Profile → Settings → Account Type. Then navigate to Market → My Content to upload drill packs and courses.' },
];

function Chevron({ expanded, color }) {
  const t = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  React.useEffect(() => {
    Animated.timing(t, {
      toValue: expanded ? 1 : 0,
      duration: MOTION.instant,
      easing: MOTION.easeOut,
      useNativeDriver: true,
    }).start();
  }, [expanded]);
  return (
    <Animated.View
      style={{ transform: [{ rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}
    >
      <Ionicons name="chevron-down" size={18} color={color} />
    </Animated.View>
  );
}

export default function HelpCenterScreen({ navigation }) {
  const { theme, isDarkMode } = useAppContext();
  const [expanded, setExpanded] = useState(null);

  const toggle = (i) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(MOTION.quick, 'easeInEaseOut', 'opacity'));
    setExpanded(expanded === i ? null : i);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Help Center</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: theme.primary }]}>
          <Ionicons name="help-buoy-outline" size={32} color="#fff" />
          <Text style={styles.heroTitle}>How can we help?</Text>
          <Text style={styles.heroSub}>Browse FAQs or contact our support team</Text>
        </View>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Frequently Asked Questions</Text>
        {FAQS.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.faqItem, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => toggle(i)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ expanded: expanded === i }}
            accessibilityLabel={item.q}
          >
            <View style={styles.faqRow}>
              <Text style={[styles.faqQ, { color: theme.text, flex: 1 }]}>{item.q}</Text>
              {/* Rotate one chevron rather than swapping two icon names — a name swap
                  is a second, separate snap on top of the height jump. */}
              <Chevron expanded={expanded === i} color={theme.textSecondary} />
            </View>
            {expanded === i && (
              <Entrance variant="up" duration={MOTION.quick}>
                <Text style={[styles.faqA, { color: theme.textSecondary }]}>{item.a}</Text>
              </Entrance>
            )}
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.contactBtn, { backgroundColor: theme.primary }]} onPress={() => navigation.navigate('ContactUs')} activeOpacity={0.85}>
          <Ionicons name="mail-outline" size={18} color="#fff" />
          <Text style={styles.contactBtnText}>Contact Support</Text>
        </TouchableOpacity>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 19, fontWeight: '700' },
  scroll: { padding: 16, gap: 12 },
  heroCard: { borderRadius: 16, padding: 24, alignItems: 'center', gap: 8, marginBottom: 8 },
  heroTitle: { color: '#fff', fontSize: 21, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 16 },
  sectionTitle: { fontSize: 17.5, fontWeight: '700', marginBottom: 4 },
  faqItem: { borderRadius: 12, borderWidth: 1, padding: 16 },
  faqRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  faqQ: { fontSize: 16, fontWeight: '600' },
  faqA: { fontSize: 15, lineHeight: 21, marginTop: 10 },
  contactBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, marginTop: 8 },
  contactBtnText: { color: '#fff', fontSize: 17.5, fontWeight: '700' },
});
