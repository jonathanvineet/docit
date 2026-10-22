import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "expo-router/react-navigation";
import { NativeStackNavigationProp } from "expo-router/native-stack";
import { getBackendUrl, fetchWithTimeout } from "@/src/utils/backend";
import { getOfflineReply, OFFLINE_DISCLAIMER } from "@/src/utils/firstAidBot";

type RootStackParamList = { Dashboard: undefined; ProfilePage: undefined; Chatbot: undefined; SOS: undefined };
type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Chatbot">;

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: "claude" | "offline";
  createdAt: string;
};

const STORAGE_KEY = "chatbotHistory";
const SUGGESTIONS = ["How do I do CPR?", "Is 105 BPM heart rate normal?", "How to treat a burn?", "What is a normal SpO2?"];

const welcome: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: `Hi! I'm the ResQmate assistant. Ask me first-aid or health questions.\n\n${OFFLINE_DISCLAIMER}`,
  source: "offline",
  createdAt: new Date().toISOString(),
};

const Chatbot = () => {
  const navigation = useNavigation<NavigationProp>();
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // Restore the previous conversation
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
        }
      })
      .catch(() => {});
  }, []);

  const persist = (list: ChatMessage[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-50))).catch(() => {});
  };

  // Claude via the backend when configured; otherwise the offline guide
  const askAssistant = async (history: ChatMessage[]): Promise<{ reply: string; source: "claude" | "offline" }> => {
    const question = history[history.length - 1].content;
    try {
      const res = await fetchWithTimeout(
        `${getBackendUrl()}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history.filter((m) => m.id !== "welcome").map(({ role, content }) => ({ role, content })),
          }),
        },
        20000
      );
      if (res.ok) {
        const data = await res.json();
        if (data.reply) return { reply: data.reply, source: "claude" };
      }
    } catch {
      // backend unreachable — fall through to offline answer
    }
    return { reply: getOfflineReply(question), source: "offline" };
  };

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    if (content.length > 1000) {
      Alert.alert("Too long", "Please keep your question under 1000 characters.");
      return;
    }
    const userMsg: ChatMessage = { id: `u${Date.now()}`, role: "user", content, createdAt: new Date().toISOString() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setSending(true);
    const { reply, source } = await askAssistant(next);
    const botMsg: ChatMessage = { id: `a${Date.now()}`, role: "assistant", content: reply, source, createdAt: new Date().toISOString() };
    const final = [...next, botMsg];
    setMessages(final);
    persist(final);
    setSending(false);
  };

  const clearChat = () => {
    setMessages([welcome]);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const mine = item.role === "user";
    return (
      <View style={[styles.bubbleRow, mine ? styles.rowRight : styles.rowLeft]}>
        <View style={[styles.bubble, mine ? styles.userBubble : styles.botBubble]}>
          <Text style={[styles.bubbleText, mine && styles.userText]}>{item.content}</Text>
          {!mine && item.id !== "welcome" && (
            <Text style={styles.sourceTag}>{item.source === "claude" ? "AI assistant" : "Offline first-aid guide"}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate("Dashboard")}>
          <FontAwesome name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Assistant</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={clearChat}>
          <FontAwesome name="trash-o" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={sending ? <ActivityIndicator color="#0F6D66" style={{ marginTop: 8 }} /> : null}
      />

      {messages.length <= 1 && (
        <View style={styles.suggestions}>
          {SUGGESTIONS.map((s) => (
            <TouchableOpacity key={s} style={styles.chip} onPress={() => send(s)}>
              <Text style={styles.chipText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask a health question..."
          placeholderTextColor="#888"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send()}
          returnKeyType="send"
          editable={!sending}
        />
        <TouchableOpacity style={[styles.sendBtn, (!input.trim() || sending) && styles.sendDisabled]} onPress={() => send()} disabled={!input.trim() || sending}>
          <FontAwesome name="paper-plane" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: { backgroundColor: "#0F6D66", paddingTop: 40, paddingBottom: 15, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#FFFFFF" },
  list: { padding: 15, flexGrow: 1 },
  bubbleRow: { flexDirection: "row", marginBottom: 10 },
  rowLeft: { justifyContent: "flex-start" },
  rowRight: { justifyContent: "flex-end" },
  bubble: { maxWidth: "85%", borderRadius: 14, padding: 12 },
  botBubble: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 4 },
  userBubble: { backgroundColor: "#0F6D66", borderTopRightRadius: 4 },
  bubbleText: { fontSize: 15, color: "#333333", lineHeight: 21 },
  userText: { color: "#FFFFFF" },
  sourceTag: { fontSize: 11, color: "#999999", marginTop: 6 },
  suggestions: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, paddingBottom: 8 },
  chip: { borderWidth: 1, borderColor: "#0F6D66", borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, margin: 4, backgroundColor: "#FFFFFF" },
  chipText: { color: "#0F6D66", fontSize: 13 },
  inputRow: { flexDirection: "row", alignItems: "center", padding: 10, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#EEEEEE" },
  input: { flex: 1, height: 44, borderWidth: 1, borderColor: "#DDDDDD", borderRadius: 22, paddingHorizontal: 16, fontSize: 15, backgroundColor: "#F9F9F9" },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#0F6D66", justifyContent: "center", alignItems: "center", marginLeft: 8 },
  sendDisabled: { opacity: 0.5 },
});

export default Chatbot;
