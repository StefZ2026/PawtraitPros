import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Platform, AppState,
} from "react-native";
import { fetchQueue, clearSendToken, QueueMessage } from "../services/api";
import { processQueue } from "../services/sms-sender";
import { connectSocket, disconnectSocket } from "../services/socket";
import { signOut } from "../services/auth";

const POLL_INTERVAL = 30_000; // 30 seconds

interface Props {
  onLogout: () => void;
}

export default function SendQueueScreen({ onLogout }: Props) {
  const [messages, setMessages] = useState<QueueMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0 });
  const [connected, setConnected] = useState(false);
  const [autoSendEnabled, setAutoSendEnabled] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sendingRef = useRef(false);

  // Connect WebSocket and listen for new queue items
  useEffect(() => {
    connectSocket(() => {
      // New messages queued — auto-fetch and send
      fetchAndSend();
    }).then((socket) => {
      if (socket) setConnected(true);
    });

    return () => {
      disconnectSocket();
      setConnected(false);
    };
  }, []);

  const fetchAndSend = useCallback(async () => {
    // Prevent concurrent sends
    if (sendingRef.current) return;

    try {
      const msgs = await fetchQueue();
      if (msgs.length === 0) {
        setMessages([]);
        return;
      }

      setMessages(msgs);

      // Auto-send if enabled
      if (autoSendEnabled) {
        sendingRef.current = true;
        setSending(true);
        setProgress({ sent: 0, failed: 0, total: msgs.length });

        const result = await processQueue(msgs, (sent, total) => {
          setProgress(prev => ({ ...prev, sent, total }));
        });

        setProgress({ sent: result.sent, failed: result.failed, total: msgs.length });
        setMessages([]); // Clear after processing
        setSending(false);
        sendingRef.current = false;
      }
    } catch (err: any) {
      console.error("fetchAndSend error:", err.message);
      setSending(false);
      sendingRef.current = false;
    }
  }, [autoSendEnabled]);

  // Load queue on mount
  useEffect(() => {
    fetchAndSend();
  }, [fetchAndSend]);

  // Poll every 30 seconds
  useEffect(() => {
    pollRef.current = setInterval(fetchAndSend, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchAndSend]);

  // Re-fetch when app comes back to foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") fetchAndSend();
    });
    return () => sub.remove();
  }, [fetchAndSend]);

  const handleManualSend = async () => {
    if (messages.length === 0) return;
    sendingRef.current = true;
    setSending(true);
    setProgress({ sent: 0, failed: 0, total: messages.length });

    const result = await processQueue(messages, (sent, total) => {
      setProgress(prev => ({ ...prev, sent, total }));
    });

    setProgress({ sent: result.sent, failed: result.failed, total: messages.length });
    setMessages([]);
    setSending(false);
    sendingRef.current = false;
  };

  const handleLogout = async () => {
    disconnectSocket();
    await clearSendToken();
    await signOut();
    onLogout();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Pawtrait Send</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, connected ? styles.dotOnline : styles.dotOffline]} />
            <Text style={styles.statusText}>
              {connected ? "Connected" : "Offline"}
              {autoSendEnabled ? " · Auto-send on" : ""}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Disconnect</Text>
        </TouchableOpacity>
      </View>

      {/* Auto-send toggle */}
      <View style={styles.autoSendRow}>
        <Text style={styles.autoSendLabel}>Auto-send messages</Text>
        <TouchableOpacity
          style={[styles.toggle, autoSendEnabled && styles.toggleOn]}
          onPress={() => setAutoSendEnabled(!autoSendEnabled)}
        >
          <Text style={[styles.toggleText, autoSendEnabled && styles.toggleTextOn]}>
            {autoSendEnabled ? "ON" : "OFF"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Queue */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7c5832" />
          <Text style={styles.loadingText}>Loading queue...</Text>
        </View>
      ) : sending ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7c5832" />
          <Text style={styles.sendingTitle}>Sending messages...</Text>
          <Text style={styles.progressText}>
            {progress.sent} of {progress.total} sent
          </Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>✓</Text>
          <Text style={styles.emptyTitle}>
            {progress.sent > 0 ? `${progress.sent} sent!` : "No messages waiting"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {progress.sent > 0
              ? `${progress.failed > 0 ? `${progress.failed} failed. ` : ""}Messages delivered from your phone number.`
              : "Messages will appear and send automatically when queued from the dashboard."}
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchAndSend}>
            <Text style={styles.refreshText}>Check Now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.messageCard}>
                <Text style={styles.recipientPhone}>{item.recipient_phone}</Text>
                <Text style={styles.messagePreview} numberOfLines={2}>
                  {item.message_body}
                </Text>
                {item.image_url && (
                  <Text style={styles.hasImage}>📸 Portrait attached</Text>
                )}
              </View>
            )}
          />

          {/* Manual Send Button (only if auto-send is off) */}
          {!autoSendEnabled && (
            <View style={styles.footer}>
              <TouchableOpacity style={styles.sendButton} onPress={handleManualSend}>
                <Text style={styles.sendButtonText}>
                  Send {messages.length} Message{messages.length !== 1 ? "s" : ""}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f0",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotOnline: { backgroundColor: "#22c55e" },
  dotOffline: { backgroundColor: "#ef4444" },
  statusText: {
    fontSize: 12,
    color: "#666",
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "500",
  },
  autoSendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  autoSendLabel: {
    fontSize: 14,
    color: "#1a1a1a",
    fontWeight: "500",
  },
  toggle: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#e5e5e5",
  },
  toggleOn: {
    backgroundColor: "#22c55e",
  },
  toggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#666",
  },
  toggleTextOn: {
    color: "#fff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
  },
  sendingTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    color: "#22c55e",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  refreshButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#7c5832",
  },
  refreshText: {
    color: "#7c5832",
    fontWeight: "500",
  },
  list: {
    padding: 16,
  },
  messageCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recipientPhone: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  messagePreview: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  hasImage: {
    marginTop: 6,
    fontSize: 12,
    color: "#7c5832",
  },
  footer: {
    padding: 16,
    paddingBottom: 34,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  sendButton: {
    backgroundColor: "#7c5832",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  progressText: {
    marginTop: 8,
    fontSize: 15,
    color: "#7c5832",
    fontWeight: "500",
  },
});
