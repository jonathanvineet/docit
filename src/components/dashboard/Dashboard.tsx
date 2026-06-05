import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
} from "react-native";
const { width } = Dimensions.get("window");
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { supabase } from "@/SupabaseConfig";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { MaterialIcons } from "@expo/vector-icons";
import { startSensorDataCollection } from "../../../services/SensorData";

type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  Dashboard: undefined;
  ProfilePage: undefined;
  EditInfo: undefined;
  Map: undefined;
  Chatbot: undefined;
  SOS: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, "Dashboard">;

interface ConnectionRequest {
  id: string;
  doctor_name: string;
  doctor_email: string;
  patient_email: string;
  doctor_id: string;
  status: string;
  created_at: string;
}

const Dashboard = () => {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [isConnectionRequestModalVisible, setConnectionRequestModalVisible] = useState(false);
  const [healthData, setHealthData] = useState({
    heartRate: "Loading...",
    bloodOxygen: "Loading...",
    motionState: "Loading...",
    lastUpdated: null as string | null,
  });

  useEffect(() => {
    const cleanupSensor = startSensorDataCollection();

    const setupSubscriptions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;

      // Fetch health data via realtime subscription
      const healthChannel = supabase
        .channel("health-data")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "health_data",
            filter: `patient_email=eq.${user.email}`,
          },
          (payload) => {
            const data = payload.new as any;
            setHealthData({
              heartRate: data.heart_rate || "No data",
              bloodOxygen: data.blood_oxygen || "No data",
              motionState: data.motion_state || "No data",
              lastUpdated: data.last_updated || null,
            });
          }
        )
        .subscribe();

      // Initial health data fetch
      const { data: hd } = await supabase
        .from("health_data")
        .select("*")
        .eq("patient_email", user.email)
        .single();
      if (hd) {
        setHealthData({
          heartRate: hd.heart_rate || "No data",
          bloodOxygen: hd.blood_oxygen || "No data",
          motionState: hd.motion_state || "No data",
          lastUpdated: hd.last_updated || null,
        });
      }

      // Fetch connection requests
      const { data: requests } = await supabase
        .from("connection_requests")
        .select("*")
        .eq("patient_email", user.email)
        .eq("status", "pending");

      if (requests && requests.length > 0) {
        setConnectionRequests(requests);
        setConnectionRequestModalVisible(true);
      }

      // Realtime connection requests
      const requestChannel = supabase
        .channel("connection-requests")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "connection_requests",
            filter: `patient_email=eq.${user.email}`,
          },
          (payload) => {
            setConnectionRequests((prev) => [...prev, payload.new as ConnectionRequest]);
            setConnectionRequestModalVisible(true);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(healthChannel);
        supabase.removeChannel(requestChannel);
      };
    };

    const cleanup = setupSubscriptions();
    return () => {
      if (cleanupSensor) cleanupSensor();
      cleanup.then((fn) => fn && fn());
    };
  }, []);

  const handleConnectionRequest = async (requestId: string, accept: boolean) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert("Error", "User not authenticated"); return; }

      const { data: reqData } = await supabase
        .from("connection_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (!reqData) { Alert.alert("Error", "Request not found"); return; }

      if (accept) {
        // Add doctor to patient's connected list
        const { data: patientData } = await supabase
          .from("users")
          .select("connected_doctors")
          .eq("email", user.email!)
          .single();

        const existing = patientData?.connected_doctors || [];
        await supabase.from("users").update({
          connected_doctors: [...existing, reqData.doctor_id],
        }).eq("email", user.email!);

        // Add patient to doctor's connected list
        const { data: doctorData } = await supabase
          .from("doctors")
          .select("connected_patients")
          .eq("id", reqData.doctor_id)
          .single();

        const existingPatients = doctorData?.connected_patients || [];
        await supabase.from("doctors").update({
          connected_patients: [...existingPatients, user.email],
        }).eq("id", reqData.doctor_id);

        Alert.alert("Success", `You are now connected with Dr. ${reqData.doctor_name}`);
      } else {
        Alert.alert("Declined", `Declined connection from Dr. ${reqData.doctor_name}`);
      }

      await supabase.from("connection_requests").delete().eq("id", requestId);
      setConnectionRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (error: any) {
      Alert.alert("Error", "Failed to process the connection request.");
    } finally {
      setLoading(false);
      setConnectionRequestModalVisible(false);
    }
  };

  const healthMetrics = [
    { id: 1, title: "Heart Rate", color: "#FF4B8C", data: healthData.heartRate, icon: "❤️" },
    { id: 2, title: "Blood oxygen", color: "#5677FC", data: healthData.bloodOxygen, icon: "O₂" },
    { id: 3, title: "Motion Status", color: "#4CAF50", data: healthData.motionState, icon: "🏃" },
  ];

  const renderConnectionRequestModal = () => (
    <Modal visible={isConnectionRequestModalVisible} transparent={true} animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Connection Requests</Text>
          <FlatList
            data={connectionRequests}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.requestCard}>
                <View style={styles.requestInfo}>
                  <Text style={styles.doctorName}>Dr. {item.doctor_name}</Text>
                  <Text style={styles.doctorEmail}>{item.doctor_email}</Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => handleConnectionRequest(item.id, true)}
                    disabled={loading}
                  >
                    <Text style={styles.actionButtonText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.declineButton]}
                    onPress={() => handleConnectionRequest(item.id, false)}
                    disabled={loading}
                  >
                    <Text style={styles.actionButtonText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
          <TouchableOpacity style={styles.closeModalButton} onPress={() => setConnectionRequestModalVisible(false)}>
            <Text style={styles.closeModalButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#0F6D66" barStyle="light-content" />
      {renderConnectionRequestModal()}

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => navigation.navigate("SOS")} style={styles.sosButton}>
              <MaterialIcons name="sos" size={20} color="white" />
            </TouchableOpacity>
            {connectionRequests.length > 0 && (
              <TouchableOpacity style={styles.connectionBadge} onPress={() => setConnectionRequestModalVisible(true)}>
                <Text style={styles.connectionBadgeText}>{connectionRequests.length}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <View style={styles.metricsContainer}>
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

      {healthData.lastUpdated && (
        <View style={styles.lastUpdatedContainer}>
          <Text style={styles.lastUpdatedText}>Last updated: {healthData.lastUpdated}</Text>
        </View>
      )}

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate("Chatbot")}>
          <FontAwesome name="comment-o" size={24} color="#999999" />
          <Text style={styles.navText}>Chatbot</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <FontAwesome name="home" size={24} color="#0F6D66" />
          <Text style={styles.activeNavText}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate("ProfilePage")}>
          <FontAwesome name="user-o" size={24} color="#999999" />
          <Text style={styles.navText}>Mine</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { backgroundColor: "#0F6D66", paddingTop: 40, paddingBottom: 15, paddingHorizontal: 20 },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 21, fontWeight: "bold", color: "#FFFFFF" },
  headerRight: { flexDirection: "row", alignItems: "center" },
  sosButton: { backgroundColor: "#FF3B30", width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  metricsContainer: { flex: 1, paddingHorizontal: 0 },
  metricCard: { width: "100%", backgroundColor: "#F5F5F5", borderBottomWidth: 1, borderBottomColor: "#E0E0E0", paddingVertical: 20, paddingHorizontal: 20 },
  metricHeader: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  iconContainer: { width: 50, height: 50, borderWidth: 2, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 15 },
  metricIconText: { fontSize: 20, fontWeight: "bold" },
  metricTitle: { fontSize: 18, fontWeight: "bold" },
  metricDataContainer: { alignItems: "flex-end" },
  metricData: { fontSize: 16 },
  bottomNav: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", borderTopWidth: 1, borderTopColor: "#EEEEEE", backgroundColor: "#FFFFFF", height: 60, paddingBottom: 5 },
  navButton: { alignItems: "center", justifyContent: "center", flex: 1, paddingTop: 10 },
  navText: { fontSize: 12, color: "#999999", marginTop: 4 },
  activeNavText: { fontSize: 12, color: "#0F6D66", fontWeight: "bold", marginTop: 4 },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { width: "90%", backgroundColor: "white", borderRadius: 10, padding: 20, maxHeight: "70%" },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  requestCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F5F5F5", padding: 15, borderRadius: 10, marginBottom: 10 },
  requestInfo: { flex: 1, marginRight: 10 },
  doctorName: { fontSize: 16, fontWeight: "bold" },
  doctorEmail: { fontSize: 14, color: "#666" },
  requestActions: { flexDirection: "row" },
  actionButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 5, marginLeft: 5 },
  acceptButton: { backgroundColor: "#0F6D66" },
  declineButton: { backgroundColor: "#FF6B6B" },
  actionButtonText: { color: "white", fontWeight: "bold" },
  closeModalButton: { marginTop: 15, padding: 10, backgroundColor: "#0F6D66", borderRadius: 5, alignItems: "center" },
  closeModalButtonText: { color: "white", fontWeight: "bold" },
  connectionBadge: { backgroundColor: "red", borderRadius: 15, width: 25, height: 25, justifyContent: "center", alignItems: "center", marginLeft: 10 },
  connectionBadgeText: { color: "white", fontWeight: "bold", fontSize: 12 },
  lastUpdatedContainer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 5 },
  lastUpdatedText: { fontSize: 12, color: "#666", textAlign: "right" },
});

export default Dashboard;
