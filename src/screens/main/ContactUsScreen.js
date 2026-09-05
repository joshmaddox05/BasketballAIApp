import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '../../utils/constants';

export default function ContactUsScreen({ navigation }) {
  const { theme, isDarkMode, userData } = useAppContext();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) { Alert.alert('Missing Info', 'Please fill in both subject and message.'); return; }
    setSending(true);
    await new Promise(r => setTimeout(r, 800));
    setSending(false);
    Alert.alert('Message Sent', 'Our team will respond within 24 hours.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Contact Us</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="time-outline" size={18} color={theme.primary} />
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>We respond within 24 hours, Monday–Friday.</Text>
        </View>
        <Text style={[styles.label, { color: theme.text }]}>Subject</Text>
        <TextInput style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]} placeholder="What do you need help with?" placeholderTextColor={theme.textSecondary} value={subject} onChangeText={setSubject} />
        <Text style={[styles.label, { color: theme.text }]}>Message</Text>
        <TextInput style={[styles.textArea, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]} placeholder="Describe your issue or question..." placeholderTextColor={theme.textSecondary} value={message} onChangeText={setMessage} multiline numberOfLines={6} textAlignVertical="top" />
        <TouchableOpacity style={[styles.sendBtn, { backgroundColor: sending ? theme.border : theme.primary }]} onPress={handleSend} disabled={sending} activeOpacity={0.85}>
          <Text style={styles.sendBtnText}>{sending ? 'Sending…' : 'Send Message'}</Text>
        </TouchableOpacity>
        <View style={[styles.divider, { borderColor: theme.border }]} />
        <TouchableOpacity style={styles.emailRow} onPress={() => Linking.openURL(SUPPORT_MAILTO)}>
          <Ionicons name="mail-outline" size={18} color={theme.primary} />
          <Text style={[styles.emailText, { color: theme.primary }]}>{SUPPORT_EMAIL}</Text>
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
  scroll: { padding: 16, gap: 14 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, padding: 14 },
  infoText: { flex: 1, fontSize: 15 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: -6 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  textArea: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, minHeight: 130 },
  sendBtn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  sendBtnText: { color: '#fff', fontSize: 17.5, fontWeight: '700' },
  divider: { borderTopWidth: 1, marginVertical: 4 },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  emailText: { fontSize: 16, fontWeight: '600' },
});
