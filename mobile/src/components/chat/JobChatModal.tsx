/**
 * Menial Mobile - Section 48 Job-Scoped Chat Modal
 * 
 * Complies with Section 48 of the Master Specification:
 * - Real-time Supabase CDC websocket message delivery
 * - Strictly scoped to a single active job assignment
 * - Terminal read-only lock upon job completion or cancellation (§48)
 * - Offline-first mutation queuing via OfflineSyncService (§51)
 * - Optimistic local message insertion
 * 
 * Reference: menial-master-spec-v2.md (§48, §51)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Colors, Spacing, Radii, Typography } from '../../constants/theme';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { ApiService, JobMessage, JobConversation } from '../../services/api';
import { RealtimeSyncService, OfflineSyncService } from '../../services/supabase';

export interface JobChatModalProps {
  visible: boolean;
  onClose: () => void;
  jobId: string;
  publicJobId: string;
  jobTitle: string;
  jobStatus: string;
  currentUserRole: 'employer' | 'worker';
  counterpartyName: string;
}

export const JobChatModal: React.FC<JobChatModalProps> = ({
  visible,
  onClose,
  jobId,
  publicJobId,
  jobTitle,
  jobStatus,
  currentUserRole,
  counterpartyName,
}) => {
  const [conversation, setConversation] = useState<JobConversation | null>(null);
  const [messages, setMessages] = useState<JobMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const isTerminalLocked =
    jobStatus === 'completed' ||
    jobStatus === 'cancelled' ||
    conversation?.isTerminalLocked === true;

  // Load conversation & initial messages
  useEffect(() => {
    if (visible && jobId) {
      const conv = ApiService.getJobConversation(jobId);
      setConversation(conv);
      const msgs = ApiService.getJobMessages(conv.id);
      setMessages(msgs);

      // Register offline queue handler
      OfflineSyncService.registerHandler('SEND_CHAT_MESSAGE', async (payload) => {
        await ApiService.sendJobMessage(payload.conversationId, payload.body, payload.senderType);
        return true;
      });

      // Subscribe to real-time chat messages via Supabase Realtime
      const unsubscribe = RealtimeSyncService.subscribeToJobChat(conv.id, (incomingMsg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === incomingMsg.id)) {
            return prev;
          }
          return [...prev, incomingMsg as JobMessage];
        });
      });

      return () => {
        unsubscribe();
      };
    }
  }, [visible, jobId]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !conversation || isTerminalLocked) return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      if (!OfflineSyncService.getNetworkStatus()) {
        // Enqueue offline action (§51)
        await OfflineSyncService.enqueue('SEND_CHAT_MESSAGE', {
          conversationId: conversation.id,
          body: text,
          senderType: currentUserRole,
        });

        // Optimistic local bubble
        const optimisticMsg: JobMessage = {
          id: `opt_${Date.now()}`,
          conversationId: conversation.id,
          jobId,
          senderId: currentUserRole === 'employer' ? conversation.employerId : conversation.workerId,
          senderType: currentUserRole,
          body: text,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimisticMsg]);
      } else {
        const sent = await ApiService.sendJobMessage(conversation.id, text, currentUserRole);
        // Also emit over fallback broadcast in case dev mock is listening
        RealtimeSyncService.mockEmitChatMessage(conversation.id, sent);
        setMessages((prev) => {
          if (prev.some((m) => m.id === sent.id)) return prev;
          return [...prev, sent];
        });
      }
    } catch (err) {
      Alert.alert('Unable to Send', (err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderMessageItem = ({ item }: { item: JobMessage }) => {
    const isMe = item.senderType === currentUserRole;

    if (item.senderType === 'system') {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessageText}>ℹ️ {item.body}</Text>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.messageRowMe : styles.messageRowThem,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMe ? styles.messageBubbleMe : styles.messageBubbleThem,
          ]}
        >
          <Text
            style={[
              styles.senderRoleTag,
              isMe ? styles.senderRoleTagMe : styles.senderRoleTagThem,
            ]}
          >
            {isMe ? 'You' : counterpartyName}
          </Text>
          <Text
            style={[
              styles.messageText,
              isMe ? styles.messageTextMe : styles.messageTextThem,
            ]}
          >
            {item.body}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isMe ? styles.messageTimeMe : styles.messageTimeThem,
            ]}
          >
            {formatMessageTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close conversation"
          >
            <Text style={styles.closeBtnText}>← Close</Text>
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.headerName}>{counterpartyName}</Text>
            <Text style={styles.headerSub}>
              {publicJobId} · {jobTitle}
            </Text>
          </View>
          <Badge
            label={isTerminalLocked ? 'LOCKED' : 'LIVE'}
            type={isTerminalLocked ? 'neutral' : 'verified'}
          />
        </View>

        {/* Terminal Status Read-Only Lock Banner (§48) */}
        {isTerminalLocked ? (
          <View style={styles.terminalBanner}>
            <Text style={styles.terminalIcon}>🔒</Text>
            <View style={styles.terminalTextGroup}>
              <Text style={styles.terminalTitle}>Conversation Archived & Locked (§48)</Text>
              <Text style={styles.terminalDesc}>
                This job has reached terminal status ({jobStatus.toUpperCase()}). Messaging is read-only for audit compliance.
              </Text>
            </View>
          </View>
        ) : null}

        {/* Message Stream */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>Direct Job-Scoped Chat</Text>
              <Text style={styles.emptySubtitle}>
                Coordinate arrival directions, gate access, or site requirements safely within Menial.
              </Text>
            </View>
          }
        />

        {/* Bottom Input Bar */}
        <View style={styles.inputContainer}>
          {isTerminalLocked ? (
            <View style={styles.lockedInputBar}>
              <Text style={styles.lockedInputText}>
                🔒 Chat closed for completed assignments (§48).
              </Text>
            </View>
          ) : (
            <View style={styles.activeInputRow}>
              <TextInput
                style={styles.textInput}
                placeholder="Type your message..."
                placeholderTextColor={Colors.textMuted}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                editable={!sending}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!inputText.trim() || sending) && styles.sendButtonDisabled,
                ]}
                onPress={handleSendMessage}
                disabled={!inputText.trim() || sending}
                accessibilityRole="button"
                accessibilityLabel="Send message"
              >
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 54 : Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.md,
  },
  closeBtnText: {
    ...Typography.scale.labelMd,
    color: Colors.primary,
    fontWeight: '700',
  },
  headerTitles: {
    flex: 1,
  },
  headerName: {
    ...Typography.scale.labelLg,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  headerSub: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 11,
  },
  terminalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  terminalIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  terminalTextGroup: {
    flex: 1,
  },
  terminalTitle: {
    ...Typography.scale.labelSm,
    color: '#92400E',
    fontWeight: '700',
  },
  terminalDesc: {
    ...Typography.scale.bodySm,
    color: '#B45309',
    fontSize: 11,
    marginTop: 1,
  },
  messagesList: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowThem: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '78%',
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  messageBubbleMe: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleThem: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
  },
  senderRoleTag: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  senderRoleTagMe: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'right',
  },
  senderRoleTagThem: {
    color: Colors.secondaryText,
  },
  messageText: {
    ...Typography.scale.bodyMd,
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextMe: {
    color: Colors.primaryOn,
  },
  messageTextThem: {
    color: Colors.textPrimary,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 3,
  },
  messageTimeMe: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  messageTimeThem: {
    color: Colors.textMuted,
  },
  systemMessageContainer: {
    alignSelf: 'center',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginVertical: Spacing.sm,
  },
  systemMessageText: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 11,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xxl * 2,
    paddingHorizontal: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 44,
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.scale.headlineSm,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  emptySubtitle: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  inputContainer: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  activeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm : Spacing.xs,
    ...Typography.scale.bodyMd,
    color: Colors.textPrimary,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginLeft: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.border,
  },
  sendButtonText: {
    ...Typography.scale.labelMd,
    color: Colors.primaryOn,
    fontWeight: '700',
  },
  lockedInputBar: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radii.md,
  },
  lockedInputText: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
