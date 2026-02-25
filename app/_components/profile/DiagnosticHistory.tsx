import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, TextInput, FlatList,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { supabase } from "@/SupabaseConfig";

type RootStackParamList = { ProfilePage: undefined; DiagnosticHistory: undefined };
type NavigationProp = StackNavigationProp<RootStackParamList, "DiagnosticHistory">;

const DiagnosticHistory = () => {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [historyItems, setHistoryItems] = useState<any[]>([]);

  const [diagnosisTitle, setDiagnosisTitle] = useState("");
  const [diagnosisDescription, setDiagnosisDescription] = useState("");
  const [diagnosisDate, setDiagnosisDate] = useState("");
  const [doctor, setDoctor] = useState("");
  const [medication, setMedication] = useState("");

  useEffect(() => { fetchDiagnosticHistory(); }, []);

  const fetchDiagnosticHistory = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("history")
        .select("*")
        .eq("patient_email", user.email)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistoryItems(data || []);
    } catch (error: any) {
      Alert.alert("Error", "Failed to load diagnostic history: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!diagnosisTitle.trim()) {
      Alert.alert("Error", "Please enter a diagnosis title");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("User not authenticated");

      const { error } = await supabase.from("history").insert({
        patient_email: user.email,
        title: diagnosisTitle,
        description: diagnosisDescription,
        date: diagnosisDate,
        doctor: doctor,
        medication: medication,
      });

      if (error) throw error;

      setDiagnosisTitle("");
      setDiagnosisDescription("");
      setDiagnosisDate("");
      setDoctor("");
      setMedication("");
      Alert.alert("Success", "Diagnostic history added successfully");
      fetchDiagnosticHistory();
    } catch (error: any) {
      Alert.alert("Error", "Failed to add diagnostic history: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderHistoryItem = ({ item }: { item: any }) => (
    <View style={styles.historyItem}>
      <Text style={styles.historyTitle}>{item.title}</Text>
      <Text style={styles.historyDate}>{item.date || "No date specified"}</Text>
      {item.description ? <Text style={styles.historyDescription}>{item.description}</Text> : null}
      {item.doctor ? <Text style={styles.historyDoctor}>Doctor: {item.doctor}</Text> : null}
      {item.medication ? <Text style={styles.historyMedication}>Medication: {item.medication}</Text> : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate("ProfilePage")}>
          <FontAwesome name="chevron-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Diagnostic History</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Add New Diagnosis</Text>
          {[
            { label: "Diagnosis Title*", value: diagnosisTitle, onChange: setDiagnosisTitle, placeholder: "Enter diagnosis title" },
            { label: "Date", value: diagnosisDate, onChange: setDiagnosisDate, placeholder: "YYYY-MM-DD" },
            { label: "Doctor", value: doctor, onChange: setDoctor, placeholder: "Doctor's name" },
            { label: "Medication", value: medication, onChange: setMedication, placeholder: "Prescribed medication" },
          ].map(({ label, value, onChange, placeholder }) => (
            <View key={label} style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{label}</Text>
              <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder={placeholder} />
            </View>
          ))}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput style={[styles.input, styles.textArea]} value={diagnosisDescription} onChangeText={setDiagnosisDescription} placeholder="Enter diagnosis details" multiline numberOfLines={4} textAlignVertical="top" />
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>Add to History</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Your History</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#0F6D66" style={styles.loader} />
          ) : historyItems.length === 0 ? (
            <Text style={styles.emptyMessage}>No diagnostic history found</Text>
          ) : (
            <FlatList data={historyItems} renderItem={renderHistoryItem} keyExtractor={(item) => item.id} scrollEnabled={false} />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E6F5F1" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#0F6D66", paddingTop: 60, paddingBottom: 15, paddingHorizontal: 20 },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  content: { flex: 1, padding: 16 },
  formSection: { backgroundColor: "#fff", borderRadius: 10, padding: 16, marginBottom: 20 },
  historySection: { backgroundColor: "#fff", borderRadius: 10, padding: 16, marginBottom: 100 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 16, color: "#333" },
  inputContainer: { marginBottom: 16 },
  inputLabel: { fontSize: 14, marginBottom: 8, color: "#555" },
  input: { backgroundColor: "#f9f9f9", borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, fontSize: 16 },
  textArea: { minHeight: 100 },
  submitButton: { backgroundColor: "#0F6D66", borderRadius: 8, padding: 16, alignItems: "center", marginTop: 8 },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  historyItem: { backgroundColor: "#f9f9f9", borderRadius: 8, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: "#0F6D66" },
  historyTitle: { fontSize: 16, fontWeight: "bold", color: "#333", marginBottom: 4 },
  historyDate: { fontSize: 14, color: "#777", marginBottom: 8 },
  historyDescription: { fontSize: 14, color: "#555", marginBottom: 8 },
  historyDoctor: { fontSize: 14, color: "#555", fontStyle: "italic" },
  historyMedication: { fontSize: 14, color: "#555", fontStyle: "italic" },
  loader: { marginTop: 20 },
  emptyMessage: { textAlign: "center", color: "#777", margin: 20, fontStyle: "italic" },
});

export default DiagnosticHistory;
