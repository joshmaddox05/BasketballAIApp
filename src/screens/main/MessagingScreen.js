// MessagingScreen.js - Real-time 1:1 chat (inbox + thread) for all roles.
// DBE burgundy redesign (mock 11f) — presentation only: listeners, send,
// compose and read-receipts are unchanged.
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
import { TYPE, FONTS, SHAPE } from '../../utils/typography';
import {
  ScreenHeader,
  HeaderIconButton,
  AttentionDot,
  Entrance,
  EmptyState,
  LoadingState,
} from '../../components/dbe';

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
// Local variant (the dbe Avatar has no photo support): surface2 disc, accent
// initials when the thread needs attention, steel otherwise.
function Avatar({ name, photoURL, size, theme, accent }) {
  if (photoURL) {
    return <Image source={{ uri: photoURL }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.surface2 },
      ]}
    >
      <Text
        style={{
          fontFamily: FONTS.bodyBold,
          fontSize: size * 0.31,
          color: accent ? theme.accentText : theme.steel,
        }}
      >
        {initialsOf(name)}
      </Text>
    </View>
  );
}

// ─── Thread row ──────────────────────────────────────────────────────────────
function ThreadItem({ thread, theme, onPress, delay = 0, last }) {
  return (
    <Entrance variant="slideIn" delay={delay}>
      <TouchableOpacity
        style={[
          styles.threadItem,
          !last && { borderBottomWidth: 1, borderBottomColor: theme.hairline },
        ]}
        onPress={() => onPress(thread)}
        activeOpacity={0.75}
      >
        <Avatar name={thread.name} photoURL={thread.photoURL} size={48} theme={theme} accent={thread.unread} />
        <View style={styles.threadInfo}>
          <View style={styles.threadTopRow}>
            <Text
              numberOfLines={1}
              style={{ flex: 1, fontFamily: FONTS.bodyBold, fontSize: 16, color: theme.text }}
            >
              {thread.name}
            </Text>
            <Text style={{ fontFamily: FONTS.bodyMedium, fontSize: 13, color: theme.textDim }}>
              {thread.time}
            </Text>
          </View>
          <View style={styles.threadBottomRow}>
            <Text
              style={{
                flex: 1,
                fontFamily: thread.unread ? FONTS.bodyBold : FONTS.bodyMedium,
                fontSize: 14.5,
                color: thread.unread ? theme.text : theme.textMuted,
              }}
              numberOfLines={1}
            >
              {thread.lastMessage}
            </Text>
            {thread.unread && (
              <AttentionDot size={8} color={theme.primary} haloColor={theme.pulseDot} delay={delay} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Entrance>
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
      <View style={[styles.chatHeader, { borderBottomColor: theme.hairline }]}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Avatar name={name} photoURL={photoURL} size={34} theme={theme} accent />
        <Text
          numberOfLines={1}
          style={[TYPE.subScreenTitle, { color: theme.text, flex: 1 }]}
        >
          {name}
        </Text>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.messagesContent} showsVerticalScrollIndicator={false}>
        {messages.length === 0 ? (
          <View style={styles.chatEmpty}>
            <Text style={[TYPE.cardBody, { color: theme.textDim }]}>No messages yet</Text>
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
                    : [styles.theirBubble, { backgroundColor: theme.surface }],
                ]}
              >
                <Text
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: 15,
                    lineHeight: 20,
                    color: mine ? '#FFFFFF' : theme.text,
                  }}
                >
                  {msg.text}
                </Text>
                <Text
                  style={{
                    fontFamily: FONTS.bodyMedium,
                    fontSize: 11.5,
                    marginTop: 4,
                    textAlign: 'right',
                    color: mine ? 'rgba(255,255,255,0.65)' : theme.textDim,
                  }}
                >
                  {clockTime(msg.createdAt)}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={[styles.inputBar, { backgroundColor: theme.background, borderTopColor: theme.hairline }]}>
        <TextInput
          style={[
            styles.messageInput,
            {
              backgroundColor: theme.surface,
              color: theme.text,
              borderColor: theme.hairline,
              fontFamily: FONTS.body,
            },
          ]}
          placeholder="Message…"
          placeholderTextColor={theme.textDim}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: inputText.trim() ? theme.primary : theme.buttonDisabled },
          ]}
          onPress={handleSend}
          activeOpacity={0.85}
          disabled={!inputText.trim() || sending}
        >
          <Ionicons name="send" size={17} color="#FFFFFF" />
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
        <ScreenHeader
          title="New Message"
          right={<HeaderIconButton icon="close" onPress={onClose} />}
        />
        <ScrollView contentContainerStyle={{ paddingHorizontal: SHAPE.screenPadding }}>
          {contacts.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="No contacts yet"
              sub="Link with an athlete or coach to start messaging."
            />
          ) : (
            contacts.map((c, i) => (
              <TouchableOpacity
                key={c.uid}
                style={[
                  styles.threadItem,
                  i < contacts.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.hairline },
                ]}
                onPress={() => onPick(c)}
                activeOpacity={0.75}
              >
                <Avatar name={c.name} photoURL={c.photoURL} size={44} theme={theme} />
                <View style={styles.threadInfo}>
                  <Text style={[TYPE.rowTitle, { color: theme.text }]}>{c.name}</Text>
                  {!!c.role && <Text style={[TYPE.rowMeta, { color: theme.textDim }]}>{c.role}</Text>}
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

      <ScreenHeader
        title="Messages"
        subtitle={totalUnread > 0 ? `${totalUnread} unread` : null}
        onBack={() => navigation.goBack()}
        right={<HeaderIconButton icon="create-outline" onPress={openCompose} badge={totalUnread > 0} />}
      />

      {loading ? (
        <LoadingState />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SHAPE.screenPadding, paddingTop: 8 }}
        >
          {conversations.length === 0 ? (
            <EmptyState
              icon="chatbubbles-outline"
              title="No messages yet"
              sub="Message a linked athlete or coach."
              ctaLabel="New message"
              onPress={openCompose}
            />
          ) : (
            conversations.map((thread, i) => (
              <ThreadItem
                key={thread.convId}
                thread={thread}
                theme={theme}
                onPress={openThread}
                delay={i * 100}
                last={i === conversations.length - 1}
              />
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

  threadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 13,
  },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  threadInfo: { flex: 1, minWidth: 0 },
  threadTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  threadBottomRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 6 },

  // Chat view
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SHAPE.screenPadding,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },

  messagesContent: { padding: SHAPE.screenPadding, gap: 10, flexGrow: 1 },
  chatEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  messageBubble: { maxWidth: '80%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: SHAPE.radiusCard },
  myBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  theirBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },

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
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
