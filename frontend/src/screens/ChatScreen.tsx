import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { Screen } from "../components/Screen";
import { colors } from "../theme/colors";
import { useAuth } from "../auth/AuthContext";
import { apiGetRideMessages, type RideMessage } from "../chat/chat.api";
import { emitRealtimeEvent, subscribeRealtimeEvent } from "../realtime/socket";
import { setActiveChatRideId } from "../chat/unreadChatStore";

type Props = NativeStackScreenProps<RootStackParamList, "Chat">;

export function ChatScreen({ route, navigation }: Props) {
  const { rideId } = route.params;
  const auth = useAuth();
  const token = auth.token;

  const [messages, setMessages] = useState<RideMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    setActiveChatRideId(rideId);
    return () => {
      setActiveChatRideId(null);
    };
  }, [rideId]);

  useEffect(() => {
    async function load() {
      if (!token) return;
      try {
        const res = await apiGetRideMessages(token, { rideId });
        setMessages(res.messages);
      } catch (e) {
        console.error("Failed to load messages", e);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [token, rideId]);

  useEffect(() => {
    if (!token) return;
    const cleanup = subscribeRealtimeEvent("chat:message", (msg: any) => {
      if (msg.rideId === rideId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });
    return cleanup;
  }, [token, rideId]);

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages.length]);

  function send() {
    if (!content.trim()) return;
    emitRealtimeEvent("chat:send", { rideId, content: content.trim() });
    setContent("");
  }

  const userId = auth.user?.id;

  return (
    <Screen style={{ padding: 0 }}>
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Chat del Viaje</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.neon} />
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 ? (
              <Text style={styles.emptyText}>No hay mensajes aún.</Text>
            ) : (
              messages.map((m) => {
                const isMe = m.senderId === userId;
                return (
                  <View key={m.id} style={[styles.bubbleWrap, isMe ? styles.bubbleWrapRight : styles.bubbleWrapLeft]}>
                    <View style={[styles.bubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
                      <Text style={[styles.msgText, isMe ? styles.msgTextRight : styles.msgTextLeft]}>
                        {m.content}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={colors.mutedText}
            value={content}
            onChangeText={setContent}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Pressable onPress={send} style={({ pressed }) => [styles.sendBtn, pressed && { opacity: 0.7 }]}>
            <Ionicons name="send" size={20} color={colors.bg} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: colors.mutedText,
    textAlign: "center",
    marginTop: 20,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  bubbleWrap: {
    flexDirection: "row",
    width: "100%",
  },
  bubbleWrapLeft: {
    justifyContent: "flex-start",
  },
  bubbleWrapRight: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  bubbleLeft: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleRight: {
    backgroundColor: colors.neon,
    borderBottomRightRadius: 4,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 20,
  },
  msgTextLeft: {
    color: colors.text,
  },
  msgTextRight: {
    color: colors.bg,
    fontWeight: "600",
  },
  inputArea: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 24, // safe area spacing roughly
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: "center",
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neon,
    alignItems: "center",
    justifyContent: "center",
  },
});
