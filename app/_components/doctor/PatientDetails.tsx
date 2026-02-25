import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { supabase } from "@/SupabaseConfig";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MedicalHistoryModal from "./MedicalHistoryModal";

type RootStackParamList = {
  DoctorDashboard: undefined;
  PatientDetails: { patientId: string };
};
type PatientDetailsScreenRouteProp = RouteProp<RootStackParamList, "PatientDetails">;
type NavigationProp = StackNavigationProp<RootStackParamList, "PatientDetails">;

const PatientDetails = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PatientDetailsScreenRouteProp>();
  const { patientId } = route.params; // patientId is now patient email

  const [loading, setLoading] = useState(true);
  const [medicalHistoryModalVisible, setMedicalHistoryModalVisible] = useState(false);
  const [patient, setPatient] = useState<{
    id: string; name: string; email: string;
    age?: string; height?: string; weight?: string;
  } | null>(null);
  const [healthData, setHealthData] = useState({
    heartRate: "Loading...",
    bloodOxygen: "Loading...",
    motionState: "Loading...",
    lastUpdated: null as string | null,
  });
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: patientData } = await supabase
          .from("users")
          .select("*")
          .eq("email", patientId)
          .single();

        if (!patientData) {
          Alert.alert("Error", "Patient not found");
          navigation.goBack();
          return;
        }
        setPatient({
          id: patientData.email,
          name: patientData.name || "Unknown",
          email: patientData.email,
          age: patientData.age,
          height: patientData.height,
          weight: patientData.weight,
        });

        const { data: hd } = await supabase
          .from("health_data")
          .select("*")
          .eq("patient_email", patientId)
          .single();

        if (hd) {
          setHealthData({
            heartRate: hd.heart_rate || "No data",
            bloodOxygen: hd.blood_oxygen || "No data",
            motionState: hd.motion_state || "No data",
            lastUpdated: hd.last_updated || null,
          });
        }
      } catch (error: any) {
        Alert.alert("Error", `Failed to load patient details: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to health data changes
    const healthChannel = supabase
      .channel("patient-health")
      .on("postgres_changes", { event: "*", schema: "public", table: "health_data", filter: `patient_email=eq.${patientId}` }, (payload) => {
        const data = payload.new as any;
        setHealthData({
          heartRate: data.heart_rate || "No data",
          bloodOxygen: data.blood_oxygen || "No data",
          motionState: data.motion_state || "No data",
          lastUpdated: data.last_updated || null,
        });
      }).subscribe();

    return () => { supabase.removeChannel(healthChannel); };
  }, [patientId]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) { Alert.alert("Error", "Please enter a message"); return; }
    if (!patient) { Alert.alert("Error", "Patient information is missing"); return; }
    setSendingMessage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("messages").insert({
        from_email: user?.email,
        to_email: patient.email,
        content: messageText,
        read: false,
        from_type: "doctor",
        to_type: "patient",
      });
      if (error) throw error;
      setMessageText("");
      setMessageModalVisible(false);
      Alert.alert("Success", `Message sent to ${patient.name}`);
    } catch (error: any) {
      Alert.alert("Error", `Failed to send message: ${error.message}`);
    } finally {
      setSendingMessage(false);
    }
  };

  const healthMetrics = [
    { id: 1, title: "Heart Rate", color: "#FF4B8C", data: healthData.heartRate, icon: "❤️" },
    { id: 2, title: "Blood oxygen", color: "#5677FC", data: healthData.bloodOxygen, icon: "O₂" },
    { id: 3, title: "Motion Status", color: "#4CAF50", data: healthData.motionState, icon: "🏃" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <FontAwesome name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Patient Details</Text>
        <View style={styles.placeholderView} />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}><ActivityIndicator size="large" color="#0F6D66" /></View>
      ) : (
        <ScrollView style={styles.scrollView}>
          <View style={styles.patientInfoCard}>
            <View style={styles.avatarContainer}><FontAwesome name="user-circle" size={80} color="#0F6D66" /></View>
            <Text style={styles.patientName}>{patient?.name}</Text>
            <Text style={styles.patientEmail}>{patient?.email}</Text>
            <View style={styles.divider} />
            <View style={styles.patientDetailsGrid}>
              {[["Age", patient?.age], ["Weight", patient?.weight], ["Height", patient?.height], ["Last Updated", healthData.lastUpdated || "Never"]].map(([label, val]) => (
                <View key={label} style={styles.detailItem}>
                  <Text style={styles.detailLabel}>{label}</Text>
                  <Text style={styles.detailValue}>{val || "N/A"}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Health Metrics</Text>
            {healthMetrics.map((metric) => (
              <View key={metric.id} style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <View style={[styles.iconContainer, { borderColor: metric.color }]}>
                    <Text style={[styles.metricIconText, { color: metric.color }]}>{metric.icon}</Text>
                  </View>
                  <Text style={[styles.metricTitle, { color: metric.color }]}>{metric.title}</Text>
                </View>
                <View style={styles.metricDataContainer}>
                  <Text style={[styles.metricData, { color: metric.color }]}>{metric.data}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={() => setMessageModalVisible(true)}>
              <FontAwesome name="comment" size={20} color="#FFFFFF" style={styles.actionIcon} />
              <Text style={styles.actionButtonText}>Message Patient</Text>
            </TouchableOpacity>
            <MedicalHistoryModal isVisible={medicalHistoryModalVisible} onClose={() => setMedicalHistoryModalVisible(false)} patientEmail={patient?.email || ""} />
            <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={() => setMedicalHistoryModalVisible(true)}>
              <FontAwesome name="file-text-o" size={20} color="#0F6D66" style={styles.actionIcon} />
              <Text style={styles.secondaryButtonText}>View Medical History</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <Modal animationType="slide" transparent={true} visible={messageModalVisible} onRequestClose={() => setMessageModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Message to {patient?.name}</Text>
              <TouchableOpacity onPress={() => setMessageModalVisible(false)} style={styles.closeButton}>
                <FontAwesome name="times" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <TextInput style={styles.messageInput} placeholder="Type your message here..." value={messageText} onChangeText={setMessageText} multiline numberOfLines={5} textAlignVertical="top" />
            <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage} disabled={sendingMessage}>
              {sendingMessage ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                <>
                  <FontAwesome name="paper-plane" size={18} color="#FFFFFF" style={styles.sendIcon} />
                  <Text style={styles.sendButtonText}>Send Message</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { backgroundColor: "#0F6D66", paddingTop: 40, paddingBottom: 15, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#FFFFFF" },
  placeholderView: { width: 30 },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollView: { flex: 1 },
  patientInfoCard: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 20, margin: 15, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  avatarContainer: { marginBottom: 15 },
  patientName: { fontSize: 22, fontWeight: "bold", color: "#333333" },
  patientEmail: { fontSize: 16, color: "#777777", marginTop: 5 },
  divider: { height: 1, backgroundColor: "#EEEEEE", width: "100%", marginVertical: 15 },
  patientDetailsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", width: "100%" },
  detailItem: { width: "48%", marginBottom: 12 },
  detailLabel: { fontSize: 14, color: "#888888" },
  detailValue: { fontSize: 16, fontWeight: "500", color: "#333333", marginTop: 3 },
  sectionContainer: { paddingHorizontal: 15, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#333333", marginBottom: 15 },
  metricCard: { backgroundColor: "#F5F5F5", borderRadius: 12, padding: 15, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metricHeader: { flexDirection: "row", alignItems: "center" },
  iconContainer: { width: 40, height: 40, borderWidth: 2, borderRadius: 8, justifyContent: "center", alignItems: "center", marginRight: 10 },
  metricIconText: { fontSize: 16, fontWeight: "bold" },
  metricTitle: { fontSize: 16, fontWeight: "bold" },
  metricDataContainer: { alignItems: "flex-end" },
  metricData: { fontSize: 16, fontWeight: "500" },
  actionButtonsContainer: { paddingHorizontal: 15, marginBottom: 20 },
  actionButton: { backgroundColor: "#0F6D66", borderRadius: 8, padding: 15, flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 10 },
  secondaryButton: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#0F6D66" },
  actionIcon: { marginRight: 10 },
  actionButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  secondaryButtonText: { color: "#0F6D66", fontSize: 16, fontWeight: "bold" },
  modalContainer: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 20 },
  modalContent: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#333333" },
  closeButton: { padding: 5 },
  messageInput: { borderWidth: 1, borderColor: "#DDDDDD", borderRadius: 8, padding: 12, minHeight: 120, fontSize: 16 },
  sendButton: { backgroundColor: "#0F6D66", borderRadius: 8, padding: 15, flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 15 },
  sendIcon: { marginRight: 10 },
  sendButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
});

export default PatientDetails;
