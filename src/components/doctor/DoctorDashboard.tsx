import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  StatusBar, ActivityIndicator, FlatList, Alert,
} from "react-native";
const { width } = Dimensions.get("window");
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { supabase } from "@/SupabaseConfig";
import FontAwesome from "@expo/vector-icons/FontAwesome";

type RootStackParamList = {
  Home: undefined;
  DoctorDashboard: undefined;
  ConnectPatient: undefined;
  PatientDetails: { patientId: string };
  DoctorProfile: undefined;
};
type NavigationProp = StackNavigationProp<RootStackParamList, "DoctorDashboard">;
type Patient = { id: string; name: string; email: string };

const DoctorDashboard = () => {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctorName, setDoctorName] = useState("");

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data: doctor } = await supabase
          .from("doctors")
          .select("name, connected_patients")
          .eq("email", user.email)
          .single();

        if (!doctor) { setLoading(false); return; }
        setDoctorName(doctor.name || "Doctor");

        const connectedEmails: string[] = doctor.connected_patients || [];
        if (connectedEmails.length === 0) { setLoading(false); return; }

        const patientsList: Patient[] = [];
        for (const email of connectedEmails) {
          const { data: userData } = await supabase
            .from("users")
            .select("name, email")
            .eq("email", email)
            .single();
          patientsList.push({
            id: email,
            name: userData?.name || "Patient",
            email: email,
          });
        }
        setPatients(patientsList);
      } catch (error: any) {
        Alert.alert("Error", "Failed to load patient data: " + error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  const renderPatientCard = ({ item }: { item: Patient }) => (
    <TouchableOpacity
      style={styles.patientCard}
      onPress={() => navigation.navigate("PatientDetails", { patientId: item.email })}
    >
      <View style={styles.avatarContainer}>
        <FontAwesome name="user-circle" size={40} color="#0F6D66" />
      </View>
      <View style={styles.patientInfo}>
        <Text style={styles.patientName}>{item.name}</Text>
        <Text style={styles.patientEmail}>{item.email}</Text>
      </View>
      <View style={styles.arrowContainer}>
        <FontAwesome name="angle-right" size={24} color="#999999" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#0F6D66" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {doctorName ? `Dr. ${doctorName}'s Dashboard` : "Doctor Dashboard"}
        </Text>
      </View>

      <TouchableOpacity style={styles.connectButton} onPress={() => navigation.navigate("ConnectPatient")}>
        <FontAwesome name="user-plus" size={18} color="#FFFFFF" style={styles.connectIcon} />
        <Text style={styles.connectButtonText}>Connect with Patient</Text>
      </TouchableOpacity>

      <View style={styles.patientListContainer}>
        <Text style={styles.sectionTitle}>Your Patients</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#0F6D66" style={styles.loader} />
        ) : patients.length > 0 ? (
          <FlatList
            data={patients}
            renderItem={renderPatientCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.patientList}
          />
        ) : (
          <View style={styles.emptyState}>
            <FontAwesome name="users" size={60} color="#CCCCCC" />
            <Text style={styles.emptyStateText}>No patients connected yet</Text>
            <Text style={styles.emptyStateSubtext}>Connect with patients to see them here</Text>
          </View>
        )}
      </View>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate("ConnectPatient")}>
          <FontAwesome name="users" size={24} color="#999999" />
          <Text style={styles.navText}>Patients</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <FontAwesome name="home" size={24} color="#0F6D66" />
          <Text style={styles.activeNavText}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate("DoctorProfile")}>
          <FontAwesome name="user-md" size={24} color="#999999" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { backgroundColor: "#0F6D66", paddingTop: 40, paddingBottom: 15, paddingHorizontal: 20 },
  headerTitle: { fontSize: 21, fontWeight: "bold", color: "#FFFFFF" },
  connectButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#0F6D66", paddingVertical: 12, marginHorizontal: 20, marginTop: 15, borderRadius: 8 },
  connectIcon: { marginRight: 8 },
  connectButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  patientListContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15, color: "#333333" },
  patientList: { paddingBottom: 20 },
  patientCard: { flexDirection: "row", backgroundColor: "#F5F5F5", borderRadius: 12, padding: 15, marginBottom: 15, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  avatarContainer: { marginRight: 15 },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 16, fontWeight: "bold", color: "#333333" },
  patientEmail: { fontSize: 14, color: "#666666", marginTop: 2 },
  arrowContainer: { justifyContent: "center", paddingLeft: 10 },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 50 },
  emptyStateText: { fontSize: 18, fontWeight: "bold", color: "#888888", marginTop: 20 },
  emptyStateSubtext: { fontSize: 14, color: "#AAAAAA", marginTop: 8, textAlign: "center" },
  loader: { marginTop: 30 },
  bottomNav: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", borderTopWidth: 1, borderTopColor: "#EEEEEE", backgroundColor: "#FFFFFF", height: 60, paddingBottom: 5 },
  navButton: { alignItems: "center", justifyContent: "center", flex: 1, paddingTop: 10 },
  navText: { fontSize: 12, color: "#999999", marginTop: 4 },
  activeNavText: { fontSize: 12, color: "#0F6D66", fontWeight: "bold", marginTop: 4 },
});

export default DoctorDashboard;
