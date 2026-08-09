// MessagingScreen.js - Real-time 1:1 chat (inbox + thread) for all roles.
import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import {
  listenToConversations,
  listenToMessages,
  sendMessage,
  markConversationRead,
  getOrCreateConversation,
  getMessageableContacts,
} from '../../services/firestoreService';

// ─── helpers ────────────────────────────────────────────────────────────────
const toDate = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const initialsOf = (name) =>
  (name || 'User').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

const timeAgo = (value) => {
  const d = toDate(value);
  if (!d) return '';
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

const clockTime = (value) => {
  const d = toDate(value);
  return d ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
};

// Map a conversation doc → the thread shape ThreadItem renders.
const mapThread = (conv, myUid) => {
  const otherUid = (conv.participants || []).find((p) => p !== myUid);
  const info = (conv.participantInfo || {})[otherUid] || {};
  const lastRead = toDate(conv.lastRead?.[myUid]);
  const lastAt = toDate(conv.lastMessageAt);
  const unread = !!conv.lastMessage && conv.lastSenderUid !== myUid && (!lastRead || (lastAt && lastAt > lastRead));
  return {
    convId: conv.id,
    otherUid,
    name: info.name || 'User',
    photoURL: info.photoURL || null,
    lastMessage: conv.lastMessage || 'No messages yet',
    time: timeAgo(conv.lastMessageAt),
    unread,
  };
};

// ─── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ name, photoURL, size, theme }) {
  if (photoURL) {
    return <Image source={{ uri: photoURL }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.primary + '25' }]}>
      <Text style={[styles.avatarText, { color: theme.primary, fontSize: size * 0.34 }]}>{initialsOf(name)}</Text>
    </View>
  );
}

