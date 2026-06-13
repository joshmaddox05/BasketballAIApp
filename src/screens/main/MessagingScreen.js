// MessagingScreen.js - Shared messaging UI for coach, scout, and parent roles
import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';

const MOCK_THREADS = {
  coach: [
    { id: 't1', name: 'Marcus Johnson', role: 'Athlete', lastMessage: "Coach, when is our next session?", time: '2m', unread: 2, avatar: 'MJ' },
    { id: 't2', name: 'Darius Williams', role: 'Athlete', lastMessage: 'I worked on those footwork drills.', time: '1h', unread: 0, avatar: 'DW' },
    { id: 't3', name: 'Kevin Torres', role: 'Athlete', lastMessage: 'My jumper has been feeling off.', time: '3h', unread: 1, avatar: 'KT' },
    { id: 't4', name: 'Sarah (Parent)', role: 'Parent', lastMessage: "Can we schedule a call to discuss Marcus's progress?", time: '1d', unread: 0, avatar: 'S' },
  ],
  scout: [
    { id: 't1', name: 'Marcus Johnson', role: 'Athlete', lastMessage: 'Thanks for watching my game!', time: '30m', unread: 1, avatar: 'MJ' },
    { id: 't2', name: 'Coach Davis', role: 'Coach', lastMessage: "Here's his updated highlights.", time: '2h', unread: 0, avatar: 'CD' },
    { id: 't3', name: 'TJ Wright', role: 'Athlete', lastMessage: "I'm interested in your program.", time: '1d', unread: 3, avatar: 'TW' },
  ],
  parent: [
    { id: 't1', name: 'Coach Davis', role: 'Coach', lastMessage: "Marcus had a great session today.", time: '1h', unread: 1, avatar: 'CD' },
    { id: 't2', name: 'Marcus Johnson', role: 'Child', lastMessage: 'Mom, can you pick me up at 6?', time: '3h', unread: 0, avatar: 'MJ' },
    { id: 't3', name: 'Academy Admin', role: 'Admin', lastMessage: 'Your payment receipt is attached.', time: '2d', unread: 0, avatar: 'AA' },
  ],
  player: [
    { id: 't1', name: 'Coach Davis', role: 'Coach', lastMessage: 'Great session today. Keep it up!', time: '2h', unread: 0, avatar: 'CD' },
    { id: 't2', name: 'Academy', role: 'Admin', lastMessage: 'Your next session is tomorrow at 4pm.', time: '1d', unread: 1, avatar: 'A' },
  ],
};

const MOCK_MESSAGES = [
  { id: 'm1', from: 'other', text: "Hey, how's your training going?", time: '10:00 AM' },
  { id: 'm2', from: 'me', text: 'Really well! My shot feels great this week.', time: '10:02 AM' },
  { id: 'm3', from: 'other', text: "That's awesome. Keep working on the footwork.", time: '10:05 AM' },
  { id: 'm4', from: 'me', text: "Will do. When's our next session?", time: '10:07 AM' },
  { id: 'm5', from: 'other', text: 'Wednesday at 4pm. I will send you the game plan beforehand.', time: '10:08 AM' },
];

