import React from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';

const SECTIONS = [
  { title: '1. Acceptance of Terms', body: 'By creating an account or using the DBE app, you agree to these Terms of Service. If you are under 18, your parent or guardian must review and accept these terms on your behalf.' },
  { title: '2. Account Registration', body: 'You must provide accurate information when creating your account. You are responsible for maintaining the security of your account credentials. Notify us immediately if you suspect unauthorized access.' },
  { title: '3. User Roles & Permissions', body: 'The platform supports Athlete, Coach, Scout/Recruiter, and Parent/Guardian roles. Scout accounts require manual verification before activation. Coaches who sell content through CoachMarket agree to our Seller Terms, available separately.' },
  { title: '4. Youth Protection', body: 'We take youth safety seriously. Athletes under 18 have private profiles by default. Scout contact with minor athletes is not permitted outside the platform\'s controlled contact system and requires explicit guardian consent.' },
  { title: '5. Content & Uploads', body: 'You retain ownership of videos and content you upload. By uploading, you grant us a license to use that content to provide our services (analysis, profile generation, community sharing if you choose). You may not upload content that depicts illegal activity or violates others\' rights.' },
  { title: '6. Subscriptions & Payments', body: 'Paid subscriptions are billed monthly. Cancellation takes effect at the end of the current billing period. No refunds are provided for partial billing periods. CoachMarket transactions are processed through Stripe and subject to Stripe\'s terms.' },
  { title: '7. Prohibited Conduct', body: 'You may not use the platform to harass other users, share false information, attempt to circumvent youth safety controls, scrape or copy athlete data, or impersonate scouts, coaches, or platform staff.' },
  { title: '8. Limitation of Liability', body: 'The DBE platform is provided "as is." We are not responsible for decisions made based on AI analysis results, training plans, or evaluation scores. These are tools to support development, not professional medical or sports science advice.' },
  { title: '9. Changes to Terms', body: 'We may update these terms from time to time. We will notify you of significant changes via the app or email. Continued use after notification constitutes acceptance.' },
  { title: '10. Contact', body: 'For questions about these terms, contact legal@dbeapp.com.' },
];

export default function TermsOfServiceScreen({ navigation }) {
  const { theme, isDarkMode } = useAppContext();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Terms of Service</Text>
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
