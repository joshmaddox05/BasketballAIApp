import React from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { SUPPORT_EMAIL } from '../../utils/constants';

const SECTIONS = [
  { title: '1. Information We Collect', body: 'We collect information you provide directly (name, email, profile data), information generated through app use (training sessions, video uploads, AI analysis results, challenge activity), and device information (device type, OS version, push notification token).' },
  { title: '2. How We Use Your Information', body: 'We use collected information to provide and improve the DBE ecosystem, generate personalized training plans and evaluations, match athletes with relevant coaches and scouts (with consent), display community achievements, and send push notifications about your training and milestones.' },
  { title: '3. Youth Safety & Guardian Controls', body: 'Athletes under 18 have private profiles by default. Scout and recruiter visibility requires explicit guardian consent. All scout accounts are manually verified. No direct contact between scouts and minors is permitted outside the platform\'s controlled messaging system.' },
  { title: '4. Data Sharing', body: 'We do not sell your personal data. We share data with Firebase (Google) for database and authentication services, Stripe for payment processing, and our AI analysis server. Scout-facing data is only shared when an athlete (or their guardian) explicitly enables scout visibility.' },
  { title: '5. Video & Biometric Data', body: 'Training videos and biomechanical analysis data are stored securely in Firebase Storage and Firestore. This data is used solely to generate your ShotDNA profile and training recommendations. You may delete your video data at any time from your Profile settings.' },
  { title: '6. Data Retention & Deletion', body: `We retain your account data while your account is active. You can delete your account at any time from Profile → Account & Privacy → Delete Account. Deletion is immediate and permanent: it removes your profile, training history, evaluations, uploaded videos, messages, and the links coaches, scouts or guardians hold to your account. It cannot be undone. If you have any difficulty, contact ${SUPPORT_EMAIL}.` },
  { title: '7. Security', body: 'We use industry-standard encryption for data in transit and at rest. Firebase security rules restrict data access to authenticated users. We conduct regular security reviews of our systems.' },
  { title: '8. Contact', body: `For privacy questions or data deletion requests, contact us at ${SUPPORT_EMAIL} or through the Help Center in the app.` },
];

export default function PrivacyPolicyScreen({ navigation }) {
  const { theme, isDarkMode } = useAppContext();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.updated, { color: theme.textSecondary }]}>Last updated: June 2026</Text>
        {SECTIONS.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{s.title}</Text>
            <Text style={[styles.sectionBody, { color: theme.textSecondary }]}>{s.body}</Text>
          </View>
        ))}
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
  scroll: { padding: 16 },
  updated: { fontSize: 14, marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16.5, fontWeight: '700', marginBottom: 8 },
  sectionBody: { fontSize: 16, lineHeight: 23 },
});