function ThreadItem({ thread, theme, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.threadItem, { borderBottomColor: theme.border }]}
      onPress={() => onPress(thread)}
      activeOpacity={0.75}
    >
      <View style={[styles.avatar, { backgroundColor: theme.primary + '25' }]}>
        <Text style={[styles.avatarText, { color: theme.primary }]}>{thread.avatar}</Text>
      </View>
      <View style={styles.threadInfo}>
        <View style={styles.threadTopRow}>
          <Text style={[styles.threadName, { color: theme.text }]}>{thread.name}</Text>
          <Text style={[styles.threadTime, { color: theme.textSecondary }]}>{thread.time}</Text>
        </View>
        <View style={styles.threadBottomRow}>
          <Text style={[styles.threadLast, { color: theme.textSecondary }]} numberOfLines={1}>
            {thread.lastMessage}
          </Text>
          {thread.unread > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.unreadCount}>{thread.unread}</Text>
            </View>
          )}
        </View>
        <View style={[styles.rolePill, { backgroundColor: theme.border }]}>
          <Text style={[styles.roleText, { color: theme.textSecondary }]}>{thread.role}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ChatView({ thread, theme, onBack }) {
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [inputText, setInputText] = useState('');

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;
    const newMsg = {
      id: Date.now().toString(),
      from: 'me',
      text: inputText.trim(),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
  }, [inputText]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={[styles.chatHeader, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={[styles.chatAvatar, { backgroundColor: theme.primary + '25' }]}>
          <Text style={[styles.chatAvatarText, { color: theme.primary }]}>{thread.avatar}</Text>
        </View>
        <View style={styles.chatHeaderInfo}>
          <Text style={[styles.chatName, { color: theme.text }]}>{thread.name}</Text>
          <Text style={[styles.chatRole, { color: theme.textSecondary }]}>{thread.role}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.from === 'me'
                ? [styles.myBubble, { backgroundColor: theme.primary }]
                : [styles.theirBubble, { backgroundColor: theme.card, borderColor: theme.border }],
            ]}
          >
            <Text style={[styles.messageText, { color: msg.from === 'me' ? '#fff' : theme.text }]}>
              {msg.text}
            </Text>
            <Text
              style={[
                styles.messageTime,
                { color: msg.from === 'me' ? 'rgba(255,255,255,0.65)' : theme.textSecondary },
              ]}
            >
              {msg.time}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.inputBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <TextInput
          style={[styles.messageInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
          placeholder="Message…"
          placeholderTextColor={theme.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: inputText.trim() ? theme.primary : theme.border }]}
          onPress={handleSend}
          activeOpacity={0.85}
          disabled={!inputText.trim()}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function MessagingScreen({ navigation }) {
  const { userData, theme, isDarkMode } = useAppContext();
  const role = userData?.role || 'player';
  const [activeThread, setActiveThread] = useState(null);

  const threads = MOCK_THREADS[role] || MOCK_THREADS.player;
  const totalUnread = threads.reduce((sum, t) => sum + t.unread, 0);

  if (activeThread) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <ChatView thread={activeThread} theme={theme} onBack={() => setActiveThread(null)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Messages</Text>
          {totalUnread > 0 && (
            <Text style={[styles.headerSub, { color: theme.primary }]}>
              {totalUnread} unread
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.composeBtn, { backgroundColor: theme.primary + '18' }]}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {threads.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={44} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No messages yet</Text>
          </View>
        ) : (
          threads.map((thread) => (
            <ThreadItem
              key={thread.id}
              thread={thread}
              theme={theme}
              onPress={setActiveThread}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },
  composeBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },

  threadItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '800' },
  threadInfo: { flex: 1 },
  threadTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  threadName: { fontSize: 15, fontWeight: '700' },
  threadTime: { fontSize: 11 },
  threadBottomRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  threadLast: { flex: 1, fontSize: 13, lineHeight: 18 },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: 8,
  },
  unreadCount: { color: '#fff', fontSize: 11, fontWeight: '800' },
  rolePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  roleText: { fontSize: 10, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },

  // Chat view
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  chatAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  chatAvatarText: { fontSize: 13, fontWeight: '800' },
  chatHeaderInfo: { flex: 1 },
  chatName: { fontSize: 16, fontWeight: '700' },
  chatRole: { fontSize: 12 },

  messagesContent: { padding: 16, gap: 10 },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  myBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  theirBubble: { alignSelf: 'flex-start', borderWidth: 1, borderBottomLeftRadius: 4 },
  messageText: { fontSize: 14, lineHeight: 20 },
  messageTime: { fontSize: 10, marginTop: 4, textAlign: 'right' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
