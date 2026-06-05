import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { supabase } from "@/SupabaseConfig";
import FontAwesome from "@expo/vector-icons/FontAwesome";

type RootStackParamList = { DoctorDashboard: undefined; ConnectPatient: undefined };
type NavigationProp = StackNavigationProp<RootStackParamList, "ConnectPatient">;

const ConnectPatient = () => {
  const navigation = useNavigation<NavigationProp>();
  const [patientEmail, setPatientEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [foundPatient, setFoundPatient] = useState<{ id: string; name: string; email: string } | null>(null);

  const searchPatient = async () => {
    if (!patientEmail || !patientEmail.includes("@")) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("email, name")
        .eq("email", patientEmail.trim())
        .single();

      if (error || !data) {
        Alert.alert("Patient Not Found", "No patient found with this email address.");
        setFoundPatient(null);
      } else {
        setFoundPatient({ id: data.email, name: data.name || "Unknown", email: data.email });
      }
    } catch (error: any) {
      Alert.alert("Error", "An error occurred while searching.");
    } finally {
      setLoading(false);
    }
  };

  const sendConnectionRequest = async () => {
    if (!foundPatient) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert("Error", "You must be logged in."); return; }

      const { data: doctor } = await supabase
        .from("doctors")
        .select("id, name, email")
        .eq("email", user.email)
        .single();

      if (!doctor) { Alert.alert("Error", "Doctor profile not found."); return; }

      const { error } = await supabase.from("connection_requests").insert({
        patient_email: foundPatient.email,
        doctor_id: doctor.id,
        doctor_name: doctor.name,
        doctor_email: doctor.email,
        status: "pending",
      });

      if (error) throw error;

      Alert.alert("Request Sent", `A connection request has been sent to ${foundPatient.name}.`, [
        { text: "OK", onPress: () => navigation.navigate("DoctorDashboard") },
      ]);
    } catch (error: any) {
      Alert.alert("Error", "Failed to send connection request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <FontAwesome name="arrow-left" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Connect with Patient</Text>
          <View style={styles.placeholderView} />
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.instructionText}>Enter the patient's email address to send a connection request.</Text>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.input}
              placeholder="Patient Email"
              value={patientEmail}
              onChangeText={setPatientEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.searchButton} onPress={searchPatient} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.searchButtonText}>Search</Text>}
            </TouchableOpacity>
          </View>

          {foundPatient && (
            <View style={styles.patientCardContainer}>
              <View style={styles.patientCard}>
                <View style={styles.avatarContainer}>
                  <FontAwesome name="user-circle" size={50} color="#0F6D66" />
                </View>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{foundPatient.name}</Text>
                  <Text style={styles.patientEmail}>{foundPatient.email}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.connectButton} onPress={sendConnectionRequest} disabled={loading}>
                {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                  <>
                    <FontAwesome name="link" size={16} color="#FFFFFF" style={styles.connectIcon} />
                    <Text style={styles.connectButtonText}>Send Request</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { flexGrow: 1 },
  header: { backgroundColor: "#0F6D66", paddingTop: 40, paddingBottom: 15, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#FFFFFF" },
  placeholderView: { width: 30 },
  contentContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 25 },
  instructionText: { fontSize: 16, color: "#555555", marginBottom: 20, textAlign: "center" },
  searchContainer: { flexDirection: "row", marginBottom: 30 },
  input: { flex: 1, height: 50, borderWidth: 1, borderColor: "#DDDDDD", borderRadius: 8, paddingHorizontal: 15, fontSize: 16, backgroundColor: "#F9F9F9" },
  searchButton: { backgroundColor: "#0F6D66", paddingHorizontal: 20, justifyContent: "center", alignItems: "center", borderTopRightRadius: 8, borderBottomRightRadius: 8, marginLeft: -1 },
  searchButtonText: { color: "#FFFFFF", fontWeight: "bold" },
  patientCardContainer: { alignItems: "center" },
  patientCard: { backgroundColor: "#F5F5F5", borderRadius: 12, padding: 20, flexDirection: "row", alignItems: "center", width: "100%", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2, marginBottom: 20 },
  avatarContainer: { marginRight: 15 },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 18, fontWeight: "bold", color: "#333333" },
  patientEmail: { fontSize: 16, color: "#666666", marginTop: 5 },
  connectButton: { backgroundColor: "#0F6D66", flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8, width: "50%" },
  connectIcon: { marginRight: 8 },
  connectButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
});

export default ConnectPatient;
