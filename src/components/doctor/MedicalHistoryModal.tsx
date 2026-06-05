import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { supabase } from "@/SupabaseConfig";

type MedicalHistoryModalProps = {
  isVisible: boolean;
  onClose: () => void;
  patientEmail: string;
};

const MedicalHistoryModal = ({
  isVisible,
  onClose,
  patientEmail,
}: MedicalHistoryModalProps) => {
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (!isVisible) {
      setHasFetched(false);
    }

    if (isVisible && patientEmail && patientEmail !== "" && !hasFetched) {
      fetchMedicalHistory();
      setHasFetched(true);
    }
  }, [isVisible, patientEmail, hasFetched]);

  const fetchMedicalHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("history")
        .select("*")
        .eq("patient_email", patientEmail)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (isMounted.current) {
        setHistoryData(data || []);
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Error fetching medical history:", error);
      Alert.alert("Error", "Failed to load medical history records");
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 15 }}>
            Medical History ({historyData.length} records)
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color="#0F6D66" style={{ marginVertical: 20 }} />
          ) : (
            <View style={{ flex: 1 }}>
              {historyData.length > 0 ? (
                historyData.map((item) => (
                  <View key={item.id} style={styles.historyItem}>
                    <Text style={styles.historyItemheader}>
                      {item.doctor} - {item.date || new Date(item.created_at).toLocaleDateString()}
                    </Text>
                    <Text style={styles.historyItemTitle}>Problem: {item.title}</Text>
                    <Text style={styles.historyItemTitle}>Description: {item.description}</Text>
                    <Text style={styles.historyItemTitle}>Prescription: {item.medication}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyMessage}>No medical history found for this patient.</Text>
              )}
            </View>
          )}

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={{ color: "#0F6D66", fontWeight: "bold" }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 20 },
  modalContent: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, maxHeight: "80%" },
  historyItem: { padding: 10, marginVertical: 5, backgroundColor: "#f0f0f0", borderRadius: 5 },
  historyItemheader: { fontSize: 16, fontWeight: "bold", color: "#0F6D66" },
  historyItemTitle: { fontSize: 15, marginTop: 2 },
  emptyMessage: { textAlign: "center", color: "#777777", fontStyle: "italic", padding: 20 },
  closeBtn: { alignSelf: "center", marginTop: 20, padding: 10 },
});

export default MedicalHistoryModal;