// ─── Thread row ──────────────────────────────────────────────────────────────
function ThreadItem({ thread, theme, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.threadItem, { borderBottomColor: theme.border }]}
      onPress={() => onPress(thread)}
      activeOpacity={0.75}
    >
      <Avatar name={thread.name} photoURL={thread.photoURL} size={48} theme={theme} />
      <View style={styles.threadInfo}>
        <View style={styles.threadTopRow}>
          <Text style={[styles.threadName, { color: theme.text }]}>{thread.name}</Text>
          <Text style={[styles.threadTime, { color: theme.textSecondary }]}>{thread.time}</Text>
        </View>
        <View style={styles.threadBottomRow}>
          <Text
            style={[styles.threadLast, { color: thread.unread ? theme.text : theme.textSecondary, fontWeight: thread.unread ? '700' : '400' }]}
            numberOfLines={1}
          >
            {thread.lastMessage}
          </Text>
          {thread.unread && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Chat view ───────────────────────────────────────────────────────────────
function ChatView({ conversation, myUid, theme, onBack }) {
  const { convId, name, photoURL } = conversation;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!convId) return undefined;
    const unsub = listenToMessages(convId, (msgs) => {
      setMessages(msgs);
      markConversationRead(convId, myUid);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    });
    return () => unsub();
  }, [convId, myUid]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setInputText('');
    setSending(true);
    try {
      await sendMessage(convId, { uid: myUid }, text);
    } catch (_) {
      setInputText(text); // restore on failure
    } finally {
      setSending(false);
    }
  }, [inputText, sending, convId, myUid]);

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
        <Avatar name={name} photoURL={photoURL} size={36} theme={theme} />
        <View style={styles.chatHeaderInfo}>
          <Text style={[styles.chatName, { color: theme.text }]}>{name}</Text>
        </View>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.messagesContent} showsVerticalScrollIndicator={false}>
        {messages.length === 0 ? (
          <View style={styles.chatEmpty}>
            <Text style={[styles.chatEmptyText, { color: theme.textSecondary }]}>
              No messages yet. Say hello 👋
            </Text>
          </View>
        ) : (
          messages.map((msg) => {
            const mine = msg.senderUid === myUid;
            return (
              <View
                key={msg.id}
                style={[
                  styles.messageBubble,
                  mine
                    ? [styles.myBubble, { backgroundColor: theme.primary }]
                    : [styles.theirBubble, { backgroundColor: theme.card, borderColor: theme.border }],
                ]}
              >
                <Text style={[styles.messageText, { color: mine ? '#fff' : theme.text }]}>{msg.text}</Text>
                <Text style={[styles.messageTime, { color: mine ? 'rgba(255,255,255,0.65)' : theme.textSecondary }]}>
                  {clockTime(msg.createdAt)}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={[styles.inputBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <TextInput
          style={[styles.messageInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
          placeholder="Message…"
          placeholderTextColor={theme.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: inputText.trim() ? theme.primary : theme.border }]}
          onPress={handleSend}
          activeOpacity={0.85}
          disabled={!inputText.trim() || sending}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Compose (contact picker) ────────────────────────────────────────────────
function ComposeModal({ visible, contacts, onPick, onClose, theme }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>New Message</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView>
          {contacts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={40} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No contacts yet</Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                Link with an athlete or coach to start messaging.
              </Text>
            </View>
          ) : (
            contacts.map((c) => (
              <TouchableOpacity
                key={c.uid}
                style={[styles.threadItem, { borderBottomColor: theme.border }]}
                onPress={() => onPick(c)}
                activeOpacity={0.75}
              >
                <Avatar name={c.name} photoURL={c.photoURL} size={44} theme={theme} />
                <View style={styles.threadInfo}>
                  <Text style={[styles.threadName, { color: theme.text }]}>{c.name}</Text>
                  {!!c.role && <Text style={[styles.threadTime, { color: theme.textSecondary }]}>{c.role}</Text>}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function MessagingScreen({ navigation, route }) {
  const { user, userData, theme, isDarkMode } = useAppContext();
  const myUid = user?.uid;
  const myName = userData?.displayName || userData?.name || 'Me';
  const myPhoto = userData?.photoURL || null;

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConv, setActiveConv] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [contacts, setContacts] = useState([]);

  // Inbox subscription
  useEffect(() => {
    if (!myUid) { setLoading(false); return undefined; }
    const unsub = listenToConversations(myUid, (convs) => {
      setConversations(convs.map((c) => mapThread(c, myUid)));
      setLoading(false);
    });
    return () => unsub();
  }, [myUid]);

  // Direct-open when navigated with { otherUid, otherName }
  useEffect(() => {
    const otherUid = route.params?.otherUid;
    if (!otherUid || !myUid) return;
    (async () => {
      const convId = await getOrCreateConversation(
        { uid: myUid, name: myName, photoURL: myPhoto },
        { uid: otherUid, name: route.params?.otherName, photoURL: route.params?.otherPhotoURL }
      );
      setActiveConv({ convId, otherUid, name: route.params?.otherName || 'User', photoURL: route.params?.otherPhotoURL || null });
    })();
  }, [route.params?.otherUid]);

  const openThread = useCallback((thread) => {
    setActiveConv({ convId: thread.convId, otherUid: thread.otherUid, name: thread.name, photoURL: thread.photoURL });
  }, []);

  const openCompose = useCallback(async () => {
    setComposeOpen(true);
    setContacts(await getMessageableContacts(myUid));
  }, [myUid]);

  const handlePickContact = useCallback(async (c) => {
    setComposeOpen(false);
    const convId = await getOrCreateConversation(
      { uid: myUid, name: myName, photoURL: myPhoto },
      { uid: c.uid, name: c.name, photoURL: c.photoURL }
    );
    setActiveConv({ convId, otherUid: c.uid, name: c.name, photoURL: c.photoURL });
  }, [myUid, myName, myPhoto]);

  if (activeConv) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <ChatView conversation={activeConv} myUid={myUid} theme={theme} onBack={() => setActiveConv(null)} />
      </SafeAreaView>
    );
  }

  const totalUnread = conversations.filter((t) => t.unread).length;

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
            <Text style={[styles.headerSub, { color: theme.primary }]}>{totalUnread} unread</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.composeBtn, { backgroundColor: theme.primary + '18' }]}
          onPress={openCompose}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {conversations.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={44} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No messages yet</Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                Tap the compose button to message a linked athlete or coach.
              </Text>
            </View>
          ) : (
            conversations.map((thread) => (
              <ThreadItem key={thread.convId} thread={thread} theme={theme} onPress={openThread} />
            ))
          )}
        </ScrollView>
      )}

      <ComposeModal
        visible={composeOpen}
        contacts={contacts}
        onPick={handlePickContact}
        onClose={() => setComposeOpen(false)}
        theme={theme}
      />
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800' },
  threadInfo: { flex: 1 },
  threadTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  threadName: { fontSize: 15, fontWeight: '700' },
  threadTime: { fontSize: 11 },
  threadBottomRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 8 },
  threadLast: { flex: 1, fontSize: 13, lineHeight: 18 },
  unreadDot: { width: 10, height: 10, borderRadius: 5 },

  emptyState: { alignItems: 'center', paddingTop: 80, gap: 8, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },

  // Chat view
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  chatHeaderInfo: { flex: 1 },
  chatName: { fontSize: 16, fontWeight: '700' },

  messagesContent: { padding: 16, gap: 10, flexGrow: 1 },
  chatEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  chatEmptyText: { fontSize: 14 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
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
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
