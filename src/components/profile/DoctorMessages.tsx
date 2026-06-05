import React, { useState, useEffect } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "@/SupabaseConfig";
import FontAwesome from "@expo/vector-icons/FontAwesome";

const DoctorMessages = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<
    { id: string; timestamp: string; content?: string; from_email?: string }[]
  >([]);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("to_email", user.email)
        .eq("to_type", "patient")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const messagesList = (data || []).map((msg) => ({
        id: msg.id,
        content: msg.content,
        from_email: msg.from_email,
        timestamp: msg.created_at
          ? new Date(msg.created_at).toLocaleString()
          : "Unknown time",
      }));

      setMessages(messagesList);

      // Mark unread as read
      const unreadIds = (data || []).filter((m) => !m.read).map((m) => m.id);
      if (unreadIds.length > 0) {
        await supabase.from("messages").update({ read: true }).in("id", unreadIds);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      Alert.alert("Error", "Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: { id: string; timestamp: string; content?: string; from_email?: string } }) => (
    <View style={styles.messageCard}>
      <View style={styles.messageHeader}>
        <View style={styles.doctorInfo}>
          <FontAwesome name="user-md" size={24} color="#0F6D66" style={styles.doctorIcon} />
          <Text style={styles.fromText}>
            From: Dr. {item.from_email?.split("@")[0] ?? "Unknown"}
          </Text>
        </View>
        <Text style={styles.timestamp}>{item.timestamp}</Text>
      </View>
      <View style={styles.messageContent}>
        <Text style={styles.messageText}>{item.content}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <FontAwesome name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Doctor Messages</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchMessages}>
          <FontAwesome name="refresh" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0F6D66" />
        </View>
      ) : (
        <FlatList
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <FontAwesome name="inbox" size={60} color="#CCCCCC" />
              <Text style={styles.emptyText}>No messages from your doctor yet</Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: { backgroundColor: "#0F6D66", paddingTop: 40, paddingBottom: 15, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#FFFFFF" },
  refreshButton: { padding: 5 },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 15, flexGrow: 1 },
  messageCard: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 15, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  messageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, borderBottomWidth: 1, borderBottomColor: "#EEEEEE", paddingBottom: 10 },
  doctorInfo: { flexDirection: "row", alignItems: "center" },
  doctorIcon: { marginRight: 8 },
  fromText: { fontSize: 16, fontWeight: "500", color: "#333333" },
  timestamp: { fontSize: 12, color: "#888888" },
  messageContent: { paddingVertical: 5 },
  messageText: { fontSize: 16, color: "#333333", lineHeight: 22 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyText: { fontSize: 16, color: "#888888", marginTop: 20, textAlign: "center" },
});

export default DoctorMessages;
